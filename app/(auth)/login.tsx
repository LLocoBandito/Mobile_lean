import { Href, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { FC, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth } from "../../utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

const LoginScreen: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Login successful:", userCredential.user.email);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.log("Login failed:", error.message);
      setErrorMessage("Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.centerBox}>
        <View style={styles.logoBox}>
          <Ionicons name="person-circle-outline" size={65} color="#fff" />
        </View>

        <Text style={styles.title}>Welcome Back 👋</Text>
        <Text style={styles.subtitle}>
          Masuk untuk melanjutkan perjalananmu.
        </Text>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <TextInput
          placeholder="Email"
          placeholderTextColor="#78808C"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#78808C"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity
          onPress={handleLogin}
          style={styles.button}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/forgot" as Href)}>
          <Text style={styles.linkText}>Lupa Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/register" as Href)}
        >
          <Text style={styles.linkTextBottom}>
            Belum punya akun?{" "}
            <Text style={{ color: "#3B82F6", fontWeight: "600" }}>
              Register
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    padding: 24,
  },
  centerBox: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 35,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoBox: {
    alignSelf: "center",
    backgroundColor: "#3B82F6",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    fontSize: 15,
  },
  input: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    color: "#fff",
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  linkText: {
    color: "#3B82F6",
    textAlign: "center",
    marginTop: 18,
    fontSize: 15,
  },
  linkTextBottom: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 14,
    fontSize: 15,
  },
  errorContainer: {
    backgroundColor: "rgba(220, 38, 38, 0.12)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  errorText: {
    color: "#F87171",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default LoginScreen;
