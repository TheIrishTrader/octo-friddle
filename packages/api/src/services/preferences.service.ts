import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { userPreferences } from "../db/schema/budgets";
import type { UpdatePreferencesSchema } from "@grocery/shared";

export class PreferencesService {
  /**
   * Get the first (single household) preferences record.
   */
  async getPreferences() {
    return db.query.userPreferences.findFirst();
  }

  /**
   * Upsert preferences: update existing record or create a new one.
   */
  async updatePreferences(data: UpdatePreferencesSchema) {
    const existing = await this.getPreferences();

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...(data.dietaryFilters !== undefined && {
            dietaryFilters: data.dietaryFilters,
          }),
          ...(data.brandPreferences !== undefined && {
            brandPreferences: data.brandPreferences,
          }),
          ...(data.preferredStores !== undefined && {
            preferredStores: data.preferredStores,
          }),
          ...(data.householdSize !== undefined && {
            householdSize: data.householdSize,
          }),
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(userPreferences)
      .values({
        dietaryFilters: data.dietaryFilters ?? [],
        brandPreferences: data.brandPreferences ?? {},
        preferredStores: data.preferredStores ?? [],
        householdSize: data.householdSize ?? 2,
      })
      .returning();
    return created;
  }
}
