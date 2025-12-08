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
} from "react-native";
import { auth } from "../../utils/firebaseConfig";

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
<<<<<<< HEAD
      <Text style={styles.title}>Selamat Datang lagi senggol</Text>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
=======
      <Text style={styles.title}>PrimeLean Monitor</Text>
      <Text style={styles.subtitle}>Login untuk melanjutkan</Text>
>>>>>>> 70a9217f1e11c6565e00fbfd463e4f566a6b49d7

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
        )}
      </TouchableOpacity>

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  button: {
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
});

export default LoginScreen;
