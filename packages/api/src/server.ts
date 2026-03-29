import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env";
import { listRoutes } from "./routes/lists";
import { itemRoutes } from "./routes/items";
import { priceRoutes } from "./routes/prices";
import { scanRoutes } from "./routes/scan";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
  },
});

// Plugins
await app.register(cors, {
  origin: true, // Allow all origins for family app
});

// Health check
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Routes
await app.register(listRoutes, { prefix: "/api" });
await app.register(itemRoutes, { prefix: "/api" });
await app.register(priceRoutes, { prefix: "/api" });
await app.register(scanRoutes, { prefix: "/api" });

// Start server
try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Server running on http://${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
