import type { FastifyInstance } from "fastify";
import { PreferencesService } from "../services/preferences.service";
import { updatePreferencesSchema } from "@grocery/shared";

const preferencesService = new PreferencesService();

export async function preferencesRoutes(app: FastifyInstance) {
  // Get current preferences
  app.get("/preferences", async () => {
    const prefs = await preferencesService.getPreferences();
    return prefs ?? { message: "No preferences set yet" };
  });

  // Update preferences (upsert)
  app.patch("/preferences", async (request) => {
    const body = updatePreferencesSchema.parse(request.body);
    return preferencesService.updatePreferences(body);
  });
}
