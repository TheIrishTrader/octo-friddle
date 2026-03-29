import { View, Text, StyleSheet } from "react-native";

export default function BudgetScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Budget & Analytics</Text>

      {/* Monthly summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.monthLabel}>March 2026</Text>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={styles.amount}>$0.00</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Budget</Text>
            <Text style={styles.amount}>--</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Saved</Text>
            <Text style={[styles.amount, styles.savedAmount]}>$0.00</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: "0%" }]} />
        </View>
      </View>

      {/* Placeholder for category breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <Text style={styles.placeholder}>
          Start scanning receipts to see your spending by category
        </Text>
      </View>

      {/* Placeholder for price trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Alerts</Text>
        <Text style={styles.placeholder}>
          Price intelligence will appear here as you build purchase history
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  monthLabel: { fontSize: 14, fontWeight: "600", color: "#6b7280", marginBottom: 12 },
  amountRow: { flexDirection: "row", justifyContent: "space-between" },
  amountLabel: { fontSize: 12, color: "#9ca3af" },
  amount: { fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 2 },
  savedAmount: { color: "#059669" },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#10B981", borderRadius: 3 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 8 },
  placeholder: { fontSize: 14, color: "#9ca3af", lineHeight: 20 },
});
