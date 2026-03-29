import { create } from "zustand";

interface SettingsStore {
  householdName: string;
  memberName: string;
  setHouseholdName: (name: string) => void;
  setMemberName: (name: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  householdName: "Family",
  memberName: "",
  setHouseholdName: (name) => set({ householdName: name }),
  setMemberName: (name) => set({ memberName: name }),
}));
