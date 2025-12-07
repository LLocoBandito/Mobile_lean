import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../../components/buttonprimary";
import AuthInput from "../../components/inputfield";
import { handlePasswordReset } from "../../utils/login_handler";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Error", "Enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await handlePasswordReset(email);

      Alert.alert(
        "Link Sent",
        `We have sent a password reset link to ${email}. Check your inbox.`
      );
      // Kembali ke halaman login setelah berhasil
      router.push("/(auth)/login");
    } catch (error: any) {
      let errorMessage =
        "Failed to send reset link. Please ensure your email is correct and registered.";

      if (error.code === "auth/user-not-found") {
        // Penting: Jangan berikan detail spesifik user-not-found untuk alasan keamanan,
        // tapi kita bisa memberikan pesan yang lebih jelas di sini.
        errorMessage = "Email not found or not registered.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Gagal", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lupa Password </Text>

      <Text style={styles.subtitle}>
        Enter your email to receive a password reset link
      </Text>

      <AuthInput
        label="Email"
        placeholder="Input Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <AuthButton
        title={loading ? "Loading..." : "Send Reset Code"}
        onPress={loading ? () => {} : handleReset}
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
