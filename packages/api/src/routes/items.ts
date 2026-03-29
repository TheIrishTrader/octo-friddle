import type { FastifyInstance } from "fastify";
import { eq, ilike } from "drizzle-orm";
import { db } from "../db/index";
import { items } from "../db/schema/items";
import { createItemSchema, updateItemSchema } from "@grocery/shared";

export async function itemRoutes(app: FastifyInstance) {
  // Search items by name
  app.get<{ Querystring: { q?: string; category?: string } }>("/items", async (request) => {
    const { q, category } = request.query;

    let query = db.select().from(items).$dynamic();

    if (q) {
      query = query.where(ilike(items.name, `%${q}%`));
    }
    if (category) {
      query = query.where(eq(items.category, category));
    }

    return query.limit(50);
  });

  // Get item by barcode
  app.get<{ Params: { barcode: string } }>("/items/barcode/:barcode", async (request) => {
    const item = await db.query.items.findFirst({
      where: eq(items.barcode, request.params.barcode),
    });

    if (!item) {
      throw app.httpErrors.notFound("Item not found for this barcode");
    }

    return item;
  });

  // Get item by ID
  app.get<{ Params: { id: string } }>("/items/:id", async (request) => {
    const item = await db.query.items.findFirst({
      where: eq(items.id, request.params.id),
    });

    if (!item) {
      throw app.httpErrors.notFound("Item not found");
    }

    return item;
  });

  // Create a new item
  app.post("/items", async (request) => {
    const body = createItemSchema.parse(request.body);
    const [item] = await db.insert(items).values(body).returning();
    return item;
  });

  // Update an item
  app.patch<{ Params: { id: string } }>("/items/:id", async (request) => {
    const body = updateItemSchema.parse(request.body);
    const [item] = await db.update(items).set(body).where(eq(items.id, request.params.id)).returning();
    return item;
  });
}
