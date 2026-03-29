import { pgTable, uuid, text, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { items } from "./items";
import { stores } from "./stores";

export const prices = pgTable(
  "prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    price: numeric("price", { precision: 8, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 8, scale: 4 }),
    salePrice: numeric("sale_price", { precision: 8, scale: 2 }),
    isOnSale: boolean("is_on_sale").notNull().default(false),
    source: text("source").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
  },
  (table) => [
    index("idx_prices_item_store").on(table.itemId, table.storeId),
    index("idx_prices_fetched").on(table.fetchedAt),
  ],
);
