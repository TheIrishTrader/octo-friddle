import { create } from "zustand";

interface ListStore {
  activeListId: string | null;
  setActiveListId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useListStore = create<ListStore>((set) => ({
  activeListId: null,
  setActiveListId: (id) => set({ activeListId: id }),
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
