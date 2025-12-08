import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../utils/firebaseconfig"; // Sesuaikan path jika perlu

// Komponen Input Kustom agar kode lebih rapi
const CustomInput = ({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  keyboardType?: any;
  multiline?: boolean;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputContainer, multiline && styles.inputContainerMulti]}>
      <Ionicons name={icon} size={20} color="#64748B" style={styles.inputIcon} />
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  </View>
);

export default function EditProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    bikeType: "",
    bloodType: "",
    emergencyPhone: "",
  });

  // 🔹 Fetch user data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, "users", userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          // Merge data yang ada dengan default state untuk menghindari error undefined
          setFormData((prev) => ({ ...prev, ...snapshot.data() }));
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        Alert.alert("Error", "Gagal memuat data profil.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", userId), formData, { merge: true });
      Alert.alert("Berhasil", "Profil Anda berhasil diperbarui! 🎉", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to save:", error);
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert("Batalkan Perubahan?", "Perubahan yang belum disimpan akan hilang.", [
      { text: "Lanjut Mengedit", style: "cancel" },
      { text: "Ya, Keluar", onPress: () => router.back(), style: "destructive" },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header Sederhana */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>

          <CustomInput
            label="Nama Lengkap"
            value={formData.name}
            onChangeText={(text) => handleChange("name", text)}
            icon="person-outline"
            placeholder="Contoh: John Doe"
          />

          <CustomInput
            label="Alamat Domisili"
            value={formData.address}
            onChangeText={(text) => handleChange("address", text)}
            icon="location-outline"
            placeholder="Masukkan alamat lengkap"
            multiline={true}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <CustomInput
                label="Tipe Motor"
                value={formData.bikeType}
                onChangeText={(text) => handleChange("bikeType", text)}
                icon="bicycle-outline"
                placeholder="Ex: Vario"
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomInput
                label="Gol. Darah"
                value={formData.bloodType}
                onChangeText={(text) => handleChange("bloodType", text)}
                icon="water-outline"
                placeholder="Ex: O+"
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Kontak Darurat</Text>
          <CustomInput
            label="Nomor Telepon Darurat"
            value={formData.emergencyPhone}
            onChangeText={(text) => handleChange("emergencyPhone", text)}
            icon="medkit-outline"
            placeholder="0812-xxxx-xxxx"
            keyboardType="phone-pad"
          />

          {/* Tombol Aksi */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={saving}>
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 50,
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60, // Adjust for notch
    paddingBottom: 20,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#F8FAFC",
  },

  // Form Styles
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerMulti: {
    height: 100,
    alignItems: "flex-start",
    paddingTop: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 16,
    height: "100%",
  },
  inputMulti: {
    height: "100%",
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  // Buttons
  actionContainer: {
    marginTop: 30,
    gap: 16,
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  cancelButtonText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },
});