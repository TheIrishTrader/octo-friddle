import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import { env } from "./config/env";
import { listRoutes } from "./routes/lists";
import { itemRoutes } from "./routes/items";
import { priceRoutes } from "./routes/prices";
import { scanRoutes } from "./routes/scan";
import { storeRoutes } from "./routes/stores";
import { budgetRoutes } from "./routes/budget";
import { preferencesRoutes } from "./routes/preferences";
import { smartRoutes } from "./routes/smart";
import { routeRoutes } from "./routes/route";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
  },
});

// Plugins
await app.register(sensible);
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});
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
await app.register(storeRoutes, { prefix: "/api" });
await app.register(budgetRoutes, { prefix: "/api" });
await app.register(preferencesRoutes, { prefix: "/api" });
await app.register(smartRoutes, { prefix: "/api" });
await app.register(routeRoutes, { prefix: "/api" });

// Start server
try {
  await app.listen({ port: env.PORT, host: env.HOST });
  console.log(`Server running on http://${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
