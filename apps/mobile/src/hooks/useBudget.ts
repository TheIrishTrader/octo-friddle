import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { BudgetSummary, SpendingTrend } from "@grocery/shared";

export function useBudget(month: string) {
  const queryClient = useQueryClient();

  const budgetQuery = useQuery({
    queryKey: ["budget", month],
    queryFn: () => apiClient.get<BudgetSummary>(`/budget/${month}`),
  });

  const createBudgetMutation = useMutation({
    mutationFn: (input: { month: string; budgetAmount: number }) =>
      apiClient.post("/budget", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget", month] });
    },
  });

  return {
    budget: budgetQuery.data ?? null,
    isLoading: budgetQuery.isLoading,
    error: budgetQuery.error,
    createBudget: (input: { month: string; budgetAmount: number }) =>
      createBudgetMutation.mutate(input),
    isCreating: createBudgetMutation.isPending,
  };
}

export function useSpendingTrends(months: number) {
  return useQuery({
    queryKey: ["budget", "trends", months],
    queryFn: () =>
      apiClient.get<SpendingTrend>(`/budget/trends?months=${months}`),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { month: string; budgetAmount: number }) =>
      apiClient.post("/budget", input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["budget", variables.month],
      });
    },
  });
}
