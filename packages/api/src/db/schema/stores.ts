import { pgTable, uuid, text, numeric, timestamp, index } from "drizzle-orm/pg-core";

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    chain: text("chain"),
    address: text("address"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    apiStoreId: text("api_store_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_stores_chain").on(table.chain),
    index("idx_stores_name").on(table.name),
  ],
);
