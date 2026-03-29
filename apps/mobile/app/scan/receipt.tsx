import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/api/client";
import type { ParsedReceiptData } from "@grocery/shared";

export default function ReceiptScanScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [_receiptId, setReceiptId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      await uploadReceipt(result.assets[0].uri);
    }
  };

  const uploadReceipt = async (imageUri: string) => {
    setStatus("uploading");
    try {
      // In production: upload to Supabase Storage, get public URL
      const response = await apiClient.post<{ receiptId: string }>("/scan/receipt", { imageUrl: imageUri });
      setReceiptId(response.receiptId);
      setStatus("processing");
      startPolling(response.receiptId);
    } catch {
      setStatus("error");
      Alert.alert("Error", "Failed to upload receipt.");
    }
  };

  const startPolling = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const receipt = await apiClient.get<{ status: string; parsedData: ParsedReceiptData | null }>(`/scan/receipt/${id}`);
        if (receipt.status === "parsed") {
          clearInterval(pollRef.current);
          setStatus("parsed");
          setParsedData(receipt.parsedData);
        } else if (receipt.status === "failed") {
          clearInterval(pollRef.current);
          setStatus("error");
        }
      } catch {
        // Keep polling
      }
    }, 2000);
  };

  if (!image) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Receipt Scanner</Text>
        <Text style={styles.description}>
          Take a photo of your grocery receipt to automatically track prices and build purchase history.
        </Text>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Scan Receipt</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: image }} style={styles.preview} />

      {status === "processing" && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Processing receipt...</Text>
          <Text style={styles.statusHint}>This may take a few seconds</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.statusContainer}>
          <Text style={styles.errorText}>Failed to parse receipt</Text>
          <TouchableOpacity style={styles.button} onPress={() => { setImage(null); setStatus("idle"); }}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "parsed" && parsedData && (
        <FlatList
          ListHeaderComponent={
            <View style={styles.receiptHeader}>
              {parsedData.storeName && (
                <Text style={styles.storeName}>{parsedData.storeName}</Text>
              )}
              {parsedData.date && <Text style={styles.date}>{parsedData.date}</Text>}
              <Text style={styles.itemCount}>
                {parsedData.lineItems.length} items found
              </Text>
            </View>
          }
          data={parsedData.lineItems}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.lineItem}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemName}>{item.name}</Text>
                {item.quantity > 1 && (
                  <Text style={styles.lineItemQty}>x{item.quantity}</Text>
                )}
              </View>
              <Text style={styles.lineItemPrice}>
                ${item.totalPrice.toFixed(2)}
                {item.isSaleItem ? " *" : ""}
              </Text>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.receiptFooter}>
              {parsedData.total && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${parsedData.total.toFixed(2)}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                <Text style={styles.buttonText}>Save & Return to List</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center" },
  description: { fontSize: 15, color: "#6b7280", textAlign: "center", marginVertical: 20, lineHeight: 22 },
  button: { backgroundColor: "#10B981", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 160 },
  statusContainer: { padding: 24, alignItems: "center" },
  statusText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  statusHint: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  errorText: { fontSize: 16, fontWeight: "600", color: "#dc2626" },
  listContent: { padding: 16 },
  receiptHeader: { marginBottom: 12 },
  storeName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  date: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  itemCount: { fontSize: 13, color: "#059669", marginTop: 6, fontWeight: "500" },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  lineItemInfo: { flex: 1 },
  lineItemName: { fontSize: 14, color: "#111827" },
  lineItemQty: { fontSize: 12, color: "#6b7280" },
  lineItemPrice: { fontSize: 14, fontWeight: "600", color: "#111827" },
  receiptFooter: { marginTop: 16 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: "#111827",
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
});
