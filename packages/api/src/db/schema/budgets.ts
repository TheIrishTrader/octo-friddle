import { pgTable, uuid, text, numeric, integer, date, jsonb, timestamp, unique } from "drizzle-orm/pg-core";

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    month: date("month").notNull(),
    budgetAmount: numeric("budget_amount", { precision: 10, scale: 2 }).notNull(),
    categoryLimits: jsonb("category_limits"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("uq_budgets_month").on(table.month)],
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  dietaryFilters: text("dietary_filters").array(),
  brandPreferences: jsonb("brand_preferences"),
  preferredStores: uuid("preferred_stores").array(),
  householdSize: integer("household_size").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
