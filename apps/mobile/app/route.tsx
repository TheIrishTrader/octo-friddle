import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { useList } from "@/hooks/useList";
import { useOptimalRoute } from "@/hooks/useRoute";
import type { RouteOptions } from "@grocery/shared";

export default function RouteScreen() {
  const _router = useRouter();
  const { activeList } = useList();
  const listId = activeList?.id ?? null;

  const [maxStops, setMaxStops] = useState(3);
  const [gasPrice, setGasPrice] = useState("3.50");
  const [includeTravelCosts, setIncludeTravelCosts] = useState(true);
  const [shouldCalculate, setShouldCalculate] = useState(false);

  const options = useMemo<Partial<RouteOptions>>(
    () => ({
      maxStops,
      gasPricePerGallon: includeTravelCosts ? (parseFloat(gasPrice) || 3.5) : 0,
    }),
    [maxStops, gasPrice, includeTravelCosts],
  );

  const routeQuery = useOptimalRoute(
    shouldCalculate ? listId : null,
    options,
  );

  const route = routeQuery.data ?? null;

  const handleCalculate = () => {
    setShouldCalculate(true);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Shopping Route Planner</Text>
      <Text style={styles.subheading}>
        Find the most cost-effective route for your grocery list
      </Text>

      {/* Configuration Section */}
      <View style={styles.configSection}>
        <Text style={styles.configTitle}>Route Settings</Text>

        {/* Max Stops */}
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Max stops</Text>
          <View style={styles.stopsPicker}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.stopsOption,
                  maxStops === n && styles.stopsOptionActive,
                ]}
                onPress={() => {
                  setMaxStops(n);
                  setShouldCalculate(false);
                }}
              >
                <Text
                  style={[
                    styles.stopsOptionText,
                    maxStops === n && styles.stopsOptionTextActive,
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Gas Price */}
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Gas price ($/gal)</Text>
          <View style={styles.gasInputWrapper}>
            <Text style={styles.gasDollar}>$</Text>
            <TextInput
              style={styles.gasInput}
              value={gasPrice}
              onChangeText={(text) => {
                setGasPrice(text);
                setShouldCalculate(false);
              }}
              keyboardType="decimal-pad"
              placeholder="3.50"
            />
          </View>
        </View>

        {/* Include Travel Costs Toggle */}
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Include travel costs</Text>
          <TouchableOpacity
            style={[
              styles.toggle,
              includeTravelCosts && styles.toggleActive,
            ]}
            onPress={() => {
              setIncludeTravelCosts(!includeTravelCosts);
              setShouldCalculate(false);
            }}
          >
            <View
              style={[
                styles.toggleKnob,
                includeTravelCosts && styles.toggleKnobActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calculate Button */}
      <TouchableOpacity
        style={[
          styles.calculateButton,
          (!listId || routeQuery.isFetching) && styles.calculateButtonDisabled,
        ]}
        onPress={handleCalculate}
        disabled={!listId || routeQuery.isFetching}
      >
        {routeQuery.isFetching ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.calculateButtonText}>Calculate Best Route</Text>
        )}
      </TouchableOpacity>

      {!listId && (
        <Text style={styles.noListText}>
          Add items to your list first to plan a route.
        </Text>
      )}

      {/* Loading State */}
      {routeQuery.isFetching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Calculating optimal route...</Text>
        </View>
      )}

      {/* Error State */}
      {routeQuery.isError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to calculate route. Please try again.
          </Text>
        </View>
      )}

      {/* Results */}
      {route && !routeQuery.isFetching && (
        <View style={styles.resultsSection}>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Route Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  ${route.totalCost.toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>Total Cost</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  ${route.totalProductCost.toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>Products</Text>
              </View>
              {includeTravelCosts && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    ${route.totalTravelCost.toFixed(2)}
                  </Text>
                  <Text style={styles.summaryLabel}>Travel</Text>
                </View>
              )}
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {route.estimatedTime} min
                </Text>
                <Text style={styles.summaryLabel}>Est. Time</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {route.totalDistance.toFixed(1)} mi
                </Text>
                <Text style={styles.summaryLabel}>Distance</Text>
              </View>
              {route.savings > 0 && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, styles.savingsValue]}>
                    ${route.savings.toFixed(2)}
                  </Text>
                  <Text style={[styles.summaryLabel, styles.savingsLabel]}>
                    Savings
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stops List */}
          <Text style={styles.stopsHeading}>Your Stops</Text>
          {route.stops.map((stop, index) => (
            <View key={stop.store.id} style={styles.stopCard}>
              {/* Stop Number Badge */}
              <View style={styles.stopHeader}>
                <View style={styles.stopBadge}>
                  <Text style={styles.stopBadgeText}>{index + 1}</Text>
                </View>
                <View style={styles.stopHeaderInfo}>
                  <Text style={styles.stopStoreName}>{stop.store.name}</Text>
                  {stop.store.address && (
                    <Text style={styles.stopAddress}>{stop.store.address}</Text>
                  )}
                </View>
              </View>

              {/* Distance/time from previous */}
              {stop.distanceFromPrevious != null &&
                stop.travelTimeFromPrevious != null &&
                index > 0 && (
                  <View style={styles.travelInfo}>
                    <Text style={styles.travelText}>
                      {stop.distanceFromPrevious.toFixed(1)} mi -{" "}
                      {stop.travelTimeFromPrevious} min from previous stop
                    </Text>
                  </View>
                )}

              {/* Items at this stop */}
              <View style={styles.stopItems}>
                {stop.items.map((item) => (
                  <View key={item.itemId} style={styles.stopItemRow}>
                    <Text style={styles.stopItemName}>{item.itemName}</Text>
                    <View style={styles.stopItemPriceRow}>
                      <Text style={styles.stopItemPrice}>
                        ${item.price.toFixed(2)}
                      </Text>
                      {item.isOnSale && (
                        <View style={styles.saleBadge}>
                          <Text style={styles.saleText}>SALE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Stop Subtotal */}
              <View style={styles.stopSubtotalRow}>
                <Text style={styles.stopSubtotalLabel}>Subtotal</Text>
                <Text style={styles.stopSubtotalValue}>
                  ${stop.subtotal.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subheading: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 20,
  },

  // Config
  configSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  configTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 14,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  configLabel: { fontSize: 14, color: "#374151", fontWeight: "500" },

  // Stops picker
  stopsPicker: { flexDirection: "row", gap: 6 },
  stopsOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  stopsOptionActive: { backgroundColor: "#10B981" },
  stopsOptionText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  stopsOptionTextActive: { color: "#fff" },

  // Gas input
  gasInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  gasDollar: { fontSize: 14, color: "#6b7280", marginRight: 2 },
  gasInput: {
    fontSize: 14,
    color: "#111827",
    paddingVertical: 8,
    width: 60,
  },

  // Toggle
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#d1d5db",
    padding: 2,
    justifyContent: "center",
  },
  toggleActive: { backgroundColor: "#10B981" },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleKnobActive: { alignSelf: "flex-end" },

  // Calculate button
  calculateButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  calculateButtonDisabled: { opacity: 0.5 },
  calculateButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  noListText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },

  // Loading
  loadingContainer: { alignItems: "center", paddingVertical: 40 },
  loadingText: { fontSize: 14, color: "#6b7280", marginTop: 12 },

  // Error
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center" },

  // Results
  resultsSection: { marginTop: 4 },

  // Summary
  summaryCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryItem: {
    width: "30%",
    alignItems: "center",
  },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#065f46" },
  summaryLabel: { fontSize: 11, color: "#047857", marginTop: 2 },
  savingsValue: { color: "#10B981" },
  savingsLabel: { color: "#10B981", fontWeight: "600" },

  // Stops
  stopsHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  stopCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  stopHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  stopBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stopBadgeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stopHeaderInfo: { flex: 1 },
  stopStoreName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  stopAddress: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  // Travel info
  travelInfo: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  travelText: { fontSize: 12, color: "#6b7280" },

  // Stop items
  stopItems: { marginBottom: 8 },
  stopItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  stopItemName: { fontSize: 14, color: "#374151", flex: 1 },
  stopItemPriceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stopItemPrice: { fontSize: 14, fontWeight: "600", color: "#059669" },
  saleBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleText: { fontSize: 10, fontWeight: "700", color: "#d97706" },

  // Subtotal
  stopSubtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  stopSubtotalLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  stopSubtotalValue: { fontSize: 16, fontWeight: "700", color: "#059669" },
});
