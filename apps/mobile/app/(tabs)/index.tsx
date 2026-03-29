import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useList } from "@/hooks/useList";
import { useRealtimeListSync } from "@/hooks/useRealtime";

export default function ListScreen() {
  const router = useRouter();
  const { activeList, addItem, toggleItem, removeItem } = useList();

  // Enable realtime sync across household devices
  useRealtimeListSync(activeList?.id ?? null);
  const [newItemText, setNewItemText] = useState("");

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    addItem({ customName: newItemText.trim(), addedVia: "manual" });
    setNewItemText("");
  };

  return (
    <View style={styles.container}>
      {/* Add item input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add an item..."
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push("/scan/barcode")}
        >
          <Text style={styles.quickActionText}>Scan Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push("/scan/photo")}
        >
          <Text style={styles.quickActionText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push("/scan/fridge")}
        >
          <Text style={styles.quickActionText}>Fridge</Text>
        </TouchableOpacity>
      </View>

      {/* Item list */}
      <FlatList
        data={activeList?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.listItem, item.isChecked && styles.listItemChecked]}
            onPress={() => toggleItem(item.id)}
            onLongPress={() => removeItem(item.id)}
          >
            <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]} />
            <View style={styles.itemInfo}>
              <Text
                style={[styles.itemName, item.isChecked && styles.itemNameChecked]}
              >
                {item.item?.displayName ?? item.customName ?? "Unknown item"}
              </Text>
              {item.cheapestPrice && (
                <Text style={styles.priceHint}>
                  ${item.cheapestPrice.price.toFixed(2)} at {item.cheapestPrice.storeName}
                  {item.cheapestPrice.isOnSale ? " (SALE)" : ""}
                </Text>
              )}
            </View>
            <Text style={styles.quantity}>x{item.quantity}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Your list is empty</Text>
            <Text style={styles.emptySubtext}>
              Add items by typing, scanning a barcode, or taking a photo
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  inputRow: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: "#10B981",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  quickActions: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  quickAction: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  quickActionText: { color: "#059669", fontSize: 13, fontWeight: "600" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  listItemChecked: { opacity: 0.5 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, color: "#111827" },
  itemNameChecked: { textDecorationLine: "line-through", color: "#9ca3af" },
  priceHint: { fontSize: 12, color: "#059669", marginTop: 2 },
  quantity: { fontSize: 14, color: "#6b7280", fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, color: "#6b7280", fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#9ca3af", marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
});
