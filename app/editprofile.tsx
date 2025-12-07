import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
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
  const auth = getAuth();
  const user = auth.currentUser;
  const userId = user?.uid || "user_1";

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    bikeType: "",
    bloodType: "",
    emergencyPhone: "",
  });

  // 🔹 Fetch user data from Firestore when the page is opened
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setFormData(snapshot.data() as typeof formData);
        } else {
          console.log("Profile data does not exist in Firestore yet.");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "users", userId), formData, { merge: true });
      Alert.alert("Success!", "Your profile has been updated successfully 🎉");
      router.replace("/(tabs)/profile"); // go back to the profile page
    } catch (error) {
      console.error("Failed to save:", error);
      Alert.alert("Error", "Failed to save profile to the database.");
    }
  };

  const handleCancel = () => {
    Alert.alert("Discard Changes?", "All unsaved changes will be lost.", [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: () => router.back(), style: "destructive" },
    ]);
  };

  // Helper function for translating keys
  const getLabel = (key: string) => {
    switch (key) {
      case "name":
        return "Name";
      case "address":
        return "Address";
      case "bikeType":
        return "Bike Type";
      case "bloodType":
        return "Blood Type";
      case "emergencyPhone":
        return "Emergency Number";
      default:
        return key;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

      {Object.keys(formData).map((key) => (
        <View key={key} style={styles.inputGroup}>
          <Text style={styles.label}>{getLabel(key)}</Text>
          <TextInput
            style={styles.input}
            value={formData[key as keyof typeof formData]}
            onChangeText={(text) => handleChange(key, text)}
            placeholder={`Enter ${getLabel(key).toLowerCase()}`}
            placeholderTextColor="#94A3B8"
            // Special keyboard for emergency phone
            keyboardType={key === "emergencyPhone" ? "phone-pad" : "default"}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
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
