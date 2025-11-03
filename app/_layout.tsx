import { Slot, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/authcontext";

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (!loading) {
      timer = setTimeout(() => {
        if (user) {
          // ✅ tidak perlu (tabs) di path
          router.replace("/(tabs)");
        } else {
          router.replace("/(auth)/login");
        }
      }, 300);
    }

    return () => clearTimeout(timer);
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

  // ✅ Slot harus dirender untuk menjaga integrasi Expo Router
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Slot di sini tetap dibutuhkan supaya nested layout berfungsi */}
      <RootNavigator />
    </AuthProvider>
  );
}
