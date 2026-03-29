import { useCallback, useSyncExternalStore } from "react";

interface Preferences {
  zipCode: string;
  householdSize: number;
  dietaryFilters: string[];
  preferredStores: string[];
}

const STORAGE_KEY = "grocery-preferences";
const DEFAULTS: Preferences = {
  zipCode: "",
  householdSize: 2,
  dietaryFilters: [],
  preferredStores: [],
};

function getPrefs(): Preferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function savePrefs(prefs: Preferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event("grocery-prefs-changed"));
}

function subscribe(cb: () => void) {
  window.addEventListener("grocery-prefs-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("grocery-prefs-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function usePreferences() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const data: Preferences = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  return { data, isLoading: false };
}

export function useUpdatePreferences() {
  const mutate = useCallback(
    (input: Partial<Preferences>, options?: { onSuccess?: () => void }) => {
      const current = getPrefs();
      savePrefs({ ...current, ...input });
      options?.onSuccess?.();
    },
    [],
  );

  return { mutate, isPending: false };
}
