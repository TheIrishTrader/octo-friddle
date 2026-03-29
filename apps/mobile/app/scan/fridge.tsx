import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/api/client";
import type { DetectedFridgeItem } from "@grocery/shared";

export default function FridgeScanScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detected, setDetected] = useState<DetectedFridgeItem[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      await analyzeFridge(result.assets[0].uri);
    }
  };

  const analyzeFridge = async (imageUri: string) => {
    setLoading(true);
    try {
      const response = await apiClient.post<{ detectedItems: DetectedFridgeItem[]; missingItems: string[] }>("/scan/fridge", { imageUrl: imageUri });
      setDetected(response.detectedItems ?? []);
      setMissing(response.missingItems ?? []);
    } catch {
      Alert.alert("Error", "Failed to analyze fridge photo.");
    } finally {
      setLoading(false);
    }
  };

  const quantityColor = (qty: DetectedFridgeItem["quantity"]) => {
    switch (qty) {
      case "full": return "#059669";
      case "half": return "#d97706";
      case "low": return "#ea580c";
      case "nearly_empty": return "#dc2626";
    }
  };

  if (!image) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Fridge Scanner</Text>
        <Text style={styles.description}>
          Open your fridge and take a photo. AI will identify what you have and what you're running low on.
        </Text>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Take Photo of Fridge</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: image }} style={styles.preview} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing your fridge...</Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            <>
              {missing.length > 0 && (
                <View style={styles.missingSection}>
                  <Text style={styles.sectionTitle}>Might Need to Buy</Text>
                  <View style={styles.missingTags}>
                    {missing.map((item) => (
                      <TouchableOpacity key={item} style={styles.missingTag}>
                        <Text style={styles.missingTagText}>+ {item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.addAllButton}
                    onPress={() => router.back()}
                  >
                    <Text style={styles.addAllText}>Add Missing Items to List</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.sectionTitle}>
                Found {detected.length} items
              </Text>
            </>
          }
          data={detected}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.detectedItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
              </View>
              <View style={[styles.quantityBadge, { backgroundColor: quantityColor(item.quantity) + "20" }]}>
                <Text style={[styles.quantityText, { color: quantityColor(item.quantity) }]}>
                  {item.quantity.replace("_", " ")}
                </Text>
              </View>
            </View>
          )}
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
  button: { backgroundColor: "#10B981", padding: 16, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 200 },
  loadingContainer: { padding: 30, alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280" },
  listContent: { padding: 16 },
  missingSection: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 10 },
  missingTags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  missingTag: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  missingTagText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  addAllButton: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addAllText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  detectedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "500", color: "#111827" },
  itemBrand: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  quantityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  quantityText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
});
