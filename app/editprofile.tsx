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
import { db } from "../utils/firebaseConfig";

import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";

/* ================= BIKE TYPE OPTIONS ================= */
const BIKE_TYPES = [
  "Trail",
  "Big Scooter",
  "Scooter",
  "Supersport",
  "Sport Touring",
  "Touring",
  "Cruiser",
  "Commuter",
];

/* ================= INPUT COMPONENT ================= */
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
    <View
      style={[styles.inputContainer, multiline && styles.inputContainerMulti]}
    >
      <Ionicons
        name={icon}
        size={20}
        color="#64748B"
        style={styles.inputIcon}
      />
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

/* ================= MAIN SCREEN ================= */
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

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      try {
        const snapshot = await getDoc(doc(db, "users", userId));
        if (snapshot.exists()) {
          setFormData((prev) => ({ ...prev, ...snapshot.data() }));
        }
      } catch {
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
    if (!formData.bikeType) {
      Alert.alert("Validasi", "Silakan pilih tipe motor.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "users", userId), formData, { merge: true });
      Alert.alert("Berhasil", "Profil berhasil diperbarui!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
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

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Informasi Pribadi</Text>

          <CustomInput
            label="Nama Lengkap"
            value={formData.name}
            onChangeText={(t) => handleChange("name", t)}
            icon="person-outline"
            placeholder="John Doe"
          />

          <CustomInput
            label="Alamat"
            value={formData.address}
            onChangeText={(t) => handleChange("address", t)}
            icon="location-outline"
            placeholder="Alamat Lengkap"
            multiline
          />

          {/* === BIKE TYPE SELECT === */}
          <Text style={styles.label}>Tipe Motor</Text>
          <View style={styles.chipContainer}>
            {BIKE_TYPES.map((type) => {
              const selected = formData.bikeType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => handleChange("bikeType", type)}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextActive]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <CustomInput
                label="Gol. Darah"
                value={formData.bloodType}
                onChangeText={(t) => handleChange("bloodType", t)}
                icon="water-outline"
                placeholder="O+"
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
            Kontak Darurat
          </Text>

          <CustomInput
            label="Nomor Telepon"
            value={formData.emergencyPhone}
            onChangeText={(t) => handleChange("emergencyPhone", t)}
            icon="medkit-outline"
            placeholder="08xx"
            keyboardType="phone-pad"
          />

          <View style={{ marginTop: 30, gap: 16 }}>
            <PrimaryButton
              text="Simpan Perubahan"
              onPress={handleSave}
              loading={saving}
              icon="save-outline"
            />
            <SecondaryButton title="Batal" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerContent: { justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 24, paddingBottom: 60 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#1E293B",
  },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "700" },

  sectionTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 15,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  inputGroup: { marginBottom: 20 },
  label: { color: "#E2E8F0", marginBottom: 8, fontSize: 14 },

  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    height: 56,
    alignItems: "center",
  },
  inputContainerMulti: {
    height: 100,
    alignItems: "flex-start",
    paddingTop: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: "#FFF", fontSize: 16 },
  inputMulti: { textAlignVertical: "top" },

  row: { flexDirection: "row" },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
  },
  chipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  chipText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#0F172A",
  },
});
