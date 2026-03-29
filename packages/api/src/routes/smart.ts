import type { FastifyInstance } from "fastify";
import { SmartService } from "../services/smart.service";
import { SubstitutionService } from "../services/substitution.service";
import { AlertsService } from "../services/alerts.service";

const smartService = new SmartService();
const substitutionService = new SubstitutionService();
const alertsService = new AlertsService();

export async function smartRoutes(app: FastifyInstance) {
  // Get all detected purchase patterns
  app.get("/smart/patterns", async () => {
    return smartService.analyzePatterns();
  });

  // Get smart suggestions (overdue / approaching-due items)
  app.get("/smart/suggestions", async () => {
    return smartService.getSuggestions();
  });

  // Add suggested items to a list
  app.post<{
    Body: { listId: string; itemIds: string[] };
  }>("/smart/suggestions/add", async (request, reply) => {
    const { listId, itemIds } = request.body;

    if (!listId || !Array.isArray(itemIds) || itemIds.length === 0) {
      return reply.badRequest("listId and a non-empty itemIds array are required");
    }

    try {
      const result = await smartService.addSuggestionsToList(listId, itemIds);
      return result;
    } catch (err) {
      if (err instanceof Error && err.message === "List not found") {
        return reply.notFound("List not found");
      }
      throw err;
    }
  });

  // Get substitution options for a single item
  app.get<{
    Params: { itemId: string };
  }>("/smart/substitutions/:itemId", async (request, reply) => {
    const { itemId } = request.params;

    try {
      return await substitutionService.getSubstitutions(itemId);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Item not found")) {
        return reply.notFound("Item not found");
      }
      throw err;
    }
  });

  // Get substitutions for all items in a list
  app.get<{
    Params: { listId: string };
  }>("/smart/substitutions/list/:listId", async (request, _reply) => {
    const { listId } = request.params;

    return substitutionService.getListSubstitutions(listId);
  });

  // Get all current deals/sales across all stores
  app.get("/smart/deals", async () => {
    return alertsService.getActiveDeals();
  });

  // Get price alerts for a single item
  app.get<{
    Params: { itemId: string };
  }>("/smart/alerts/:itemId", async (request, _reply) => {
    const { itemId } = request.params;

    return alertsService.getAlertsForItem(itemId);
  });

  // Get price alerts for all items in a list
  app.get<{
    Params: { listId: string };
  }>("/smart/alerts/list/:listId", async (request, _reply) => {
    const { listId } = request.params;

    return alertsService.getAlertsForList(listId);
  });
}
