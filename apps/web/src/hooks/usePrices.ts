import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/api/client";
import type { GroceryItem } from "./useList";

interface StorePrice {
  store: { id: string; name: string };
  totalPrice: number;
  itemsMissing: string[];
}

interface BasketComparison {
  stores: StorePrice[];
  splitSuggestion: { savingsVsBest: number; stores: string[] } | null;
}

export function usePriceComparison(_itemId: string | null) {
  return { data: null, isLoading: false };
}

export function useBasketComparison(items: GroceryItem[]) {
  const [data, setData] = useState<BasketComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevKey = useRef("");

  useEffect(() => {
    const key = items.map((i) => i.customName).sort().join("|");
    if (key === prevKey.current || items.length === 0) {
      if (items.length === 0) setData(null);
      return;
    }
    prevKey.current = key;

    setIsLoading(true);
    const payload = items.map((i) => ({
      name: i.customName,
      barcode: i.barcode,
    }));

    apiClient
      .post<BasketComparison>("/prices/basket-by-name", { items: payload })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [items]);

  return { data, isLoading };
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
