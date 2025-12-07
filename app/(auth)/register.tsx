import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../../components/buttonprimary";
import AuthInput from "../../components/inputfield";
import { handleRegister } from "./../../utils/login_handler";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationHandler = async () => {
    // Validasi dasar - Pastikan nama juga ada
    if (!email || !password || !name) {
      Alert.alert("Error", "Semua kolom harus diisi.");
      return;
    }

    setLoading(true);

    try {
      // PERUBAHAN KRITIS: Kirimkan 'name' ke fungsi handler
      await handleRegister(email, password, name);

      Alert.alert(
        "Success",
        "Akun berhasil didaftarkan! Anda akan diarahkan ke Home."
      );
      router.replace("../(tabs)");
    } catch (error: any) {
      let errorMessage = "Pendaftaran gagal. Silakan coba lagi.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage =
          "Email ini sudah terdaftar. Silakan login atau gunakan email lain.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password terlalu lemah. Minimum 6 karakter.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Pendaftaran Gagal", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0F172A", // Dark background
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 40,
          textAlign: "center",
          color: "#fff",
        }}
      >
        Create Account ✨
      </Text>

      <AuthInput
        label="Full Name"
        placeholder="Your name"
        value={name}
        onChangeText={setName}
      />
      <AuthInput
        label="Email"
        placeholder="Your email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthInput
        label="Password"
        placeholder="Create password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <AuthButton
        title={loading ? "Mendaftar..." : "Sign Up"}
        // Menggunakan kondisional untuk mencegah panggilan onPress saat loading
        onPress={loading ? () => {} : registrationHandler}
      />

      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text
          style={{
            textAlign: "center",
            marginTop: 20,
            color: "#CBD5E1",
          }}
        >
          Already have an account?{" "}
          <Text style={{ color: "#3B82F6", fontWeight: "bold" }}>Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
