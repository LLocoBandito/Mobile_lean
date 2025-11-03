import { Href, useRouter } from "expo-router";
import React, { FC, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const LoginScreen: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const TEST_EMAIL = "test@gmail.com";
  const TEST_PASSWORD = "1234";

  const handleLogin = () => {
    setLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setLoading(false);

      if (email === TEST_EMAIL && password === TEST_PASSWORD) {
        router.replace("/(tabs)");
      } else {
        setErrorMessage("Email atau password salah!");
      }
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selamat Datang</Text>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <TextInput
        placeholder="Email (test@gmail.com)"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Password (1234)"
        placeholderTextColor="#9CA3AF"
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
        <Text style={{ color: "#3B82F6", textAlign: "center", marginTop: 10 }}>
          Lupa Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/register" as Href)}>
        <Text style={{ color: "#3B82F6", textAlign: "center", marginTop: 5 }}>
          Belum punya akun? Daftar
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0F172A",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
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
