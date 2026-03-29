import { pgTable, uuid, text, numeric, date, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { items } from "./items";
import { stores } from "./stores";

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id),
  imageUrl: text("image_url").notNull(),
  total: numeric("total", { precision: 10, scale: 2 }),
  tax: numeric("tax", { precision: 8, scale: 2 }),
  purchaseDate: date("purchase_date"),
  parsedData: jsonb("parsed_data"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseHistory = pgTable(
  "purchase_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    receiptId: uuid("receipt_id").references(() => receipts.id),
    pricePaid: numeric("price_paid", { precision: 8, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
    unit: text("unit"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_ph_item").on(table.itemId, table.purchasedAt),
    index("idx_ph_date").on(table.purchasedAt),
  ],
);

export const fridgeScans = pgTable("fridge_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  detectedItems: jsonb("detected_items"),
  missingItems: jsonb("missing_items"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
});
