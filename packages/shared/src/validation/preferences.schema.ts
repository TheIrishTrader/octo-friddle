import { z } from "zod";

export const updatePreferencesSchema = z.object({
  dietaryFilters: z.array(z.string()).optional(),
  brandPreferences: z.record(z.string(), z.string()).optional(),
  preferredStores: z.array(z.string().uuid()).optional(),
  householdSize: z.number().int().positive().optional(),
});

export type UpdatePreferencesSchema = z.infer<typeof updatePreferencesSchema>;
