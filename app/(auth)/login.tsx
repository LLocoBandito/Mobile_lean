import { Href, useRouter } from "expo-router";
import {
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { FC, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth } from "../../utils/firebaseConfig";
<<<<<<< HEAD
import { Ionicons } from "@expo/vector-icons";
=======
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad

const LoginScreen: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email dan password wajib diisi!");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

<<<<<<< HEAD
      console.log("Login successful:", userCredential.user.email);
      router.replace("/(tabs)");
    } catch (error: any) {
      console.log("Login failed:", error.message);
      setErrorMessage("Email atau password salah.");
=======
      const user = userCredential.user;

      // CEK APAKAH EMAIL SUDAH DIVERIFIKASI
      if (!user.emailVerified) {
        // Kirim ulang email verifikasi
        await sendEmailVerification(user);

        Alert.alert(
          "Email Belum Diverifikasi",
          "Kami telah mengirim ulang link verifikasi ke email kamu.\n\nSilakan cek inbox/spam, klik link verifikasi, lalu login kembali.",
          [{ text: "OK", onPress: () => auth.signOut() }]
        );
        return;
      }

      // Email sudah terverifikasi → masuk ke aplikasi!
      console.log("Login sukses:", user.email);
      router.replace("/(tabs)"); // atau "/home" tergantung struktur kamu
    } catch (error: any) {
      console.log(error.code);

      let pesan = "Terjadi kesalahan saat login.";

      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          pesan = "Email atau password salah.";
          break;
        case "auth/invalid-email":
          pesan = "Format email tidak valid.";
          break;
        case "auth/too-many-requests":
          pesan = "Terlalu banyak percobaan. Coba lagi nanti.";
          break;
        case "auth/network-request-failed":
          pesan = "Koneksi internet bermasalah.";
          break;
      }

      Alert.alert("Login Gagal", pesan);
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
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
=======
    <View style={styles.container}>
      <Text style={styles.title}>PrimeLean Monitor</Text>
      <Text style={styles.subtitle}>Login untuk melanjutkan</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={handleLogin}
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>LOGIN</Text>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
        )}

<<<<<<< HEAD
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
=======
      <TouchableOpacity onPress={() => router.push("/(auth)/forgot" as Href)}>
        <Text style={styles.linkText}>Lupa Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/register" as Href)}>
        <Text style={styles.linkText}>Belum punya akun? Daftar di sini</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Hanya akun dengan email terverifikasi yang dapat menggunakan aplikasi
        ini.
      </Text>
    </View>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
<<<<<<< HEAD
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
=======
    padding: 28,
    backgroundColor: "#0F172A",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 40,
    fontSize: 16,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#fff",
    padding: 16,
    borderRadius: 14,
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  button: {
<<<<<<< HEAD
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
=======
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginVertical: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  linkText: {
    color: "#60A5FA",
    textAlign: "center",
    marginTop: 12,
    fontSize: 15,
  },
  footer: {
    color: "#64748B",
    textAlign: "center",
    fontSize: 13,
    marginTop: 40,
    lineHeight: 20,
  },
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
});

export default LoginScreen;
