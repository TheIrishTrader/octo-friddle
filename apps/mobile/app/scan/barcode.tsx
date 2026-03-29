import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { apiClient } from "@/api/client";

export default function BarcodeScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan barcodes</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const result = await apiClient.post("/scan/barcode", { barcode: data });

      if (result.found) {
        Alert.alert(
          "Item Found",
          `${result.item.displayName ?? result.item.name}\n${result.item.brand ?? ""}`,
          [
            { text: "Add to List", onPress: () => router.back() },
            { text: "Scan Another", onPress: () => setScanned(false) },
          ],
        );
      } else {
        Alert.alert("Not Found", `No product found for barcode: ${data}`, [
          { text: "Try Again", onPress: () => setScanned(false) },
          { text: "Add Manually", onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert("Error", "Failed to look up barcode. Please try again.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanWindow} />
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Looking up product...</Text>
          </View>
        )}
      </CameraView>
      <Text style={styles.hint}>Point your camera at a barcode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanWindow: {
    width: 280,
    height: 150,
    borderWidth: 2,
    borderColor: "#10B981",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: {
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    padding: 16,
    backgroundColor: "#000",
  },
  message: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
    marginTop: 40,
  },
  button: {
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 40,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600", fontSize: 16 },
});
