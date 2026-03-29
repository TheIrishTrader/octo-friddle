import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { items } from "./items";

export const lists = pgTable("lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Shopping List"),
  householdId: text("household_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => items.id),
    customName: text("custom_name"),
    quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
    unit: text("unit"),
    isChecked: boolean("is_checked").notNull().default(false),
    addedBy: text("added_by"),
    addedVia: text("added_via").notNull().default("manual"),
    sortOrder: integer("sort_order").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_list_items_list").on(table.listId)],
);
