import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { lists, listItems } from "../db/schema/lists";
import { items } from "../db/schema/items";
import { addListItemSchema, createListSchema, updateListItemSchema } from "@grocery/shared";
import { env } from "../config/env";

export async function listRoutes(app: FastifyInstance) {
  // Get all lists for the household
  app.get("/lists", async () => {
    return db.query.lists.findMany({
      where: eq(lists.householdId, env.HOUSEHOLD_ID),
      orderBy: (lists, { desc }) => [desc(lists.updatedAt)],
    });
  });

  // Get a single list with items
  app.get<{ Params: { id: string } }>("/lists/:id", async (request) => {
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, request.params.id),
    });

    if (!list) {
      throw app.httpErrors.notFound("List not found");
    }

    const listItemsWithDetails = await db
      .select()
      .from(listItems)
      .leftJoin(items, eq(listItems.itemId, items.id))
      .where(eq(listItems.listId, list.id))
      .orderBy(listItems.sortOrder);

    return {
      ...list,
      items: listItemsWithDetails.map((row) => ({
        ...row.list_items,
        item: row.items,
      })),
    };
  });

  // Create a new list
  app.post("/lists", async (request) => {
    const body = createListSchema.parse(request.body);
    const [list] = await db
      .insert(lists)
      .values({
        name: body.name,
        householdId: env.HOUSEHOLD_ID,
      })
      .returning();
    return list;
  });

  // Add item to list
  app.post<{ Params: { id: string } }>("/lists/:id/items", async (request) => {
    const body = addListItemSchema.parse(request.body);

    // Get current max sort order
    const existingItems = await db.query.listItems.findMany({
      where: eq(listItems.listId, request.params.id),
      orderBy: (items, { desc }) => [desc(items.sortOrder)],
      limit: 1,
    });

    const nextSortOrder = existingItems.length > 0 ? (existingItems[0]?.sortOrder ?? 0) + 1 : 0;

    const [item] = await db
      .insert(listItems)
      .values({
        listId: request.params.id,
        itemId: body.itemId,
        customName: body.customName,
        quantity: String(body.quantity),
        unit: body.unit,
        addedBy: body.addedBy,
        addedVia: body.addedVia,
        sortOrder: nextSortOrder,
        notes: body.notes,
      })
      .returning();

    // Update list timestamp
    await db.update(lists).set({ updatedAt: new Date() }).where(eq(lists.id, request.params.id));

    return item;
  });

  // Update list item (check/uncheck, change quantity, etc.)
  app.patch<{ Params: { id: string; itemId: string } }>(
    "/lists/:id/items/:itemId",
    async (request) => {
      const body = updateListItemSchema.parse(request.body);

      const [updated] = await db
        .update(listItems)
        .set({
          ...(body.quantity !== undefined && { quantity: String(body.quantity) }),
          ...(body.unit !== undefined && { unit: body.unit }),
          ...(body.isChecked !== undefined && { isChecked: body.isChecked }),
          ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
          ...(body.notes !== undefined && { notes: body.notes }),
        })
        .where(eq(listItems.id, request.params.itemId))
        .returning();

      return updated;
    },
  );

  // Remove item from list
  app.delete<{ Params: { id: string; itemId: string } }>(
    "/lists/:id/items/:itemId",
    async (request) => {
      await db.delete(listItems).where(eq(listItems.id, request.params.itemId));
      return { success: true };
    },
  );

  // Delete a list
  app.delete<{ Params: { id: string } }>("/lists/:id", async (request) => {
    await db.delete(lists).where(eq(lists.id, request.params.id));
    return { success: true };
  });
}
