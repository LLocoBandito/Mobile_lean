import { Ionicons } from "@expo/vector-icons"; // PERBAIKAN: Tambahkan impor Ionicons
import { useRouter } from "expo-router";
import React, { useState } from "react";
<<<<<<< HEAD
// PERBAIKAN: Tambahkan StyleSheet, KeyboardAvoidingView, dan Platform ke dalam impor react-native
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../../components/PrimaryButton";
=======
import { Alert, Text, TouchableOpacity, View } from "react-native";
import PrimaryButton from "../../components/PrimaryButton";
>>>>>>> f94758a96585b86faecefefc059eb489dc7f8ee8
import AuthInput from "../../components/inputfield";
import { handleRegister } from "../../utils/login_handler";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationHandler = async () => {
<<<<<<< HEAD
    if (!email || !password || !name) {
=======
    if (!name || !email || !password) {
>>>>>>> f94758a96585b86faecefefc059eb489dc7f8ee8
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
<<<<<<< HEAD
      router.replace("/(auth)/login"); // Pastikan path benar sesuai struktur expo-router
=======

      router.replace("/(auth)/login");
>>>>>>> f94758a96585b86faecefefc059eb489dc7f8ee8
    } catch (error: any) {
      let message = "Pendaftaran gagal.";

      if (error.code === "auth/email-already-in-use") {
<<<<<<< HEAD
        errorMessage = "Email sudah terdaftar.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password terlalu lemah. Minimal 6 karakter.";
=======
        message = "Email sudah terdaftar.";
      } else if (error.code === "auth/weak-password") {
        message = "Password minimal 6 karakter.";
      } else if (error.message) {
        message = error.message;
>>>>>>> f94758a96585b86faecefefc059eb489dc7f8ee8
      }

      Alert.alert("Gagal", message);
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
=======
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0F172A",
      }}
>>>>>>> f94758a96585b86faecefefc059eb489dc7f8ee8
    >
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Ionicons name="person-add-outline" size={46} color="#fff" />
        </View>

<<<<<<< HEAD
        <Text style={styles.title}>Create Account ✨</Text>
        <Text style={styles.subtitle}>
          Daftar untuk memulai pengalamanmu!
=======
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
>>>>>>> f94758a96585b86faecefefc059eb489dc7f8ee8
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

        <View style={{ marginTop: 15 }}>
          <AuthButton
            text={loading ? "Mendaftar..." : "Sign Up"}
            onPress={loading ? () => {} : registrationHandler}
          />
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.linkText}>
            Already have an account?{" "}
            <Text style={styles.linkHighlight}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingVertical: 40,
    paddingHorizontal: 26,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  iconBox: {
    width: 75,
    height: 75,
    backgroundColor: "#3B82F6",
    borderRadius: 40,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
    fontSize: 15,
  },
  linkText: {
    textAlign: "center",
    marginTop: 20,
    color: "#CBD5E1",
    fontSize: 15,
  },
  linkHighlight: {
    color: "#3B82F6",
    fontWeight: "700",
  },
});