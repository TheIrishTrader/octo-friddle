import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { UserPreferences } from "@grocery/shared";

export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.get<UserPreferences>("/preferences"),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<UserPreferences>) =>
      apiClient.patch<UserPreferences>("/preferences", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });
}
