import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Household</Text>
        <SettingRow label="Household Size" value="2" />
        <SettingRow label="Household ID" value="family-default" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Stores</Text>
        <Text style={styles.hint}>
          Select your preferred stores to prioritize in price comparisons
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Manage Stores</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dietary Preferences</Text>
        <Text style={styles.hint}>
          Set dietary filters to get relevant substitution suggestions
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Set Filters</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brand Preferences</Text>
        <Text style={styles.hint}>
          Mark brands you prefer to avoid unwanted substitution suggestions
        </Text>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Manage Brands</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <SettingRow label="Version" value="0.1.0" />
      </View>
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
  heading: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 8 },
  hint: { fontSize: 13, color: "#9ca3af", marginBottom: 12 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingLabel: { fontSize: 15, color: "#374151" },
  settingValue: { fontSize: 15, color: "#6b7280" },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  actionButtonText: { color: "#059669", fontWeight: "600", fontSize: 14 },
});
