import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function ScanScreen() {
  const router = useRouter();

  const scanOptions = [
    {
      title: "Barcode Scanner",
      description: "Scan a product barcode to look up items and prices",
      route: "/scan/barcode" as const,
      icon: "|||",
    },
    {
      title: "Photo Scan",
      description: "Take a photo of an item to identify it",
      route: "/scan/photo" as const,
      icon: "📷",
    },
    {
      title: "Fridge Scanner",
      description: "Photograph your fridge to see what you need",
      route: "/scan/fridge" as const,
      icon: "🧊",
    },
    {
      title: "Receipt Scanner",
      description: "Scan a receipt to track purchases and prices",
      route: "/scan/receipt" as const,
      icon: "🧾",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How would you like to add items?</Text>
      {scanOptions.map((option) => (
        <TouchableOpacity
          key={option.route}
          style={styles.card}
          onPress={() => router.push(option.route)}
        >
          <Text style={styles.icon}>{option.icon}</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{option.title}</Text>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 14,
  },
  icon: { fontSize: 32 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardDescription: { fontSize: 13, color: "#6b7280", marginTop: 4 },
});
