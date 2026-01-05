import * as ImagePicker from "expo-image-picker";
// ==== IMPORT BUTTON REUSABLE ====
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width } = Dimensions.get("window");

// --- Komponen InfoRow ---
const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.infoRowContainer}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={20} color="#3B82F6" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid;

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
  }, [user]);

<<<<<<< HEAD
  const fetchProfile = async () => {
    try {
      const docRef = doc(db, "users", userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setProfile(snap.data());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

=======
  // 🔥 UPLOAD CLOUDINARY
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  const pickAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin ditolak", "Kami butuh izin untuk mengakses galeri");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
<<<<<<< HEAD
      quality: 0.9,
=======
      quality: 0.7,
      base64: true,
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
    });

    if (result.canceled || !result.assets || !result.assets[0].base64) return;

    setUploading(true);
    const base64Image = result.assets[0].base64;

    try {
      const data = new FormData();
      data.append("file", `data:image/jpeg;base64,${base64Image}`);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

<<<<<<< HEAD
    await updateDoc(doc(db, "users", userId), { photoURL });
    setProfile({ ...profile, photoURL });

    setUploading(false);
    Alert.alert("Sukses", "Foto profil berhasil diupdate!");
=======
      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: data,
      });

      const json = await response.json();

      if (json.secure_url) {
        const photoURL = json.secure_url;
        await updateDoc(doc(db, "users", userId!), { photoURL });
        setProfile({ ...profile, photoURL });
        Alert.alert("Sukses", "Foto profil berhasil diupdate!");
      } else {
        Alert.alert(
          "Gagal",
          "Gagal mengunggah foto. Cek konfigurasi Cloudinary Anda."
        );
      }
    } catch (error: any) {
      Alert.alert("Error", "Terjadi masalah saat upload foto.");
    } finally {
      setUploading(false);
    }
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  };

  // 🔥 LOGOUT
  const handleLogout = async () => {
    Alert.alert("Logout", "Yakin mau keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Keluar",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

<<<<<<< HEAD
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER ELEGAN */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* AVATAR SECTION */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAndUploadImage} disabled={uploading}>
            <View style={styles.avatarWrapper}>
              {uploading ? (
                <ActivityIndicator size="large" color="#fff" />
=======
  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={pickAndUploadImage}
            disabled={uploading}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarBorder}>
              {uploading ? (
                <View style={styles.loadingAvatar}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
              ) : profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={styles.avatarImage}
                />
              ) : (
<<<<<<< HEAD
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {profile?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
=======
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {profile?.name?.[0]?.toUpperCase() || "U"}
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
                  </Text>
                </View>
              )}
            </View>
<<<<<<< HEAD
          </TouchableOpacity>

          <Text style={styles.profileName}>{profile?.name || "User"}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Personal Info</Text>

          {loading ? (
            <Text style={{ color: "#aaa" }}>Loading...</Text>
          ) : (
            <>
              <InfoRow label="Nama" value={profile?.name || "-"} />
              <InfoRow label="Alamat" value={profile?.address || "-"} />
              <InfoRow label="Tipe Motor" value={profile?.bikeType || "-"} />
              <InfoRow label="Gol. Darah" value={profile?.bloodType || "-"} />
              <InfoRow
                label="No. Darurat"
                value={profile?.emergencyPhone || "-"}
=======
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={18} color="#0F172A" />
            </View>
          </TouchableOpacity>

          <Text style={styles.welcomeText}>
            Hello, {profile?.name?.split(" ")[0] || "User"}!
          </Text>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        {/* CARD */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Personal Data</Text>

          {loading ? (
            <ActivityIndicator color="#3B82F6" style={{ margin: 20 }} />
          ) : (
            <>
              <InfoRow
                label="Nama Lengkap"
                value={profile?.name || "-"}
                icon="person-outline"
              />
              <View style={styles.divider} />
              <InfoRow
                label="Alamat"
                value={profile?.address || "-"}
                icon="location-outline"
              />
              <View style={styles.divider} />
              <InfoRow
                label="Tipe Motor"
                value={profile?.bikeType || "-"}
                icon="bicycle-outline"
              />
              <View style={styles.divider} />
              <InfoRow
                label="Gol. Darah"
                value={profile?.bloodType || "-"}
                icon="water-outline"
              />
              <View style={styles.divider} />
              <InfoRow
                label="No. Darurat"
                value={profile?.emergencyPhone || "-"}
                icon="call-outline"
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
              />
            </>
          )}
        </View>

        {/* BUTTONS */}
<<<<<<< HEAD
        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/editprofile")}
          >
            <Text style={styles.btnText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.btnText}>Logout</Text>
          </TouchableOpacity>
        </View>
=======
        <View style={styles.actionContainer}>
          {/* Primary Button */}
          <PrimaryButton
            text="Edit Profile"
            icon="create-outline"
            onPress={() => router.push("/editprofile")}
          />

          {/* Secondary Button untuk Logout */}
          <SecondaryButton title="Logout" onPress={handleLogout} />
        </View>

        <Text style={styles.versionText}>v1.0.0 PrimeLean App</Text>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
      </ScrollView>
    </View>
  );
}

<<<<<<< HEAD
const InfoRow = ({ label, value }: any) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },

  header: {
    paddingTop: 65,
    paddingBottom: 30,
    paddingHorizontal: 24,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderBottomWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },

  avatarSection: {
    alignItems: "center",
    marginTop: 30,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 80,
    overflow: "hidden",
    backgroundColor: "#1E293B",
    borderWidth: 3,
    borderColor: "#3B82F6",
    elevation: 20,
    shadowOpacity: 0.4,
    shadowColor: "#3B82F6",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#fff",
  },

  profileName: {
    marginTop: 16,
    fontSize: 26,
    color: "#fff",
    fontWeight: "700",
  },
  profileEmail: {
    color: "#94A3B8",
    fontSize: 15,
    marginTop: 6,
  },

  infoCard: {
    marginTop: 40,
    marginHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  infoTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 16,
=======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerContent: { justifyContent: "center", alignItems: "center" },

  headerContainer: { alignItems: "center", paddingTop: 60, paddingBottom: 30 },

  avatarWrapper: { position: "relative", marginBottom: 16 },
  avatarBorder: {
    padding: 4,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  avatarImage: { width: 130, height: 130, borderRadius: 65 },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 50, color: "#94A3B8", fontWeight: "bold" },

  cameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#3B82F6",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0F172A",
  },

  welcomeText: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  },
  emailText: { color: "#64748B", fontSize: 14 },

<<<<<<< HEAD
  row: {
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
=======
  cardContainer: {
    marginHorizontal: 20,
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 14,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 12,
    marginLeft: 48,
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  },
  rowLabel: { color: "#94A3B8", fontSize: 16 },
  rowValue: { color: "#fff", fontSize: 16, fontWeight: "600" },

<<<<<<< HEAD
  btnGroup: {
    marginTop: 40,
    alignItems: "center",
    gap: 16,
  },
  editBtn: {
    width: "85%",
    paddingVertical: 16,
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    alignItems: "center",
  },
  logoutBtn: {
    width: "85%",
    paddingVertical: 16,
    backgroundColor: "#EF4444",
    borderRadius: 16,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
=======
  infoRowContainer: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: { flex: 1 },
  infoLabel: { color: "#64748B", fontSize: 12, marginBottom: 2 },
  infoValue: { color: "#F1F5F9", fontSize: 16, fontWeight: "500" },

  actionContainer: { paddingHorizontal: 20, marginTop: 30, gap: 16 },

  versionText: {
    textAlign: "center",
    color: "#334155",
    marginTop: 30,
    fontSize: 12,
    marginBottom: 40,
  },
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
});
