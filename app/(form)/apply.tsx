import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../utils/firebaseConfig";

// ==== REUSABLE BUTTON ====
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";

/**
 * PILIHAN TIPE MOTOR
 */
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

export default function ApplyScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [bikeType, setBikeType] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const handleSubmit = async () => {
    if (!name || !address || !emergencyPhone || !bikeType) {
      Alert.alert("Validasi", "Mohon lengkapi semua data wajib.");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      await setDoc(
        doc(db, "users", user!.uid),
        {
          name,
          address,
          bikeType,
          bloodType,
          emergencyPhone,
          email: user?.email,
          createdAt: new Date(),
        },
        { merge: true }
      );

      Alert.alert("Berhasil", "Data berhasil disimpan!");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Lengkapi Data Diri</Text>
          <Text style={styles.subtitle}>
            Data ini diperlukan untuk keamanan dan identitas Anda
          </Text>
        </View>

        {/* CARD FORM */}
        <View style={styles.cardContainer}>
          <Text style={styles.sectionTitle}>Form Data Pribadi</Text>

          <TextInput
            placeholder="Nama Lengkap"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            placeholder="Alamat"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
          />

          {/* === TIPE MOTOR (CHIP SELECT) === */}
          <Text style={styles.fieldLabel}>Tipe Motor</Text>
          <View style={styles.chipContainer}>
            {BIKE_TYPES.map((type) => {
              const selected = bikeType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => setBikeType(type)}
                  activeOpacity={0.8}
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

          <TextInput
            placeholder="Golongan Darah"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={bloodType}
            onChangeText={setBloodType}
          />

          <TextInput
            placeholder="Nomor Darurat"
            placeholderTextColor="#64748B"
            style={styles.input}
            keyboardType="phone-pad"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
          />
        </View>

        {/* ACTION BUTTON */}
        <View style={styles.actionContainer}>
          <PrimaryButton
            text={loading ? "Menyimpan..." : "Simpan Data"}
            icon="save-outline"
            onPress={handleSubmit}
            loading={loading}
          />

          <SecondaryButton title="Logout" onPress={() => auth.signOut()} />
        </View>

        <Text style={styles.versionText}>v1.0.0 PrimeLean App</Text>
      </ScrollView>
    </View>
  );
}

/**
 * STYLES
 */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },

  headerContainer: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: "center",
    paddingHorizontal: 24,
  },

  title: {
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },

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

  input: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#F8FAFC",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 14,
  },

  fieldLabel: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
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

  actionContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
    gap: 16,
  },

  versionText: {
    textAlign: "center",
    color: "#334155",
    marginTop: 30,
    fontSize: 12,
    marginBottom: 40,
  },
});
