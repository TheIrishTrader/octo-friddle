import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { PriceComparison, BasketComparison, PriceTrend } from "@grocery/shared";

export function usePriceComparison(itemId: string | null) {
  return useQuery({
    queryKey: ["prices", "compare", itemId],
    queryFn: () =>
      apiClient.get<PriceComparison>(`/prices/compare/${itemId}`),
    enabled: !!itemId,
  });
}

export function useBasketComparison(itemIds: string[]) {
  return useQuery({
    queryKey: ["prices", "basket", itemIds],
    queryFn: () =>
      apiClient.get<BasketComparison>(
        `/prices/basket?itemIds=${itemIds.join(",")}`
      ),
    enabled: itemIds.length > 0,
  });
}

export function usePriceHistory(itemId: string | null) {
  return useQuery({
    queryKey: ["prices", "history", itemId],
    queryFn: () =>
      apiClient.get<PriceTrend>(`/prices/history/${itemId}`),
    enabled: !!itemId,
  });
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient.post(`/prices/fetch/${itemId}`, {}),
    onSuccess: (_data, itemId) => {
      queryClient.invalidateQueries({ queryKey: ["prices", "compare", itemId] });
      queryClient.invalidateQueries({ queryKey: ["prices", "basket"] });
      queryClient.invalidateQueries({ queryKey: ["prices", "history", itemId] });
    },
  });
}
