import { View, Text, FlatList, StyleSheet } from "react-native";
import { useList } from "@/hooks/useList";

export default function PricesScreen() {
  const { activeList } = useList();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Price Comparison</Text>
      <Text style={styles.subheading}>
        Comparing prices for items in your active list
      </Text>

      <FlatList
        data={activeList?.items ?? []}
        keyExtractor={(item) => item.id}
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
            <Text style={styles.emptyText}>Add items to your list to compare prices</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827" },
  subheading: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 16 },
  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 },
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
