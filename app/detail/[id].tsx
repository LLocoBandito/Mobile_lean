import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { db } from "../../utils/firebaseConfig"; // pastikan path ini sesuai

type SessionData = {
  id: string;
  sessionName: string;
  avgRoll: string;
  avgPitch: string;
  totalPoints: number;
  path: {
    latitude: number;
    longitude: number;
    roll?: number;
    pitch?: number;
    timestamp: string;
  }[];
  createdAt: string;
};

export default function DetailByIdScreen() {
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "sessions", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSession({ id: docSnap.id, ...docSnap.data() } as SessionData);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#E5E7EB", marginTop: 10 }}>Memuat data...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#E5E7EB" }}>Data sesi tidak ditemukan.</Text>
      </View>
    );
  }

  const { path } = session;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{session.sessionName}</Text>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: path[0]?.latitude || -8.65,
            longitude: path[0]?.longitude || 115.22,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Polyline coordinates={path} strokeWidth={4} strokeColor="#3B82F6" />
          {path.length > 0 && (
            <>
              <Marker coordinate={path[0]} title="Start" pinColor="green" />
              <Marker
                coordinate={path[path.length - 1]}
                title="End"
                pinColor="red"
              />
            </>
          )}
        </MapView>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Ringkasan Sesi</Text>
        <View style={styles.summaryRow}>
          <Ionicons name="speedometer-outline" size={18} color="#10B981" />
          <Text style={styles.summaryText}>
            Total Titik: {session.totalPoints}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="swap-horizontal-outline" size={18} color="#3B82F6" />
          <Text style={styles.summaryText}>
            Rata-rata Roll: {session.avgRoll}°
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="stats-chart-outline" size={18} color="#FBBF24" />
          <Text style={styles.summaryText}>
            Rata-rata Pitch: {session.avgPitch}°
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
          <Text style={styles.summaryText}>
            Dibuat: {new Date(session.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Data Table */}
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Data Kemiringan per Titik GPS</Text>
        {path.map((p, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableIndex}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableText}>
                Lat: {p.latitude.toFixed(5)}, Lng: {p.longitude.toFixed(5)}
              </Text>
              <Text style={styles.tableSubText}>
                Roll: {p.roll ?? 0}°, Pitch: {p.pitch ?? 0}°
              </Text>
            </View>
            <Text style={styles.timeText}>
              {new Date(p.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 20 },
  header: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", marginVertical: 3 },
  summaryText: { color: "#E5E7EB", marginLeft: 8 },
  tableContainer: { backgroundColor: "#1E293B", padding: 16, borderRadius: 12 },
  tableTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#374151",
  },
  tableIndex: { color: "#9CA3AF", width: 24 },
  tableText: { color: "#E5E7EB", fontSize: 14 },
  tableSubText: { color: "#9CA3AF", fontSize: 12 },
  timeText: { color: "#9CA3AF", fontSize: 12 },
  center: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
});
