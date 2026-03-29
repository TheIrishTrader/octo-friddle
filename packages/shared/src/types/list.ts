import type { MeasurementUnit } from "../constants/units";

export interface GroceryList {
  id: string;
  name: string;
  householdId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  listId: string;
  itemId: string | null;
  customName: string | null;
  quantity: number;
  unit: MeasurementUnit | null;
  isChecked: boolean;
  addedBy: string | null;
  addedVia: AddedVia;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
}

export type AddedVia = "manual" | "voice" | "barcode" | "photo" | "fridge_scan" | "smart_suggest";

export interface ListWithItems extends GroceryList {
  items: ListItemWithDetails[];
}

export interface ListItemWithDetails extends ListItem {
  item: {
    id: string;
    name: string;
    displayName: string | null;
    brand: string | null;
    category: string;
    imageUrl: string | null;
  } | null;
  cheapestPrice: {
    price: number;
    storeName: string;
    isOnSale: boolean;
  } | null;
}

export interface AddListItemInput {
  itemId?: string;
  customName?: string;
  quantity?: number;
  unit?: MeasurementUnit;
  addedBy?: string;
  addedVia: AddedVia;
  notes?: string;
}
