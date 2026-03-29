export interface Store {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  apiStoreId: string | null;
  createdAt: string;
}

export interface StoreWithDistance extends Store {
  distanceMiles: number;
}

export type StoreChain = "kroger" | "walmart" | "target" | "aldi" | "costco" | "other";
