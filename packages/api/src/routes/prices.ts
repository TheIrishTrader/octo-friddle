import type { FastifyInstance } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index";
import { prices } from "../db/schema/prices";
import { items } from "../db/schema/items";
import { stores } from "../db/schema/stores";
import type { PriceComparison } from "@grocery/shared";

export async function priceRoutes(app: FastifyInstance) {
  // Get price comparison for an item
  app.get<{ Params: { itemId: string } }>("/prices/compare/:itemId", async (request) => {
    const item = await db.query.items.findFirst({
      where: eq(items.id, request.params.itemId),
    });

    if (!item) {
      throw app.httpErrors.notFound("Item not found");
    }

    // Get latest price per store for this item
    const priceResults = await db
      .select({
        price: prices,
        store: stores,
      })
      .from(prices)
      .innerJoin(stores, eq(prices.storeId, stores.id))
      .where(eq(prices.itemId, request.params.itemId))
      .orderBy(desc(prices.fetchedAt));

    // Deduplicate: keep latest price per store
    const latestPerStore = new Map<string, (typeof priceResults)[number]>();
    for (const row of priceResults) {
      if (!latestPerStore.has(row.store.id)) {
        latestPerStore.set(row.store.id, row);
      }
    }

    const priceEntries = Array.from(latestPerStore.values());
    const cheapest =
      priceEntries.length > 0
        ? priceEntries.reduce((min, curr) =>
            Number(curr.price.price) < Number(min.price.price) ? curr : min,
          )
        : null;

    const comparison: PriceComparison = {
      item: {
        id: item.id,
        name: item.name,
        displayName: item.displayName,
      },
      prices: priceEntries.map((row) => ({
        store: {
          id: row.store.id,
          name: row.store.name,
          chain: row.store.chain,
        },
        price: Number(row.price.price),
        unitPrice: row.price.unitPrice ? Number(row.price.unitPrice) : null,
        isOnSale: row.price.isOnSale,
        salePrice: row.price.salePrice ? Number(row.price.salePrice) : null,
        fetchedAt: row.price.fetchedAt.toISOString(),
      })),
      cheapest: cheapest
        ? {
            storeId: cheapest.store.id,
            storeName: cheapest.store.name,
            price: Number(cheapest.price.price),
          }
        : null,
    };

    return comparison;
  });

  // Get price history for an item
  app.get<{ Params: { itemId: string }; Querystring: { days?: string } }>(
    "/prices/history/:itemId",
    async (request) => {
      const days = parseInt(request.query.days ?? "30", 10);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const history = await db
        .select({
          price: prices.price,
          storeId: prices.storeId,
          storeName: stores.name,
          source: prices.source,
          fetchedAt: prices.fetchedAt,
        })
        .from(prices)
        .innerJoin(stores, eq(prices.storeId, stores.id))
        .where(and(eq(prices.itemId, request.params.itemId)))
        .orderBy(desc(prices.fetchedAt));

      return {
        itemId: request.params.itemId,
        dataPoints: history.map((row) => ({
          date: row.fetchedAt.toISOString(),
          price: Number(row.price),
          storeId: row.storeId,
          storeName: row.storeName,
          source: row.source,
        })),
      };
    },
  );
}
