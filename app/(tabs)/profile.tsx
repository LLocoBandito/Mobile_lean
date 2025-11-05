import { useRouter } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../../utils/firebaseConfig";

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid || "user_1"; // sementara gunakan user_1 jika belum login

  const [profile, setProfile] = useState({
    name: "",
    address: "",
    bikeType: "",
    bloodType: "",
    emergencyPhone: "",
  });

  // 🔹 Ambil data dari Firestore saat halaman dimuat
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setProfile(snapshot.data() as typeof profile);
        } else {
          console.log("Profil belum ada di Firestore");
        }
      } catch (error) {
        console.error("Gagal memuat profil:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Keluar dari Akun", "Apakah kamu yakin ingin logout?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            Alert.alert("Berhasil Logout", "Sampai jumpa lagi 👋");
            router.replace("/login");
          } catch (error) {
            console.error("Gagal logout:", error);
            Alert.alert("Error", "Gagal logout dari sistem.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profil Pengguna</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Nama:</Text>
        <Text style={styles.value}>{profile.name || "-"}</Text>

        <Text style={styles.label}>Alamat:</Text>
        <Text style={styles.value}>{profile.address || "-"}</Text>

        <Text style={styles.label}>Jenis Motor:</Text>
        <Text style={styles.value}>{profile.bikeType || "-"}</Text>

        <Text style={styles.label}>Golongan Darah:</Text>
        <Text style={styles.value}>{profile.bloodType || "-"}</Text>

        <Text style={styles.label}>Nomor Darurat:</Text>
        <Text style={styles.value}>{profile.emergencyPhone || "-"}</Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push("/editprofile")}
      >
        <Text style={styles.editButtonText}>Edit Profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    color: "#94A3B8",
    fontSize: 14,
  },
  value: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
