import { z } from "zod";
import { GROCERY_CATEGORIES } from "../constants/categories";
import { MEASUREMENT_UNITS } from "../constants/units";

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  displayName: z.string().max(300).optional(),
  brand: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  category: z.enum(GROCERY_CATEGORIES),
  subcategory: z.string().max(100).optional(),
  unit: z.enum(MEASUREMENT_UNITS).default("each"),
  quantityDefault: z.number().positive().default(1),
  imageUrl: z.string().url().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export type CreateItemSchema = z.infer<typeof createItemSchema>;
export type UpdateItemSchema = z.infer<typeof updateItemSchema>;
