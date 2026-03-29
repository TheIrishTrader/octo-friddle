import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scan/barcode" options={{ title: "Scan Barcode" }} />
        <Stack.Screen name="scan/photo" options={{ title: "Photo Scan" }} />
        <Stack.Screen name="scan/fridge" options={{ title: "Fridge Scanner" }} />
        <Stack.Screen name="scan/receipt" options={{ title: "Scan Receipt" }} />
        <Stack.Screen name="item/[id]" options={{ title: "Item Details" }} />
        <Stack.Screen name="trip/plan" options={{ title: "Trip Planner" }} />
        <Stack.Screen
          name="route"
          options={{
            title: "Shopping Route",
            headerStyle: { backgroundColor: "#10B981" },
            headerTintColor: "#fff",
          }}
        />
        <Stack.Screen
          name="stores"
          options={{
            title: "Nearby Stores",
            headerStyle: { backgroundColor: "#10B981" },
            headerTintColor: "#fff",
          }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
