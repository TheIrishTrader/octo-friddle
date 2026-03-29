import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/settings.store";
import { usePreferences, useUpdatePreferences } from "@/hooks/usePreferences";

const DIETARY_OPTIONS = [
  { key: "gluten-free", label: "Gluten-Free" },
  { key: "dairy-free", label: "Dairy-Free" },
  { key: "vegan", label: "Vegan" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "nut-free", label: "Nut-Free" },
  { key: "low-sodium", label: "Low Sodium" },
] as const;

const HOUSEHOLD_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function SettingsScreen() {
  const {
    householdName,
    memberName,
    setHouseholdName,
    setMemberName,
  } = useSettingsStore();

  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const [dietaryFilters, setDietaryFilters] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);

  // Sync remote preferences into local state once loaded
  useEffect(() => {
    if (preferences) {
      setDietaryFilters(preferences.dietaryFilters ?? []);
      setHouseholdSize(preferences.householdSize ?? 2);
    }
  }, [preferences]);

  const toggleDietaryFilter = (key: string) => {
    const next = dietaryFilters.includes(key)
      ? dietaryFilters.filter((f) => f !== key)
      : [...dietaryFilters, key];
    setDietaryFilters(next);
    updatePreferences.mutate({ dietaryFilters: next });
  };

  const changeHouseholdSize = (size: number) => {
    setHouseholdSize(size);
    updatePreferences.mutate({ householdSize: size });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      {/* Household info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Household</Text>

        <Text style={styles.label}>Household Name</Text>
        <TextInput
          style={styles.textInput}
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="e.g. Smith Family"
          returnKeyType="done"
        />

        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.textInput}
          value={memberName}
          onChangeText={setMemberName}
          placeholder="e.g. Alex"
          returnKeyType="done"
        />
      </View>

      {/* Household size */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Household Size</Text>
        <View style={styles.sizeRow}>
          {HOUSEHOLD_SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.sizeChip,
                householdSize === size && styles.sizeChipActive,
              ]}
              onPress={() => changeHouseholdSize(size)}
            >
              <Text
                style={[
                  styles.sizeChipText,
                  householdSize === size && styles.sizeChipTextActive,
                ]}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dietary filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dietary Preferences</Text>
        <Text style={styles.hint}>
          Select dietary filters to get relevant substitution suggestions
        </Text>
        <View style={styles.chipRow}>
          {DIETARY_OPTIONS.map((opt) => {
            const active = dietaryFilters.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleDietaryFilter(opt.key)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <SettingRow label="Version" value="0.1.0" />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  centered: {
    flex: 1,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  hint: { fontSize: 13, color: "#9ca3af", marginBottom: 12 },

  label: { fontSize: 13, fontWeight: "500", color: "#6b7280", marginTop: 10, marginBottom: 4 },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },

  // Household size chips
  sizeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  sizeChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  sizeChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  sizeChipText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  sizeChipTextActive: { color: "#fff" },

  // Dietary chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  chipActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10B981",
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  chipTextActive: { color: "#059669" },

  // Setting row
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingLabel: { fontSize: 15, color: "#374151" },
  settingValue: { fontSize: 15, color: "#6b7280" },
});
