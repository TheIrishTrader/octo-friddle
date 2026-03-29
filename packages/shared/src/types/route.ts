export interface ShoppingRoute {
  stops: ShoppingStop[];
  totalProductCost: number;
  totalTravelCost: number;
  totalCost: number; // products + travel
  estimatedTime: number; // minutes
  totalDistance: number; // miles
  savings: number; // vs buying everything at most expensive single store
}

export interface ShoppingStop {
  store: {
    id: string;
    name: string;
    chain: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  items: ShoppingStopItem[];
  subtotal: number;
  distanceFromPrevious: number | null; // miles
  travelTimeFromPrevious: number | null; // minutes
}

export interface ShoppingStopItem {
  itemId: string;
  itemName: string;
  price: number;
  isOnSale: boolean;
}

export interface RouteOptions {
  maxStops: number; // max stores to visit (default 3)
  gasPricePerGallon: number; // default 3.50
  mpg: number; // default 25
  minuteValue: number; // $/min for time cost, default 0.25 ($15/hr)
  userLat?: number;
  userLon?: number;
}

export interface NearbyStore {
  id: string;
  name: string;
  chain: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  distance: number; // miles from user
}
