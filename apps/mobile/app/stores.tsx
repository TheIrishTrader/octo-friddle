import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useNearbyStores } from "@/hooks/useRoute";
import { useList } from "@/hooks/useList";

export default function StoresScreen() {
  const _router = useRouter();
  const { activeList } = useList();

  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError(
            "Location permission denied. Please enable location services to find nearby stores.",
          );
          setLoadingLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setLat(location.coords.latitude);
        setLon(location.coords.longitude);
      } catch {
        setLocationError(
          "Unable to determine your location. Please check your location settings.",
        );
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const storesQuery = useNearbyStores(lat, lon);

  // Count items from the list available at each store (placeholder: show total list items)
  const listItemCount = activeList?.items?.length ?? 0;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nearby Stores</Text>
      <Text style={styles.subheading}>
        Find grocery stores near your current location
      </Text>

      {/* Loading location */}
      {loadingLocation && (
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {/* Location error */}
      {locationError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{locationError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLocationError(null);
              setLoadingLocation(true);
              (async () => {
                try {
                  const { status } =
                    await Location.requestForegroundPermissionsAsync();
                  if (status !== "granted") {
                    setLocationError(
                      "Location permission denied. Please enable location services.",
                    );
                    setLoadingLocation(false);
                    return;
                  }
                  const location = await Location.getCurrentPositionAsync({});
                  setLat(location.coords.latitude);
                  setLon(location.coords.longitude);
                } catch {
                  setLocationError(
                    "Unable to determine your location. Please check your settings.",
                  );
                } finally {
                  setLoadingLocation(false);
                }
              })();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading stores */}
      {!loadingLocation && !locationError && storesQuery.isLoading && (
        <View style={styles.centeredMessage}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Finding nearby stores...</Text>
        </View>
      )}

      {/* Stores list */}
      {!loadingLocation && !locationError && storesQuery.data && (
        <FlatList
          data={storesQuery.data}
          keyExtractor={(store) => store.id}
          renderItem={({ item: store }) => (
            <View style={styles.storeCard}>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                {store.chain && (
                  <Text style={styles.storeChain}>{store.chain}</Text>
                )}
                {store.address && (
                  <Text style={styles.storeAddress}>{store.address}</Text>
                )}
                <Text style={styles.storeDistance}>
                  {store.distance.toFixed(1)} miles away
                </Text>
                {listItemCount > 0 && (
                  <Text style={styles.storeAvailability}>
                    {listItemCount} items on your list
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.homeStoreButton}>
                <Text style={styles.homeStoreButtonText}>Use as{"\n"}home store</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centeredMessage}>
              <Text style={styles.emptyText}>
                No stores found near your location.
              </Text>
            </View>
          }
        />
      )}
    </View>
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

  // Centered messages
  centeredMessage: { alignItems: "center", paddingTop: 60 },
  loadingText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  emptyText: { fontSize: 15, color: "#9ca3af" },

  // Error
  errorContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Store card
  storeCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  storeChain: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginTop: 2,
  },
  storeAddress: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  storeDistance: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
  },
  storeAvailability: {
    fontSize: 12,
    color: "#059669",
    marginTop: 3,
  },

  // Home store button
  homeStoreButton: {
    backgroundColor: "#ecfdf5",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    alignItems: "center",
  },
  homeStoreButtonText: {
    color: "#059669",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
});
