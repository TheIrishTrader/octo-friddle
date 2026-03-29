import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { items } from "../db/schema/items";
import { receipts } from "../db/schema/receipts";
import { fridgeScans } from "../db/schema/receipts";
import { BarcodeService } from "../services/barcode.service";
import { VisionService } from "../services/vision.service";
import { ReceiptService } from "../services/receipt.service";
import { FridgeService } from "../services/fridge.service";

async function fileToDataUrl(request: FastifyRequest): Promise<string> {
  const data = await request.file();
  if (!data) throw new Error("No file uploaded");
  const buffer = await data.toBuffer();
  const mime = data.mimetype;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function scanRoutes(app: FastifyInstance) {
  const barcodeService = new BarcodeService();
  const visionService = new VisionService();
  const receiptService = new ReceiptService();
  const fridgeService = new FridgeService();

  // Barcode scan: lookup product by UPC
  app.post<{ Body: { barcode: string } }>("/scan/barcode", async (request) => {
    const { barcode } = request.body;

    // Check local DB first
    const existing = await db.query.items.findFirst({
      where: eq(items.barcode, barcode),
    });

    if (existing) {
      return { found: true, source: "local", item: existing };
    }

    // Lookup via external APIs
    const product = await barcodeService.lookup(barcode);

    if (!product) {
      return { found: false, source: null, item: null };
    }

    // Save to local DB
    const [saved] = await db
      .insert(items)
      .values({
        name: product.name,
        displayName: product.displayName,
        brand: product.brand,
        barcode,
        category: product.category,
        imageUrl: product.imageUrl,
      })
      .returning();

    return { found: true, source: "upcitemdb", item: saved };
  });

  // Photo scan: identify item from photo (accepts file upload or JSON)
  app.post("/scan/photo", async (request) => {
    const contentType = request.headers["content-type"] ?? "";
    let imageUrl: string;

    if (contentType.includes("multipart")) {
      imageUrl = await fileToDataUrl(request);
    } else {
      imageUrl = (request.body as { imageUrl: string }).imageUrl;
    }

    const result = await visionService.identifyItem(imageUrl);
    return result;
  });

  // Fridge scan: analyze fridge contents (accepts file upload or JSON)
  app.post("/scan/fridge", async (request) => {
    const contentType = request.headers["content-type"] ?? "";
    let imageUrl: string;

    if (contentType.includes("multipart")) {
      imageUrl = await fileToDataUrl(request);
    } else {
      imageUrl = (request.body as { imageUrl: string }).imageUrl;
    }

    const result = await fridgeService.analyzeFridge(imageUrl);

    // Save scan record
    const [scan] = await db
      .insert(fridgeScans)
      .values({
        imageUrl: "uploaded-file",
        detectedItems: result.detectedItems,
        missingItems: result.missingItems,
      })
      .returning();

    return { ...result, scanId: scan!.id };
  });

  // Receipt scan: upload and parse receipt (accepts file upload or JSON)
  app.post("/scan/receipt", async (request) => {
    const contentType = request.headers["content-type"] ?? "";
    let imageUrl: string;

    if (contentType.includes("multipart")) {
      imageUrl = await fileToDataUrl(request);
    } else {
      imageUrl = (request.body as { imageUrl: string; storeId?: string })
        .imageUrl;
    }

    // Create receipt record in pending state
    const [created] = await db
      .insert(receipts)
      .values({
        imageUrl: "uploaded-file",
        storeId: null,
        status: "processing",
      })
      .returning();

    const receipt = created!;

    // Process asynchronously
    receiptService.parseReceipt(imageUrl, receipt.id).catch((err) => {
      console.error(`Failed to parse receipt ${receipt.id}:`, err);
    });

    return { receiptId: receipt.id, status: "processing" };
  });

  // Get receipt status/result
  app.get<{ Params: { id: string } }>("/scan/receipt/:id", async (request) => {
    const receipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, request.params.id),
    });

    if (!receipt) {
      throw app.httpErrors.notFound("Receipt not found");
    }

    return receipt;
  });
}
