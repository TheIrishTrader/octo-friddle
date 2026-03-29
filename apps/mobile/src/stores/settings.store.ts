import { create } from "zustand";

interface SettingsStore {
  householdName: string;
  memberName: string;
  setMemberName: (name: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  householdName: "Family",
  memberName: "",
  setMemberName: (name) => set({ memberName: name }),
}));
