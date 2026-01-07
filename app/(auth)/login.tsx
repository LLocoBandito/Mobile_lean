import { Ionicons } from "@expo/vector-icons"; // Tambahkan icon
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Href, useRouter } from "expo-router";
import {
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { FC, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PrimaryButton from "../../components/PrimaryButton";
import { auth } from "../../utils/firebaseConfig";

const LoginScreen: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Konfigurasi Google Sign-In saat komponen dimuat
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "209930100873-fm9d2dbr45ee8d2frsjj7cra6k3hftji.apps.googleusercontent.com",
      offlineAccess: true,
    });
  }, []);

  // 2. Fungsi Login dengan Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        throw new Error("No ID Token found");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      console.log("Login Google Sukses:", userCredential.user.email);
      router.replace("/(tabs)");
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert("Dibatalkan", "Proses login Google dibatalkan.");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Login sedang diproses...");
      } else {
        console.error("Error Google Login:", error);
        Alert.alert("Error", "Gagal login dengan Google.");
      }
    } finally {
      setLoading(false);
    }
  };

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

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        Alert.alert(
          "Email Belum Diverifikasi",
          "Kami telah mengirim ulang link verifikasi ke email kamu.\n\nSilakan cek inbox/spam, klik link verifikasi, lalu login kembali.",
          [{ text: "OK", onPress: () => auth.signOut() }]
        );
        return;
      }

      console.log("Login sukses:", user.email);
      router.replace("/(tabs)");
    } catch (error: any) {
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
      }
      Alert.alert("Login Gagal", pesan);
    } finally {
      setLoading(false);
    }
  };

  return (
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

      <PrimaryButton text="LOGIN" onPress={handleLogin} loading={loading} />

      {/* GARIS PEMISAH */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Atau</Text>
        <View style={styles.divider} />
      </View>

      {/* TOMBOL GOOGLE LOGIN */}
      <TouchableOpacity
        onPress={handleGoogleLogin}
        style={styles.googleButton}
        disabled={loading}
      >
        <Ionicons
          name="logo-google"
          size={20}
          color="#fff"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.googleButtonText}>Masuk dengan Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/forgot" as Href)}>
        <Text style={styles.linkText}>Lupa Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/register" as Href)}>
        <Text style={styles.linkText}>Belum punya akun? Daftar di sini</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Aplikasi ini memantau performa berkendara Anda secara real-time.
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
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  // Style Tambahan untuk Google & Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#334155",
  },
  dividerText: {
    color: "#94A3B8",
    paddingHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#4285F4", // Warna Biru Google
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  googleButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
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
