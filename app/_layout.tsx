import { Slot, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/authcontext";

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // ❌ Belum login
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    // ⚠️ Login tapi belum isi profile
    if (!user.name || !user.phone) {
      router.replace("/(form)/apply");
      return;
    }

    // ✅ Login & profile lengkap
    router.replace("/(tabs)");
  }, [user, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
