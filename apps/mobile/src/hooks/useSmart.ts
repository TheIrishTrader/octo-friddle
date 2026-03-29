import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type {
  SmartSuggestion,
  PurchasePattern,
  Substitution,
  PriceAlert,
} from "@grocery/shared";

export interface Deal {
  id: string;
  itemId: string;
  itemName: string;
  storeName: string;
  storeId: string;
  originalPrice: number;
  dealPrice: number;
  savings: number;
  savingsPercent: number;
  expiresAt: string | null;
  dealType: "bogo" | "percentage_off" | "fixed_price" | "clearance";
  description: string;
}

export function useSuggestions() {
  return useQuery({
    queryKey: ["smart", "suggestions"],
    queryFn: () => apiClient.get<SmartSuggestion[]>("/smart/suggestions"),
  });
}

export function usePatterns() {
  return useQuery({
    queryKey: ["smart", "patterns"],
    queryFn: () => apiClient.get<PurchasePattern[]>("/smart/patterns"),
  });
}

export function useAddSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { listId: string; itemIds: string[] }) =>
      apiClient.post("/smart/suggestions/add", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart", "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["list"] });
      queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useSubstitutions(listId: string | null) {
  return useQuery({
    queryKey: ["smart", "substitutions", listId],
    queryFn: () =>
      apiClient.get<Substitution[]>(`/smart/substitutions/list/${listId}`),
    enabled: !!listId,
  });
}

export function useAlerts(listId: string | null) {
  return useQuery({
    queryKey: ["smart", "alerts", listId],
    queryFn: () =>
      apiClient.get<PriceAlert[]>(`/smart/alerts/list/${listId}`),
    enabled: !!listId,
  });
}

export function useDeals() {
  return useQuery({
    queryKey: ["smart", "deals"],
    queryFn: () => apiClient.get<Deal[]>("/smart/deals"),
  });
}
