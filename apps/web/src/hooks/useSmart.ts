// Smart features require the backend API. These hooks return empty data
// when the API is unavailable so the UI stays functional.

interface Suggestion { itemId: string; itemName: string; reason: string }
interface Substitution { originalItemName: string; originalPrice: number; suggestions: { itemName: string; price: number; savings: number; storeName: string }[] }
interface Alert { alertType: string; message: string; storeName: string }
interface Deal { itemId: string; itemName: string; storeName: string; originalPrice: number; salePrice: number; savingsPercent: number }

export function useSuggestions() {
  return { data: [] as Suggestion[], isLoading: false };
}

export function usePatterns() {
  return { data: [] as unknown[], isLoading: false };
}

export function useAddSuggestions() {
  return {
    mutate: (_input: { listId: string; itemIds: string[] }) => {},
    isPending: false,
  };
}

export function useSubstitutions(_listId: string | null) {
  return { data: [] as Substitution[], isLoading: false };
}

export function useAlerts(_listId: string | null) {
  return { data: [] as Alert[], isLoading: false };
}

export function useDeals() {
  return { data: [] as Deal[], isLoading: false };
}
