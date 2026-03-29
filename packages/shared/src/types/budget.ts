import type { GroceryCategory } from "../constants/categories";

export interface Budget {
  id: string;
  month: string;
  budgetAmount: number;
  categoryLimits: Partial<Record<GroceryCategory, number>> | null;
  createdAt: string;
}

export interface BudgetSummary {
  month: string;
  budgetAmount: number;
  totalSpent: number;
  remainingBudget: number;
  percentUsed: number;
  categoryBreakdown: Array<{
    category: GroceryCategory;
    spent: number;
    limit: number | null;
    percentUsed: number;
  }>;
  savingsFromSuggestions: number;
}

export interface SpendingTrend {
  months: Array<{
    month: string;
    totalSpent: number;
    budgetAmount: number | null;
    itemCount: number;
  }>;
}

export interface UserPreferences {
  id: string;
  dietaryFilters: string[];
  brandPreferences: Record<string, string>;
  preferredStores: string[];
  zipCode: string | null;
  householdSize: number;
  createdAt: string;
  updatedAt: string;
}
