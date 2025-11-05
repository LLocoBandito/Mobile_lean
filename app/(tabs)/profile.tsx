import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../utils/firebaseConfig";

export default function ProfileScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const docRef = doc(db, "users", "user_1");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setUserData(snapshot.data());
        }
      } catch (error) {
        console.error("Gagal memuat data profil:", error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    router.replace("/login");
  };

  if (!userData) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={{ color: "#9CA3AF", textAlign: "center" }}>
          Memuat profil...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Profil Pengguna</Text>

      <View style={styles.photoContainer}>
        <Image
          source={{
            uri:
              userData.photo ||
              "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          }}
          style={styles.profilePhoto}
        />
        <Text style={styles.userName}>{userData.name}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={22} color="#60A5FA" />
          <Text style={styles.label}>Alamat:</Text>
          <Text style={styles.value}>{userData.address}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="motorbike" size={22} color="#60A5FA" />
          <Text style={styles.label}>Jenis Motor:</Text>
          <Text style={styles.value}>{userData.bikeType}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="droplet" size={22} color="#60A5FA" />
          <Text style={styles.label}>Golongan Darah:</Text>
          <Text style={styles.value}>{userData.bloodType}</Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="phone-call" size={22} color="#60A5FA" />
          <Text style={styles.label}>Nomor Darurat:</Text>
          <Text style={styles.value}>{userData.emergencyPhone}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#3B82F6" }]}
        onPress={() => router.push("/editprofile")}
      >
        <Text style={styles.buttonText}>Edit Profil</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#EF4444", marginTop: 10 }]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
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
    marginBottom: 10,
    textAlign: "center",
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#3B82F6",
    marginBottom: 10,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 16,
    marginLeft: 10,
    flex: 0.7,
  },
  value: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
