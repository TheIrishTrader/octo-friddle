import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { ListWithItems, AddListItemInput } from "@grocery/shared";

export function useList() {
  const queryClient = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ["lists"],
    queryFn: () => apiClient.get<ListWithItems[]>("/lists"),
  });

  const activeList = listsQuery.data?.[0] ?? null;

  const activeListQuery = useQuery({
    queryKey: ["list", activeList?.id],
    queryFn: () =>
      activeList ? apiClient.get<ListWithItems>(`/lists/${activeList.id}`) : null,
    enabled: !!activeList?.id,
  });

  const addItemMutation = useMutation({
    mutationFn: (input: AddListItemInput) => {
      if (!activeList?.id) throw new Error("No active list");
      return apiClient.post(`/lists/${activeList.id}/items`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", activeList?.id] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (itemId: string) => {
      if (!activeList?.id) throw new Error("No active list");
      const item = activeListQuery.data?.items.find((i) => i.id === itemId);
      return apiClient.patch(`/lists/${activeList.id}/items/${itemId}`, {
        isChecked: !item?.isChecked,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", activeList?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => {
      if (!activeList?.id) throw new Error("No active list");
      return apiClient.delete(`/lists/${activeList.id}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", activeList?.id] });
    },
  });

  return {
    lists: listsQuery.data ?? [],
    activeList: activeListQuery.data ?? null,
    isLoading: listsQuery.isLoading || activeListQuery.isLoading,
    addItem: (input: AddListItemInput) => addItemMutation.mutate(input),
    toggleItem: (itemId: string) => toggleMutation.mutate(itemId),
    removeItem: (itemId: string) => removeMutation.mutate(itemId),
  };
}
