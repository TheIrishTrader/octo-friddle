// Price features require the backend API. These hooks return empty data
// when the API is unavailable so the UI stays functional.

interface BasketComparison {
  stores: { store: { id: string; name: string }; totalPrice: number; itemsMissing: string[] }[];
  splitSuggestion: { savingsVsBest: number; stores: string[] } | null;
}

export function usePriceComparison(_itemId: string | null) {
  return { data: null, isLoading: false };
}

export function useBasketComparison(_itemIds: string[]) {
  return { data: null as BasketComparison | null, isLoading: false };
}

export function usePriceHistory(_itemId: string | null) {
  return { data: null, isLoading: false };
}

export function useRefreshPrices() {
  return {
    mutate: (_itemId: string) => {},
    isPending: false,
  };
}
