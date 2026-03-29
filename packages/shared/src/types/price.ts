export interface Price {
  id: string;
  itemId: string;
  storeId: string;
  price: number;
  unitPrice: number | null;
  salePrice: number | null;
  isOnSale: boolean;
  source: PriceSource;
  fetchedAt: string;
  validUntil: string | null;
}

export type PriceSource = "kroger_api" | "walmart_api" | "receipt" | "manual";

export interface PriceComparison {
  item: {
    id: string;
    name: string;
    displayName: string | null;
  };
  prices: Array<{
    store: {
      id: string;
      name: string;
      chain: string | null;
    };
    price: number;
    unitPrice: number | null;
    isOnSale: boolean;
    salePrice: number | null;
    fetchedAt: string;
  }>;
  cheapest: {
    storeId: string;
    storeName: string;
    price: number;
  } | null;
}

export interface BasketComparison {
  stores: Array<{
    store: {
      id: string;
      name: string;
    };
    totalPrice: number;
    itemsAvailable: number;
    itemsMissing: string[];
  }>;
  splitSuggestion: {
    stores: Array<{
      storeId: string;
      storeName: string;
      items: string[];
      subtotal: number;
    }>;
    totalPrice: number;
    savingsVsBest: number;
  } | null;
}

export interface PriceTrend {
  itemId: string;
  dataPoints: Array<{
    date: string;
    price: number;
    storeId: string;
    storeName: string;
    source: PriceSource;
  }>;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  currentVsAverage: "above" | "below" | "at";
}
