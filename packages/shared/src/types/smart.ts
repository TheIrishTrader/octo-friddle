export interface PurchasePattern {
  itemId: string;
  itemName: string;
  averageDaysBetween: number;
  lastPurchased: string; // ISO date
  daysSinceLastPurchase: number;
  isOverdue: boolean; // daysSince > averageDays * 1.2
  confidence: number; // 0-1, based on number of data points
  purchaseCount: number;
}

export interface SmartSuggestion {
  itemId: string;
  itemName: string;
  reason: string; // human readable, e.g. "You usually buy this every 7 days"
  priority: "high" | "medium" | "low";
  pattern: PurchasePattern;
}

export interface Substitution {
  originalItemId: string;
  originalItemName: string;
  originalPrice: number;
  originalBrand: string | null;
  suggestions: SubstitutionOption[];
}

export interface SubstitutionOption {
  itemId: string;
  itemName: string;
  brand: string | null;
  price: number;
  savings: number;
  savingsPercent: number;
  storeId: string;
  storeName: string;
  isStoreBrand: boolean;
}

export interface PriceAlert {
  itemId: string;
  itemName: string;
  alertType: "price_drop" | "sale" | "price_spike" | "buy_now" | "wait";
  message: string;
  currentPrice: number;
  referencePrice: number; // average or previous price
  storeName: string;
  storeId: string;
}
