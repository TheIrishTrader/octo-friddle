import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useBudget } from "@/hooks/useBudget";
import { CATEGORY_LABELS, type GroceryCategory } from "@grocery/shared";

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BudgetScreen() {
  const month = getCurrentMonth();
  const { budget, isLoading, createBudget, isCreating } = useBudget(month);
  const [budgetInput, setBudgetInput] = useState("");

  const handleSetBudget = () => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) return;
    createBudget({ month, budgetAmount: amount });
    setBudgetInput("");
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // No budget exists yet -- show setup prompt
  if (!budget || budget.budgetAmount === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Budget & Analytics</Text>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Set Your Monthly Budget</Text>
          <Text style={styles.setupHint}>
            Enter a budget for {formatMonth(month)} to start tracking your
            grocery spending.
          </Text>
          <TextInput
            style={styles.budgetInput}
            placeholder="e.g. 500"
            keyboardType="decimal-pad"
            value={budgetInput}
            onChangeText={setBudgetInput}
            returnKeyType="done"
            onSubmitEditing={handleSetBudget}
          />
          <TouchableOpacity
            style={[styles.setButton, isCreating && styles.setButtonDisabled]}
            onPress={handleSetBudget}
            disabled={isCreating}
          >
            <Text style={styles.setButtonText}>
              {isCreating ? "Saving..." : "Set Budget"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const percentClamped = Math.min(budget.percentUsed, 100);
  const isOverBudget = budget.percentUsed > 100;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Budget & Analytics</Text>

      {/* Monthly summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.monthLabel}>{formatMonth(budget.month)}</Text>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={styles.amount}>${budget.totalSpent.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Budget</Text>
            <Text style={styles.amount}>
              ${budget.budgetAmount.toFixed(2)}
            </Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text
              style={[
                styles.amount,
                isOverBudget ? styles.overAmount : styles.savedAmount,
              ]}
            >
              ${Math.abs(budget.remainingBudget).toFixed(2)}
              {isOverBudget ? " over" : ""}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentClamped}%`,
                backgroundColor: isOverBudget ? "#EF4444" : "#10B981",
              },
            ]}
          />
        </View>
        <Text style={styles.percentText}>
          {Math.round(budget.percentUsed)}% of budget used
        </Text>

        {budget.savingsFromSuggestions > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              Saved ${budget.savingsFromSuggestions.toFixed(2)} from
              suggestions!
            </Text>
          </View>
        )}
      </View>

      {/* Category breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {budget.categoryBreakdown.length === 0 ? (
          <Text style={styles.placeholder}>
            Start scanning receipts to see your spending by category
          </Text>
        ) : (
          <FlatList
            data={budget.categoryBreakdown}
            keyExtractor={(item) => item.category}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const label =
                CATEGORY_LABELS[item.category as GroceryCategory] ??
                item.category;
              const catPercent = Math.min(item.percentUsed, 100);
              const catOver = item.percentUsed > 100;
              return (
                <View style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{label}</Text>
                    <Text style={styles.categorySpent}>
                      ${item.spent.toFixed(2)}
                      {item.limit != null ? ` / $${item.limit.toFixed(2)}` : ""}
                    </Text>
                  </View>
                  {item.limit != null && (
                    <View style={styles.categoryBar}>
                      <View
                        style={[
                          styles.categoryBarFill,
                          {
                            width: `${catPercent}%`,
                            backgroundColor: catOver ? "#EF4444" : "#10B981",
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
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

  // Setup card
  setupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  setupHint: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  budgetInput: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
  },
  setButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  setButtonDisabled: { opacity: 0.6 },
  setButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Summary card
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
  monthLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
  },
  amountRow: { flexDirection: "row", justifyContent: "space-between" },
  amountLabel: { fontSize: 12, color: "#9ca3af" },
  amount: { fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 2 },
  savedAmount: { color: "#059669" },
  overAmount: { color: "#EF4444" },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  percentText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 6,
    textAlign: "right",
  },
  savingsBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: "center",
  },
  savingsText: { fontSize: 13, fontWeight: "600", color: "#059669" },

  // Section
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
  placeholder: { fontSize: 14, color: "#9ca3af", lineHeight: 20 },

  // Category rows
  categoryRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  categoryName: { fontSize: 14, fontWeight: "500", color: "#374151" },
  categorySpent: { fontSize: 14, color: "#6b7280" },
  categoryBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  categoryBarFill: { height: "100%", borderRadius: 2 },
});
