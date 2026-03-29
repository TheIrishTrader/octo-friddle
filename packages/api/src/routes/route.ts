import type { FastifyInstance } from "fastify";
import { RouteService } from "../services/route.service";
import type { RouteOptions } from "@grocery/shared";

const routeService = new RouteService();

export async function routeRoutes(app: FastifyInstance) {
  // Optimize shopping route for a list
  app.get<{
    Params: { listId: string };
    Querystring: {
      maxStops?: string;
      gasPricePerGallon?: string;
      mpg?: string;
      minuteValue?: string;
      lat?: string;
      lon?: string;
    };
  }>("/route/optimize/:listId", async (request, reply) => {
    const { listId } = request.params;

    const options: RouteOptions = {
      maxStops: parseInt(request.query.maxStops ?? "3", 10),
      gasPricePerGallon: parseFloat(request.query.gasPricePerGallon ?? "3.50"),
      mpg: parseFloat(request.query.mpg ?? "25"),
      minuteValue: parseFloat(request.query.minuteValue ?? "0.25"),
      userLat: request.query.lat ? parseFloat(request.query.lat) : undefined,
      userLon: request.query.lon ? parseFloat(request.query.lon) : undefined,
    };

    if (isNaN(options.maxStops) || options.maxStops < 1) {
      return reply.code(400).send({ error: "maxStops must be a positive integer" });
    }

    try {
      const route = await routeService.calculateOptimalRoute(listId, options);
      return route;
    } catch (err) {
      if ((err as Error).message.includes("not found")) {
        return reply.code(404).send({ error: "List not found" });
      }
      throw err;
    }
  });

  // Get all stores that have prices for items in a list
  app.get<{ Params: { listId: string } }>(
    "/route/stores-for-list/:listId",
    async (request, reply) => {
      try {
        const storeMap = await routeService.getStoresWithPrices(request.params.listId);

        const result = Array.from(storeMap.values()).map((entry) => ({
          store: entry.store,
          itemCount: entry.itemPrices.size,
          items: Array.from(entry.itemPrices.values()).map((ip) => ({
            itemId: ip.itemId,
            itemName: ip.itemName,
            price: ip.price,
            isOnSale: ip.isOnSale,
          })),
        }));

        return { stores: result };
      } catch (err) {
        if ((err as Error).message.includes("not found")) {
          return reply.code(404).send({ error: "List not found" });
        }
        throw err;
      }
    },
  );
}
