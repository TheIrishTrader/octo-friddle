import type { FastifyInstance } from "fastify";
import { StoreService } from "../services/store.service";

const storeService = new StoreService();

export async function storeRoutes(app: FastifyInstance) {
  // List all known stores
  app.get("/stores", async () => {
    return storeService.getStores();
  });

  // Find nearby stores (Kroger-based)
  app.get<{ Querystring: { lat?: string; lon?: string } }>("/stores/nearby", async (request, reply) => {
    const lat = parseFloat(request.query.lat ?? "");
    const lon = parseFloat(request.query.lon ?? "");

    if (isNaN(lat) || isNaN(lon)) {
      return reply.code(400).send({ error: "lat and lon query params are required" });
    }

    return storeService.getNearbyStores(lat, lon);
  });
}
