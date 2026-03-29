import { z } from "zod";
import { MEASUREMENT_UNITS } from "../constants/units";

const addedViaValues = [
  "manual",
  "voice",
  "barcode",
  "photo",
  "fridge_scan",
  "smart_suggest",
] as const;

export const createListSchema = z.object({
  name: z.string().min(1).max(100).default("Shopping List"),
});

export const addListItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  customName: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().default(1),
  unit: z.enum(MEASUREMENT_UNITS).optional(),
  addedBy: z.string().max(50).optional(),
  addedVia: z.enum(addedViaValues).default("manual"),
  notes: z.string().max(500).optional(),
});

export const updateListItemSchema = z.object({
  quantity: z.number().positive().optional(),
  unit: z.enum(MEASUREMENT_UNITS).optional(),
  isChecked: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().max(500).optional(),
});

export type CreateListSchema = z.infer<typeof createListSchema>;
export type AddListItemSchema = z.infer<typeof addListItemSchema>;
export type UpdateListItemSchema = z.infer<typeof updateListItemSchema>;
