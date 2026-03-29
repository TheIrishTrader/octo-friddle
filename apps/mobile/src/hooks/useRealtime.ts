import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Subscribe to realtime changes on the list_items table.
 * When another household member modifies the list, this invalidates
 * the cached queries so the UI refreshes automatically.
 */
export function useRealtimeListSync(listId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listId || !supabase) return;

    const channel = supabase
      .channel(`list-${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${listId}`,
        },
        () => {
          // Invalidate the list query to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ["list", listId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, queryClient]);
}
