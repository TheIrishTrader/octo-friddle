import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { useList } from "@/hooks/useList";
import { useBasketComparison, useRefreshPrices } from "@/hooks/usePrices";
import { useAlerts, useDeals, useSubstitutions } from "@/hooks/useSmart";
import { useQueryClient } from "@tanstack/react-query";
import type { PriceAlert, Substitution } from "@grocery/shared";

function getAlertColor(alertType: PriceAlert["alertType"]): string {
  switch (alertType) {
    case "price_drop":
    case "buy_now":
    case "sale":
      return "#059669";
    case "price_spike":
      return "#EF4444";
    case "wait":
      return "#F59E0B";
    default:
      return "#6b7280";
  }
}

function getAlertBgColor(alertType: PriceAlert["alertType"]): string {
  switch (alertType) {
    case "price_drop":
    case "buy_now":
    case "sale":
      return "#ecfdf5";
    case "price_spike":
      return "#fef2f2";
    case "wait":
      return "#fffbeb";
    default:
      return "#f9fafb";
  }
}

export default function PricesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeList } = useList();
  const [showBasket, setShowBasket] = useState(false);
  const [showDeals, setShowDeals] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubstitutions, setExpandedSubstitutions] = useState<
    Record<string, boolean>
  >({});

  const listId = activeList?.id ?? null;

  const itemIds = useMemo(
    () =>
      (activeList?.items ?? [])
        .filter((i) => i.itemId != null)
        .map((i) => i.itemId as string),
    [activeList?.items],
  );

  const basketQuery = useBasketComparison(showBasket ? itemIds : []);
  const refreshPrices = useRefreshPrices();
  const { data: alerts } = useAlerts(listId);
  const { data: deals } = useDeals();
  const { data: substitutions } = useSubstitutions(listId);

  const substitutionsByItem = useMemo(() => {
    const map: Record<string, Substitution> = {};
    (substitutions ?? []).forEach((sub) => {
      map[sub.originalItemId] = sub;
    });
    return map;
  }, [substitutions]);

  const toggleSubstitution = (itemId: string) => {
    setExpandedSubstitutions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh prices for each item that has an itemId
    const refreshPromises = itemIds.map((id) => refreshPrices.mutateAsync(id).catch(() => {}));
    await Promise.all(refreshPromises);
    // Also refetch the list to get updated cheapestPrice values
    await queryClient.invalidateQueries({ queryKey: ["list"] });
    await queryClient.invalidateQueries({ queryKey: ["prices"] });
    setRefreshing(false);
  }, [itemIds, refreshPrices, queryClient]);

  const handleCompareBasket = () => {
    setShowBasket(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Price Comparison</Text>
      <Text style={styles.subheading}>
        Comparing prices for items in your active list
      </Text>

      {/* Price Alerts */}
      {(alerts ?? []).length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.alertsSectionTitle}>Price Alerts</Text>
          {(alerts ?? []).map((alert, idx) => (
            <View
              key={`${alert.itemId}-${alert.alertType}-${idx}`}
              style={[
                styles.alertCard,
                { backgroundColor: getAlertBgColor(alert.alertType) },
              ]}
            >
              <View style={styles.alertContent}>
                <Text
                  style={[
                    styles.alertType,
                    { color: getAlertColor(alert.alertType) },
                  ]}
                >
                  {alert.alertType.replace("_", " ").toUpperCase()}
                </Text>
                <Text style={styles.alertItemName}>{alert.itemName}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
              <View style={styles.alertPrices}>
                <Text
                  style={[
                    styles.alertCurrentPrice,
                    { color: getAlertColor(alert.alertType) },
                  ]}
                >
                  ${alert.currentPrice.toFixed(2)}
                </Text>
                <Text style={styles.alertRefPrice}>
                  was ${alert.referencePrice.toFixed(2)}
                </Text>
                <Text style={styles.alertStore}>{alert.storeName}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Deals button */}
      <TouchableOpacity
        style={[styles.dealsButton, showDeals && styles.dealsButtonActive]}
        onPress={() => setShowDeals(!showDeals)}
      >
        <Text style={styles.dealsButtonText}>
          {showDeals ? "Hide Deals" : `Deals${(deals ?? []).length > 0 ? ` (${(deals ?? []).length})` : ""}`}
        </Text>
      </TouchableOpacity>

      {/* Deals list */}
      {showDeals && (deals ?? []).length > 0 && (
        <View style={styles.dealsSection}>
          {(deals ?? []).map((deal) => (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.dealInfo}>
                <Text style={styles.dealItemName}>{deal.itemName}</Text>
                <Text style={styles.dealDescription}>{deal.description}</Text>
                <Text style={styles.dealStore}>{deal.storeName}</Text>
              </View>
              <View style={styles.dealPricing}>
                <Text style={styles.dealPrice}>
                  ${deal.dealPrice.toFixed(2)}
                </Text>
                <Text style={styles.dealOriginal}>
                  ${deal.originalPrice.toFixed(2)}
                </Text>
                <View style={styles.dealSavingsBadge}>
                  <Text style={styles.dealSavingsText}>
                    -{deal.savingsPercent}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Compare Full Basket button */}
      {itemIds.length > 0 && (
        <TouchableOpacity
          style={[styles.basketButton, showBasket && styles.basketButtonActive]}
          onPress={handleCompareBasket}
          disabled={basketQuery.isFetching}
        >
          {basketQuery.isFetching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.basketButtonText}>
              {showBasket ? "Basket Compared" : "Compare Full Basket"}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Basket comparison results */}
      {showBasket && basketQuery.data && (
        <View style={styles.basketResults}>
          <Text style={styles.basketTitle}>Basket Totals by Store</Text>
          {basketQuery.data.stores.map((entry) => (
            <View key={entry.store.id} style={styles.basketRow}>
              <View style={styles.basketStoreInfo}>
                <Text style={styles.basketStoreName}>{entry.store.name}</Text>
                <Text style={styles.basketAvailability}>
                  {entry.itemsAvailable} of {itemIds.length} items
                </Text>
              </View>
              <Text style={styles.basketTotal}>
                ${entry.totalPrice.toFixed(2)}
              </Text>
            </View>
          ))}
          {basketQuery.data.splitSuggestion && (
            <View style={styles.splitSuggestion}>
              <Text style={styles.splitTitle}>
                Split Shopping Suggestion
              </Text>
              <Text style={styles.splitSavings}>
                Save ${basketQuery.data.splitSuggestion.savingsVsBest.toFixed(2)} by splitting across stores
              </Text>
              {basketQuery.data.splitSuggestion.stores.map((s) => (
                <Text key={s.storeId} style={styles.splitStore}>
                  {s.storeName}: {s.items.length} items (${s.subtotal.toFixed(2)})
                </Text>
              ))}
              <Text style={styles.splitTotal}>
                Total: ${basketQuery.data.splitSuggestion.totalPrice.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Plan Shopping Route button */}
      <TouchableOpacity
        style={styles.routeButton}
        onPress={() => router.push("/route")}
      >
        <Text style={styles.routeButtonText}>Plan Shopping Route</Text>
      </TouchableOpacity>

      {/* Item list with pull-to-refresh */}
      <FlatList
        data={activeList?.items ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={["#10B981"]}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.priceCard}>
            <Text style={styles.itemName}>
              {item.item?.displayName ?? item.customName ?? "Unknown"}
            </Text>
            {item.cheapestPrice ? (
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  ${item.cheapestPrice.price.toFixed(2)}
                </Text>
                <Text style={styles.storeName}>
                  {item.cheapestPrice.storeName}
                </Text>
                {item.cheapestPrice.isOnSale && (
                  <View style={styles.saleBadge}>
                    <Text style={styles.saleText}>SALE</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noPriceText}>No price data yet</Text>
            )}

            {/* Cheaper alternatives */}
            {item.itemId &&
              substitutionsByItem[item.itemId] &&
              substitutionsByItem[item.itemId].suggestions.length > 0 && (
                <View style={styles.substitutionSection}>
                  <TouchableOpacity
                    style={styles.substitutionToggle}
                    onPress={() => toggleSubstitution(item.itemId!)}
                  >
                    <Text style={styles.substitutionToggleText}>
                      Cheaper alternatives (
                      {substitutionsByItem[item.itemId].suggestions.length})
                    </Text>
                    <Text style={styles.substitutionArrow}>
                      {expandedSubstitutions[item.itemId!] ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                  {expandedSubstitutions[item.itemId!] &&
                    substitutionsByItem[item.itemId].suggestions.map((opt) => (
                      <View key={opt.itemId} style={styles.substitutionRow}>
                        <View style={styles.substitutionInfo}>
                          <Text style={styles.substitutionName}>
                            {opt.itemName}
                          </Text>
                          <Text style={styles.substitutionStore}>
                            {opt.storeName}
                            {opt.isStoreBrand ? " (Store Brand)" : ""}
                          </Text>
                        </View>
                        <View style={styles.substitutionPricing}>
                          <Text style={styles.substitutionPrice}>
                            ${opt.price.toFixed(2)}
                          </Text>
                          <Text style={styles.substitutionSavings}>
                            Save ${opt.savings.toFixed(2)} ({opt.savingsPercent}%)
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Add items to your list to compare prices
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827" },
  subheading: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    marginBottom: 16,
  },

  // Basket button
  basketButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  basketButtonActive: {
    backgroundColor: "#059669",
  },
  basketButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // Basket results
  basketResults: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  basketTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
  },
  basketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  basketStoreInfo: { flex: 1 },
  basketStoreName: { fontSize: 14, fontWeight: "600", color: "#374151" },
  basketAvailability: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  basketTotal: { fontSize: 18, fontWeight: "700", color: "#059669" },

  // Split suggestion
  splitSuggestion: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  splitTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065f46",
    marginBottom: 4,
  },
  splitSavings: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 8,
  },
  splitStore: { fontSize: 13, color: "#374151", marginBottom: 2 },
  splitTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065f46",
    marginTop: 6,
  },

  // Route button
  routeButton: {
    backgroundColor: "#065f46",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  routeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // Price cards
  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  price: { fontSize: 18, fontWeight: "700", color: "#059669" },
  storeName: { fontSize: 13, color: "#6b7280" },
  saleBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saleText: { fontSize: 10, fontWeight: "700", color: "#d97706" },
  noPriceText: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#9ca3af" },

  // Price Alerts
  alertsSection: {
    marginBottom: 12,
  },
  alertsSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  alertCard: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    alignItems: "center",
  },
  alertContent: { flex: 1 },
  alertType: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  alertMessage: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  alertPrices: { alignItems: "flex-end" },
  alertCurrentPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  alertRefPrice: {
    fontSize: 11,
    color: "#9ca3af",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  alertStore: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },

  // Deals
  dealsButton: {
    backgroundColor: "#ecfdf5",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  dealsButtonActive: {
    backgroundColor: "#d1fae5",
    borderColor: "#6ee7b7",
  },
  dealsButtonText: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 14,
  },
  dealsSection: {
    marginBottom: 12,
  },
  dealCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#d1fae5",
    alignItems: "center",
  },
  dealInfo: { flex: 1 },
  dealItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  dealDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  dealStore: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  dealPricing: { alignItems: "flex-end" },
  dealPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  dealOriginal: {
    fontSize: 11,
    color: "#9ca3af",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  dealSavingsBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  dealSavingsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  // Substitutions
  substitutionSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
  },
  substitutionToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  substitutionToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  substitutionArrow: {
    fontSize: 10,
    color: "#059669",
  },
  substitutionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  substitutionInfo: { flex: 1 },
  substitutionName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  substitutionStore: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 1,
  },
  substitutionPricing: { alignItems: "flex-end" },
  substitutionPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  substitutionSavings: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 1,
  },
});
