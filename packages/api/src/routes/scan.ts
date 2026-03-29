import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { items } from "../db/schema/items";
import { receipts } from "../db/schema/receipts";
import { fridgeScans } from "../db/schema/receipts";
import { BarcodeService } from "../services/barcode.service";
import { VisionService } from "../services/vision.service";
import { ReceiptService } from "../services/receipt.service";
import { FridgeService } from "../services/fridge.service";

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

  // Photo scan: identify item from photo
  app.post<{ Body: { imageUrl: string } }>("/scan/photo", async (request) => {
    const { imageUrl } = request.body;
    const result = await visionService.identifyItem(imageUrl);
    return result;
  });

  // Fridge scan: analyze fridge contents
  app.post<{ Body: { imageUrl: string } }>("/scan/fridge", async (request) => {
    const { imageUrl } = request.body;
    const result = await fridgeService.analyzeFridge(imageUrl);

    // Save scan record
    const [scan] = await db
      .insert(fridgeScans)
      .values({
        imageUrl,
        detectedItems: result.detectedItems,
        missingItems: result.missingItems,
      })
      .returning();

    return { ...result, scanId: scan!.id };
  });

  // Receipt scan: upload and parse receipt
  app.post<{ Body: { imageUrl: string; storeId?: string } }>(
    "/scan/receipt",
    async (request) => {
      const { imageUrl, storeId } = request.body;

      // Create receipt record in pending state
      const [created] = await db
        .insert(receipts)
        .values({
          imageUrl,
          storeId: storeId ?? null,
          status: "processing",
        })
        .returning();

      const receipt = created!;

      // Process asynchronously (in production, this would be a BullMQ job)
      // For MVP, process inline with a timeout
      receiptService
        .parseReceipt(imageUrl, receipt.id)
        .catch((err) => {
          console.error(`Failed to parse receipt ${receipt.id}:`, err);
        });

      return { receiptId: receipt.id, status: "processing" };
    },
  );

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
