import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
import { auth, db, storage } from "../../utils/firebaseConfig";

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const userId = user?.uid || "guest";

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchProfile();
  }, [userId]);

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

  const pickAndUploadImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin ditolak", "Kami butuh izin untuk mengakses galeri");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0].uri) return;

    setUploading(true);
    const uri = result.assets[0].uri;
    const response = await fetch(uri);
    const blob = await response.blob();

    const storageRef = ref(storage, `profilePictures/${userId}`);
    await uploadBytes(storageRef, blob);
    const photoURL = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", userId), { photoURL });
    setProfile({ ...profile, photoURL });

    setUploading(false);
    Alert.alert("Sukses", "Foto profil berhasil diupdate!");
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
              ) : profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {profile?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
              )}
            </View>
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
              />
            </>
          )}
        </View>

        {/* BUTTONS */}
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
      </ScrollView>
    </View>
  );
}

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
  },

  row: {
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: { color: "#94A3B8", fontSize: 16 },
  rowValue: { color: "#fff", fontSize: 16, fontWeight: "600" },

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
});
