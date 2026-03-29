import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { ShoppingRoute, RouteOptions, NearbyStore, Store } from "@grocery/shared";

export function useOptimalRoute(
  listId: string | null,
  options?: Partial<RouteOptions>,
) {
  const params = new URLSearchParams();
  if (options?.maxStops != null) params.set("maxStops", String(options.maxStops));
  if (options?.gasPricePerGallon != null)
    params.set("gasPricePerGallon", String(options.gasPricePerGallon));
  if (options?.mpg != null) params.set("mpg", String(options.mpg));
  if (options?.minuteValue != null)
    params.set("minuteValue", String(options.minuteValue));
  if (options?.userLat != null) params.set("userLat", String(options.userLat));
  if (options?.userLon != null) params.set("userLon", String(options.userLon));

  const qs = params.toString();
  const path = `/route/optimize/${listId}${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["route", "optimize", listId, options],
    queryFn: () => apiClient.get<ShoppingRoute>(path),
    enabled: !!listId,
  });
}

export function useStoresForList(listId: string | null) {
  return useQuery({
    queryKey: ["route", "stores-for-list", listId],
    queryFn: () => apiClient.get<Store[]>(`/route/stores-for-list/${listId}`),
    enabled: !!listId,
  });
}

export function useNearbyStores(lat: number | null, lon: number | null) {
  return useQuery({
    queryKey: ["stores", "nearby", lat, lon],
    queryFn: () =>
      apiClient.get<NearbyStore[]>(`/stores/nearby?lat=${lat}&lon=${lon}`),
    enabled: lat != null && lon != null,
  });
}
