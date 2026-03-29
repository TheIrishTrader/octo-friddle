import type { FastifyInstance } from "fastify";
import { PriceService } from "../services/price.service";

const priceService = new PriceService();

export async function priceRoutes(app: FastifyInstance) {
  // Get price comparison for an item (uses cache or fetches fresh)
  app.get<{ Params: { itemId: string } }>("/prices/compare/:itemId", async (request, reply) => {
    try {
      const comparison = await priceService.getComparison(request.params.itemId);
      return comparison;
    } catch (err) {
      if ((err as Error).message.includes("not found")) {
        return reply.code(404).send({ error: "Item not found" });
      }
      throw err;
    }
  });

  // Get price history for an item
  app.get<{ Params: { itemId: string }; Querystring: { days?: string } }>(
    "/prices/history/:itemId",
    async (request) => {
      const days = parseInt(request.query.days ?? "30", 10);
      return priceService.getPriceHistory(request.params.itemId, days);
    },
  );

  // Basket comparison: compare total cost across stores for multiple items
  app.get<{ Querystring: { itemIds: string } }>("/prices/basket", async (request, reply) => {
    const raw = request.query.itemIds;
    if (!raw) {
      return reply.code(400).send({ error: "itemIds query param is required (comma-separated)" });
    }

    const itemIds = raw.split(",").map((id) => id.trim()).filter(Boolean);
    if (itemIds.length === 0) {
      return reply.code(400).send({ error: "At least one itemId is required" });
    }

    return priceService.getBasketComparison(itemIds);
  });

  // Force-refresh prices for an item (bypasses cache)
  app.post<{ Params: { itemId: string } }>("/prices/fetch/:itemId", async (request, reply) => {
    try {
      const inserted = await priceService.fetchPricesForItem(request.params.itemId);
      return { fetched: inserted.length, prices: inserted };
    } catch (err) {
      if ((err as Error).message.includes("not found")) {
        return reply.code(404).send({ error: "Item not found" });
      }
      throw err;
    }
  });
}
