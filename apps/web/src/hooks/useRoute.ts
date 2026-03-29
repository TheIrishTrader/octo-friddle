// Route features require the backend API. These hooks return empty data
// when the API is unavailable so the UI stays functional.

interface ShoppingRoute {
  totalCost: number;
  savings: number;
  totalDistance: number | null;
  stops: { store: { name: string }; subtotal: number; distanceFromPrevious: number | null; items: { itemName: string; price: number }[] }[];
}

export function useOptimalRoute(
  _listId: string | null,
  _options?: { maxStops?: number },
) {
  return { data: null as ShoppingRoute | null, isLoading: false };
}

export function useStoresForList(_listId: string | null) {
  return { data: [] as unknown[], isLoading: false };
}

export function useNearbyStores(_lat: number | null, _lon: number | null) {
  return { data: [] as unknown[], isLoading: false };
}
