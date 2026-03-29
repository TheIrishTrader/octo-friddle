import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { apiClient } from "@/api/client";

export default function PhotoScanScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; brand: string | null; category: string }>>([]);

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      await analyzePhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      await analyzePhoto(result.assets[0].uri);
    }
  };

  const analyzePhoto = async (imageUri: string) => {
    setLoading(true);
    try {
      // In production: upload to Supabase Storage first, then send URL
      const response = await apiClient.post<{ items: Array<{ name: string; brand: string | null; category: string }> }>("/scan/photo", { imageUrl: imageUri });
      setResults(response.items ?? []);
    } catch {
      Alert.alert("Error", "Failed to analyze photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!image ? (
        <View style={styles.actions}>
          <Text style={styles.heading}>Take a photo of a grocery item</Text>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Image source={{ uri: image }} style={styles.preview} />

          {loading ? (
            <Text style={styles.loadingText}>Analyzing image...</Text>
          ) : (
            <View style={styles.resultList}>
              <Text style={styles.resultHeading}>
                {results.length > 0 ? "Items found:" : "No items identified"}
              </Text>
              {results.map((item, index) => (
                <TouchableOpacity key={index} style={styles.resultItem}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  {item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}
                  <Text style={styles.resultCategory}>{item.category}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  // Add all identified items to list
                  router.back();
                }}
              >
                <Text style={styles.buttonText}>Add All to List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setImage(null);
                  setResults([]);
                }}
              >
                <Text style={styles.secondaryButtonText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  actions: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 20 },
  button: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: { color: "#374151", fontSize: 16, fontWeight: "600" },
  resultContainer: { flex: 1 },
  preview: { width: "100%", height: 250 },
  loadingText: { textAlign: "center", padding: 20, fontSize: 16, color: "#6b7280" },
  resultList: { padding: 16 },
  resultHeading: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 12 },
  resultItem: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  resultName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  resultBrand: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  resultCategory: { fontSize: 12, color: "#10B981", marginTop: 2 },
});
