import * as ImagePicker from "expo-image-picker";
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
// Import Icon untuk UI yang lebih cantik
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../utils/firebaseconfig";

// =========================================================
// ⚡ KONFIGURASI CLOUDINARY ⚡
// =========================================================
const CLOUDINARY_CLOUD_NAME = "dvi8oy2ue";
const CLOUDINARY_UPLOAD_PRESET = "react_native_profile";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
// =========================================================

const { width } = Dimensions.get("window");

// --- Komponen Pembantu InfoRow yang Dipercantik ---
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
        await updateDoc(doc(db, "users", userId!), { photoURL });
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
        text: "Ya, Keluar",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

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
      
      {/* Background Decorative Elements */}
      <View style={styles.bgCircleTop} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            onPress={pickAndUploadImage} 
            disabled={uploading}
            activeOpacity={0.8}
            style={styles.avatarWrapper}
          >
            <View style={styles.avatarBorder}>
              {uploading ? (
                <View style={styles.loadingAvatar}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                </View>
              ) : profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {profile?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={18} color="#0F172A" />
            </View>
          </TouchableOpacity>

          <Text style={styles.welcomeText}>Hello, {profile?.name?.split(" ")[0] || "User"}!</Text>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        {/* Info Card */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Personal Data</Text>
          
          {loading ? (
            <ActivityIndicator color="#3B82F6" style={{ margin: 20 }} />
          ) : (
            <View style={styles.infoGroup}>
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
              />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/editprofile")}
          >
            <Ionicons name="create-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Edit Profil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>v1.0.0 PrimeLean App</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A", // Slate 900
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  bgCircleTop: {
    position: "absolute",
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#1E293B", // Slate 800
    opacity: 0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  // Header Styles
  headerContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
  },
  avatarWrapper: {
    marginBottom: 16,
    position: "relative",
  },
  avatarBorder: {
    padding: 4,
    backgroundColor: "rgba(59, 130, 246, 0.2)", // Blue transparent ring
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  avatarImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
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
  avatarInitial: {
    fontSize: 50,
    color: "#94A3B8",
    fontWeight: "bold",
  },
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
  },
  emailText: {
    color: "#64748B",
    fontSize: 14,
  },

  // Card Styles
  cardContainer: {
    marginHorizontal: 20,
    backgroundColor: "#1E293B", // Slate 800
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 14,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 20,
    letterSpacing: 1,
  },
  infoGroup: {
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 12,
    marginLeft: 48, // offset for icon
  },

  // Info Row Styles
  infoRowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: "#64748B", // Muted slate
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: "#F1F5F9", // Bright white
    fontSize: 16,
    fontWeight: "500",
  },

  // Button Styles
  actionContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  secondaryButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    color: "#334155",
    marginTop: 30,
    fontSize: 12,
  },
});