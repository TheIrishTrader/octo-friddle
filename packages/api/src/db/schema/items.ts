import { pgTable, uuid, text, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    displayName: text("display_name"),
    brand: text("brand"),
    barcode: text("barcode").unique(),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    unit: text("unit").notNull().default("each"),
    quantityDefault: numeric("quantity_default", { precision: 8, scale: 2 }).notNull().default("1"),
    imageUrl: text("image_url"),
    nutritionJson: jsonb("nutrition_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_items_barcode").on(table.barcode),
    index("idx_items_name").on(table.name),
    index("idx_items_category").on(table.category),
  ],
);
