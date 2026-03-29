import { useCallback, useSyncExternalStore } from "react";

interface BudgetData {
  month: string;
  budgetAmount: number;
  totalSpent: number;
  categoryBreakdown: { category: string; spent: number }[];
}

interface SpendingTrend {
  months: { month: string; totalSpent: number; budgetAmount?: number }[];
}

const STORAGE_KEY = "grocery-budgets";

function getBudgets(): Record<string, BudgetData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

function saveBudgets(budgets: Record<string, BudgetData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  window.dispatchEvent(new Event("grocery-budgets-changed"));
}

function subscribe(cb: () => void) {
  window.addEventListener("grocery-budgets-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("grocery-budgets-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function useBudget(month: string) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const budgets: Record<string, BudgetData> = raw ? JSON.parse(raw) : {};
  const budget = budgets[month] ?? null;

  const createBudget = useCallback(
    (input: { month: string; budgetAmount: number }) => {
      const all = getBudgets();
      all[input.month] = {
        month: input.month,
        budgetAmount: input.budgetAmount,
        totalSpent: 0,
        categoryBreakdown: [],
      };
      saveBudgets(all);
    },
    [],
  );

  return {
    budget,
    isLoading: false,
    error: null,
    createBudget,
    isCreating: false,
  };
}

export function useSpendingTrends(_months: number) {
  return { data: null as SpendingTrend | null, isLoading: false };
}
