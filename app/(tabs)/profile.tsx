import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../utils/firebaseConfig";

// =========================================================
// ⚡ KONFIGURASI CLOUDINARY ⚡
// =========================================================
const CLOUDINARY_CLOUD_NAME = "dvi8oy2ue";
const CLOUDINARY_UPLOAD_PRESET = "react_native_profile";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
// =========================================================

// --- Komponen Pembantu InfoRow ---
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid; // Mengambil UID, bisa null jika belum login

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // === FUNGSI FETCH PROFILE ===
  const fetchProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const docRef = doc(db, "users", userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setProfile(snap.data());
    } catch (e) {
      console.error("Error fetching profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchProfile();
  }, [user]); // Dependensi user memastikan fetch dilakukan setelah login

  // 🔥 FUNGSI UPLOAD KE CLOUDINARY 🔥
  const pickAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin ditolak", "Kami butuh izin untuk mengakses galeri");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets || !result.assets[0].base64) return;

    setUploading(true);
    const base64Image = result.assets[0].base64;

    try {
      const data = new FormData();
      data.append("file", `data:image/jpeg;base64,${base64Image}`);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      data.append("folder", "primelean_profiles");

      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: data,
      });

      const json = await response.json();

      if (json.secure_url) {
        const photoURL = json.secure_url;
        await updateDoc(doc(db, "users", userId!), { photoURL }); // userId pasti ada di sini
        setProfile({ ...profile, photoURL });
        Alert.alert("Sukses", "Foto profil berhasil diupdate!");
      } else {
        console.error("Cloudinary Response Error:", json);
        Alert.alert(
          "Gagal",
          "Gagal mengunggah foto. Cek konfigurasi Cloudinary Anda."
        );
      }
    } catch (error: any) {
      console.error("Upload Cloudinary Gagal:", error);
      Alert.alert("Error", "Terjadi masalah koneksi atau server saat upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Yakin mau keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  // Tampilkan loading screen jika user belum dimuat
  if (!user) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        <View style={styles.overlay} pointerEvents="none" />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingBottom: 100,
          }}
        >
          {/* Header & Avatar + Upload Button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={pickAndUploadImage} disabled={uploading}>
              <View style={styles.avatarContainer}>
                {uploading ? (
                  <ActivityIndicator size="large" color="#3B82F6" />
                ) : profile?.photoURL ? (
                  <Image
                    source={{ uri: profile.photoURL }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profile?.name?.[0]?.toUpperCase() ||
                        user?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </Text>
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.welcome}>Welcome back!</Text>
          </View>

          {/* Card Profil */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Profil</Text>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <View style={styles.skeletonLabel} />
                    <View style={styles.skeletonValue} />
                  </View>
                ))
            ) : (
              <>
                <InfoRow label="Nama" value={profile?.name || "-"} />
                <InfoRow label="Alamat" value={profile?.address || "-"} />
                <InfoRow label="Tipe Motor" value={profile?.bikeType || "-"} />
                <InfoRow label="Gol. Darah" value={profile?.bloodType || "-"} />
                <InfoRow
                  label="No. Darurat"
                  value={profile?.emergencyPhone || "-"}
                />
              </>
            )}
          </View>

          {/* Tombol Edit & Logout */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push("/editprofile")}
            >
              <Text style={styles.buttonText}>Edit Profil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
  },

  header: { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  avatarContainer: { position: "relative" },
  avatarImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: "#1E293B",
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    borderColor: "#1E293B",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 25,
  },
  avatarText: { color: "#fff", fontSize: 70, fontWeight: "bold" },
  cameraIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    elevation: 10,
  },

  email: { color: "#94A3B8", marginTop: 20, fontSize: 16 },
  welcome: { color: "#F8FAFC", fontSize: 28, fontWeight: "bold", marginTop: 8 },

  card: {
    marginHorizontal: 24,
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 28,
    padding: 30,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  label: { color: "#94A3B8", fontSize: 17, fontWeight: "500" },
  value: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 20,
  },

  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  skeletonLabel: {
    width: 110,
    height: 22,
    backgroundColor: "#334155",
    borderRadius: 8,
  },
  skeletonValue: {
    width: "55%",
    height: 22,
    backgroundColor: "#334155",
    borderRadius: 8,
  },

  buttonContainer: { alignItems: "center", marginTop: 50 },
  editButton: {
    width: "80%",
    backgroundColor: "#3B82F6",
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 18,
  },
  logoutButton: {
    width: "80%",
    marginTop: 20,
    backgroundColor: "#EF4444",
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOpacity: 0.7,
    shadowRadius: 25,
    elevation: 18,
  },
  buttonText: { color: "#fff", fontSize: 19, fontWeight: "bold" },
});
