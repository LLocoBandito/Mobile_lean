import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../../components/buttonprimary";
import AuthInput from "../../components/inputfield";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lupa Password </Text>

      <Text style={styles.subtitle}>
        Masukkan email Anda untuk menerima tautan reset password.
      </Text>

      <AuthInput
        label="Email"
        placeholder="Email (test@gmail.com)"
        keyboardType="email-address"
      />

      <AuthButton
        title="Kirim Tautan Reset"
        onPress={() => alert("Tautan reset dikirim (UI Only)")}
      />

      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.backText}>Kembali ke Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0F172A", // sama seperti halaman login
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  backText: {
    color: "#3B82F6",
    textAlign: "center",
    marginTop: 20,
    fontSize: 15,
    fontWeight: "500",
  },
});
