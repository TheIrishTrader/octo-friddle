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
import { useList } from "@/hooks/useList";
import { useBasketComparison, useRefreshPrices } from "@/hooks/usePrices";
import { useQueryClient } from "@tanstack/react-query";

export default function PricesScreen() {
  const queryClient = useQueryClient();
  const { activeList } = useList();
  const [showBasket, setShowBasket] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const itemIds = useMemo(
    () =>
      (activeList?.items ?? [])
        .filter((i) => i.itemId != null)
        .map((i) => i.itemId as string),
    [activeList?.items],
  );

  const basketQuery = useBasketComparison(showBasket ? itemIds : []);
  const refreshPrices = useRefreshPrices();

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
});
