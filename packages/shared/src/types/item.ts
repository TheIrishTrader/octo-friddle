import type { GroceryCategory } from "../constants/categories";
import type { MeasurementUnit } from "../constants/units";

export interface Item {
  id: string;
  name: string;
  displayName: string | null;
  brand: string | null;
  barcode: string | null;
  category: GroceryCategory;
  subcategory: string | null;
  unit: MeasurementUnit;
  quantityDefault: number;
  imageUrl: string | null;
  nutritionJson: NutritionData | null;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionData {
  calories: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugar: number | null;
  fiber: number | null;
  protein: number | null;
  sodium: number | null;
  servingSize: string | null;
  allergens: string[];
}

export interface CreateItemInput {
  name: string;
  displayName?: string;
  brand?: string;
  barcode?: string;
  category: GroceryCategory;
  subcategory?: string;
  unit?: MeasurementUnit;
  quantityDefault?: number;
  imageUrl?: string;
}
