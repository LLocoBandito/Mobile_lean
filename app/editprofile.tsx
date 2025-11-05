import { useRouter } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../utils/firebaseConfig";

export default function EditProfileScreen() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    bikeType: "",
    bloodType: "",
    emergencyPhone: "",
  });

  // 🔹 Ambil data user dari Firestore saat halaman dibuka
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", "user_1"); // ID user statis
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          setFormData(snapshot.data() as typeof formData);
        } else {
          console.log("Data profil belum ada di Firestore.");
        }
      } catch (error) {
        console.error("Gagal memuat profil:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "users", "user_1"), formData, { merge: true });
      Alert.alert("Berhasil!", "Profil kamu berhasil diperbarui 🎉");
      router.back();
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      Alert.alert("Error", "Gagal menyimpan profil ke database.");
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Batalkan Perubahan?",
      "Semua perubahan yang belum disimpan akan hilang.",
      [
        { text: "Tidak", style: "cancel" },
        { text: "Ya", onPress: () => router.back(), style: "destructive" },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Edit Profil</Text>

      {Object.keys(formData).map((key) => (
        <View key={key} style={styles.inputGroup}>
          <Text style={styles.label}>
            {key === "name"
              ? "Nama"
              : key === "address"
              ? "Alamat"
              : key === "bikeType"
              ? "Jenis Motor"
              : key === "bloodType"
              ? "Golongan Darah"
              : "Nomor Darurat"}
          </Text>
          <TextInput
            style={styles.input}
            value={formData[key as keyof typeof formData]}
            onChangeText={(text) => handleChange(key, text)}
            placeholder={`Masukkan ${key}`}
            placeholderTextColor="#94A3B8"
          />
        </View>
      ))}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Batalkan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#0F172A",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#475569",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
  },
});
