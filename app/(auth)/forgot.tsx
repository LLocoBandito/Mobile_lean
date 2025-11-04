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
      Alert.alert("Error", "Masukkan alamat email Anda.");
      return;
    }

    setLoading(true);

    try {
      await handlePasswordReset(email);

      Alert.alert(
        "Tautan Dikirim",
        `Kami telah mengirimkan tautan reset password ke ${email}. Cek inbox Anda.`
      );
      // Kembali ke halaman login setelah berhasil
      router.push("/(auth)/login");
    } catch (error: any) {
      let errorMessage =
        "Gagal mengirim tautan reset. Pastikan email Anda benar dan terdaftar.";

      if (error.code === "auth/user-not-found") {
        // Penting: Jangan berikan detail spesifik user-not-found untuk alasan keamanan,
        // tapi kita bisa memberikan pesan yang lebih jelas di sini.
        errorMessage = "Email tidak ditemukan atau tidak terdaftar.";
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
        Masukkan email Anda untuk menerima tautan reset password.
      </Text>

      <AuthInput
        label="Email"
        placeholder="Masukkan email terdaftar"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <AuthButton
        title={loading ? "Mengirim..." : "Kirim Tautan Reset"}
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
