import { useCallback, useSyncExternalStore } from "react";

export interface GroceryItem {
  id: string;
  customName: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  barcode?: string;
  quantity: number;
  unit?: string;
  isChecked: boolean;
  addedVia: string;
  createdAt: string;
}

export interface GroceryList {
  id: string;
  name: string;
  items: GroceryItem[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "grocery-list";
const DEFAULT_LIST: GroceryList = {
  id: "local-list",
  name: "Shopping List",
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function getList(): GroceryList {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_LIST };
}

function saveList(list: GroceryList) {
  list.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Notify subscribers
  window.dispatchEvent(new Event("grocery-list-changed"));
}

// useSyncExternalStore for reactive localStorage
function subscribe(callback: () => void) {
  window.addEventListener("grocery-list-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("grocery-list-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function useList() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const list: GroceryList = raw ? JSON.parse(raw) : { ...DEFAULT_LIST };

  const addItem = useCallback(
    (input: { customName: string; addedVia?: string; brand?: string; category?: string; imageUrl?: string; barcode?: string }) => {
      const current = getList();
      const newItem: GroceryItem = {
        id: crypto.randomUUID(),
        customName: input.customName,
        brand: input.brand,
        category: input.category,
        imageUrl: input.imageUrl,
        barcode: input.barcode,
        quantity: 1,
        isChecked: false,
        addedVia: input.addedVia ?? "manual",
        createdAt: new Date().toISOString(),
      };
      current.items.unshift(newItem);
      saveList(current);
    },
    [],
  );

  const toggleItem = useCallback((itemId: string) => {
    const current = getList();
    const item = current.items.find((i) => i.id === itemId);
    if (item) {
      item.isChecked = !item.isChecked;
      saveList(current);
    }
  }, []);

  const removeItem = useCallback((itemId: string) => {
    const current = getList();
    current.items = current.items.filter((i) => i.id !== itemId);
    saveList(current);
  }, []);

  return {
    lists: [list],
    activeList: list,
    isLoading: false,
    addItem,
    toggleItem,
    removeItem,
  };
}
