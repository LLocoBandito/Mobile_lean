import { useNavigation } from "@react-navigation/native";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "./../utils/firebaseConfig";

export default function Detail() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // 🔥 Ambil data dari Firestore
  const fetchData = async () => {
    try {
      const q = query(
        collection(db, "monitoringData"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDataList(data);
    } catch (error) {
      console.error("❌ Gagal mengambil data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#9CA3AF", marginTop: 10 }}>Memuat data...</Text>
      </View>
    );
  }

  if (dataList.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#9CA3AF" }}>Belum ada data disimpan.</Text>
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 70 }}>
        <Text style={styles.header}>Riwayat Monitoring</Text>

        {dataList.map((item, index) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>📍 Data #{index + 1}</Text>
            <Text style={styles.text}>Status: {item.status}</Text>
            <Text style={styles.text}>
              Pitch: {item.pitch}° | Roll: {item.roll}°
            </Text>
            <Text style={styles.text}>
              Arah Miring:{" "}
              <Text
                style={{
                  color:
                    item.tiltDirection === "Kanan"
                      ? "#10B981"
                      : item.tiltDirection === "Kiri"
                      ? "#EF4444"
                      : "#9CA3AF",
                  fontWeight: "600",
                }}
              >
                {item.tiltDirection}
              </Text>
            </Text>
            <Text style={styles.text}>Total Titik: {item.totalPoints}</Text>
            <Text style={styles.text}>
              Waktu: {new Date(item.timestamp).toLocaleString()}
            </Text>

            {/* Peta rute */}
            {item.path && item.path.length > 0 && (
              <View style={styles.mapContainer}>
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: item.startPoint?.latitude || -8.65,
                    longitude: item.startPoint?.longitude || 115.22,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Polyline
                    coordinates={item.path}
                    strokeWidth={4}
                    strokeColor="#3B82F6"
                  />
                  <Marker
                    coordinate={item.startPoint}
                    title="Start"
                    pinColor="green"
                  />
                  <Marker
                    coordinate={item.endPoint}
                    title="End"
                    pinColor="red"
                  />
                </MapView>
              </View>
            )}
          </View>
        ))}

        {/* Tombol Exit */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Exit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 15,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    color: "#F3F4F6",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  text: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 3,
  },
  mapContainer: {
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  exitButton: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginTop: 20,
  },
});
