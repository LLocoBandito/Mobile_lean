import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../../components/PrimaryButton";
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

      router.push("/(auth)/login");
    } catch (error: any) {
      let errorMessage =
        "Failed to send reset link. Please ensure your email is correct and registered.";

      if (error.code === "auth/user-not-found") {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed-outline" size={42} color="#fff" />
        </View>

        <Text style={styles.title}>Lupa Password</Text>

        <Text style={styles.subtitle}>
          Masukkan email kamu dan kami akan mengirimkan link reset password.
        </Text>

        <AuthInput
          label="Email"
          placeholder="example@mail.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={{ marginTop: 20 }}>
          <AuthButton
            title={loading ? "Loading..." : "Kirim Link Reset"}
            onPress={loading ? () => {} : handleReset}
          />
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.backText}>Kembali ke Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0F172A",
  },
  card: {
    backgroundColor: "#1E293B",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  iconBox: {
    alignSelf: "center",
    backgroundColor: "#3B82F6",
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
    marginBottom: 20,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 25,
    lineHeight: 20,
  },
  backText: {
    color: "#3B82F6",
    textAlign: "center",
    marginTop: 25,
    fontSize: 15,
    fontWeight: "500",
  },
});
