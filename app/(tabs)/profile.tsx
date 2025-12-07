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
  const userId = user?.uid || "user_1"; // temporarily use user_1 if not logged in

  const [profile, setProfile] = useState({
    name: "",
    address: "",
    bikeType: "",
    bloodType: "",
    emergencyPhone: "",
  });

  // 🔹 Fetch data from Firestore when the page loads
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setProfile(snapshot.data() as typeof profile);
        } else {
          console.log("Profile does not exist in Firestore yet");
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            Alert.alert("Logout Successful", "See you again 👋");
            router.replace("/login");
          } catch (error) {
            console.error("Failed to log out:", error);
            Alert.alert("Error", "Failed to log out of the system.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>User Profile</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{profile.name || "-"}</Text>

        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{profile.address || "-"}</Text>

        <Text style={styles.label}>Bike Type:</Text>
        <Text style={styles.value}>{profile.bikeType || "-"}</Text>

        <Text style={styles.label}>Blood Type:</Text>
        <Text style={styles.value}>{profile.bloodType || "-"}</Text>

        <Text style={styles.label}>Emergency Number:</Text>
        <Text style={styles.value}>{profile.emergencyPhone || "-"}</Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push("/editprofile")}
      >
        <Text style={styles.editButtonText}>Edit Profile</Text>
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
