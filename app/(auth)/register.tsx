import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import PrimaryButton from "../../components/PrimaryButton";
import AuthInput from "../../components/inputfield";
import { handleRegister } from "../../utils/login_handler";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationHandler = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Semua kolom harus diisi.");
      return;
    }

    setLoading(true);

    try {
      await handleRegister(email, password, name);

      Alert.alert(
        "Berhasil 🎉",
        "Akun berhasil dibuat. Silakan cek email untuk verifikasi sebelum login."
      );

      router.replace("/(auth)/login");
    } catch (error: any) {
      let message = "Pendaftaran gagal.";

      if (error.code === "auth/email-already-in-use") {
        message = "Email sudah terdaftar.";
      } else if (error.code === "auth/weak-password") {
        message = "Password minimal 6 karakter.";
      } else if (error.message) {
        message = error.message;
      }

      Alert.alert("Gagal", message);
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
        backgroundColor: "#0F172A",
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

      <PrimaryButton
        text={loading ? "Mendaftar..." : "Sign Up"}
        onPress={registrationHandler}
        loading={loading}
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
