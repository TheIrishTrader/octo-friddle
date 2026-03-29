import { cleanEnv, str, port, url, num } from "envalid";

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "production", "test"], default: "development" }),
  PORT: port({ default: 3000 }),
  HOST: str({ default: "0.0.0.0" }),

  // Database
  DATABASE_URL: url(),

  // Redis (for BullMQ)
  REDIS_URL: url({ default: "redis://localhost:6379" }),

  // Anthropic (Claude API)
  ANTHROPIC_API_KEY: str(),

  // Kroger API
  KROGER_CLIENT_ID: str({ default: "" }),
  KROGER_CLIENT_SECRET: str({ default: "" }),

  // Walmart API
  WALMART_API_KEY: str({ default: "" }),

  // SerpAPI (Google Shopping + Amazon search)
  SERPAPI_KEY: str({ default: "" }),

  // Google Maps (optional, for route optimization)
  GOOGLE_MAPS_API_KEY: str({ default: "" }),

  // Supabase
  SUPABASE_URL: url(),
  SUPABASE_ANON_KEY: str(),

  // Household (hardcoded for family app)
  HOUSEHOLD_ID: str({ default: "family-default" }),
  HOUSEHOLD_SIZE: num({ default: 2 }),
});
