import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { db } from "../../utils/firebaseConfig";

// Definisi Interface
interface PathPoint {
  latitude: number;
  longitude: number;
  roll: number;
  pitch: number;
  speed: number;
  timestamp: string;
}

interface SessionData {
  id: string;
  sessionName: string;
  path: PathPoint[]; // Gunakan interface PathPoint
  totalPoints: number;
  startPoint: any;
  endPoint: any;
  accel_0_60: number | null;
  accel_60_100: number | null;
  accel_100_150: number | null;
  createdAt: string;
  avgPitch: string;
}

export default function DetailScreen() {
  // --- START: HOOKS HARUS DIPANGGIL DI TINGKAT ATAS ---
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize path data for useMemo dependencies
  const path = session?.path || [];

  // Hitung Statistik Roll (Avg & Max) dari data path
  const { avgRight, avgLeft, maxRight, maxLeft } = useMemo(() => {
    let sumR = 0,
      sumL = 0,
      countR = 0,
      countL = 0;
    let maxR = 0,
      maxL = 0;

    path.forEach((p) => {
      const roll = p.roll || 0;
      if (roll > 0) {
        // Kanan
        sumR += roll;
        countR++;
        if (roll > maxR) maxR = roll;
      } else if (roll < 0) {
        // Kiri
        sumL += Math.abs(roll);
        countL++;
        if (Math.abs(roll) > maxL) maxL = Math.abs(roll);
      }
    });

    return {
      avgRight: countR > 0 ? (sumR / countR).toFixed(1) : "0.0",
      avgLeft: countL > 0 ? (sumL / countL).toFixed(1) : "0.0",
      maxRight: maxR.toFixed(1),
      maxLeft: maxL.toFixed(1),
    };
  }, [path]); // Dependency menggunakan path yang sudah di-memoize

  // Mendapatkan region untuk peta
  const initialRegion = useMemo(() => {
    if (path.length > 0) {
      return {
        latitude: path[0].latitude,
        longitude: path[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return undefined;
  }, [path]);
  // --- END: HOOKS HARUS DIPANGGIL DI TINGKAT ATAS ---

  // Effect untuk fetching data
  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        const docRef = doc(db, "monitoring_sessions", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const sessionPath: PathPoint[] = data.path || [];

          // Hitung rata-rata Pitch dari data path
          const totalPitch = sessionPath.reduce(
            (sum: number, p) => sum + (p.pitch || 0),
            0
          );
          const avgPitchCalc =
            sessionPath.length > 0
              ? (totalPitch / sessionPath.length).toFixed(1)
              : "0.0";

          setSession({
            id: docSnap.id,
            sessionName: data.sessionName || "Tanpa Nama",
            path: sessionPath,
            totalPoints: data.totalPoints || 0,
            startPoint: data.startPoint,
            endPoint: data.endPoint,
            accel_0_60: data.accel_0_60 || null,
            accel_60_100: data.accel_60_100 || null,
            accel_100_150: data.accel_100_150 || null,
            createdAt: data.createdAt || data.startPoint?.timestamp,
            avgPitch: avgPitchCalc,
          } as SessionData);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  // Helper untuk formatting waktu akselerasi
  const formatAccelTime = (time: number | null) =>
    time !== null ? `${time.toFixed(2)}s` : "N/A";

  // --- CONDITIONAL RETURN (SETELAH SEMUA HOOKS) ---
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Memuat sesi...</Text>
      </View>
    );
  }

  if (!session || path.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          Data GPS tidak ditemukan atau sesi kosong.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header + Back */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {session.sessionName}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info Waktu */}
        <View style={styles.infoCard}>
          <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
          <Text style={styles.infoText}>
            Waktu Mulai:{" "}
            <Text style={{ fontWeight: "700" }}>
              {new Date(session.createdAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
          </Text>
        </View>

        {/* Peta */}
        <View style={styles.mapCard}>
          <Text style={styles.cardTitle}>Peta Perjalanan 🗺️</Text>
          <View style={styles.map}>
            <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
              <Polyline
                coordinates={path}
                strokeWidth={5}
                strokeColor="#3B82F6"
              />
              <Marker
                coordinate={path[0]}
                title="Start"
                description="Titik Awal Sesi"
                pinColor="#10B981"
              />
              <Marker
                coordinate={path[path.length - 1]}
                title="Finish"
                description="Titik Akhir Sesi"
                pinColor="#EF4444"
              />
            </MapView>
          </View>
        </View>

        {/* Waktu Akselerasi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Waktu Akselerasi ⏱️</Text>
          <View style={styles.accelRow}>
            <Text style={styles.accelLabel}>0 → 60 km/h</Text>
            <Text style={styles.accelValue}>
              {formatAccelTime(session.accel_0_60)}
            </Text>
          </View>
          <View style={styles.accelRow}>
            <Text style={styles.accelLabel}>60 → 100 km/h</Text>
            <Text style={styles.accelValue}>
              {formatAccelTime(session.accel_60_100)}
            </Text>
          </View>
          <View style={styles.accelRow}>
            <Text style={styles.accelLabel}>100 → 150 km/h</Text>
            <Text style={styles.accelValue}>
              {formatAccelTime(session.accel_100_150)}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: 15 }]}>
            <Ionicons name="location-outline" size={18} color="#10B981" />
            <Text style={styles.text}>
              Total Titik GPS:{" "}
              <Text style={styles.statValue}>{path.length}</Text>
            </Text>
          </View>
        </View>

        {/* Statistik Roll & Pitch */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistik Kemiringan 🏍️</Text>
          <View style={styles.row}>
            <Ionicons name="trending-up-outline" size={18} color="#3B82F6" />
            <Text style={styles.text}>
              Max Roll Kanan: <Text style={styles.statValue}>{maxRight}°</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="trending-down-outline" size={18} color="#EF4444" />
            <Text style={styles.text}>
              Max Roll Kiri: <Text style={styles.statValue}>{maxLeft}°</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Feather name="arrow-up-right" size={18} color="#8B5CF6" />
            <Text style={styles.text}>
              Avg Roll Kanan: <Text style={styles.statValue}>{avgRight}°</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Feather name="arrow-down-left" size={18} color="#EC4899" />
            <Text style={styles.text}>
              Avg Roll Kiri: <Text style={styles.statValue}>{avgLeft}°</Text>
            </Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="stats-chart-outline" size={18} color="#FBBF24" />
            <Text style={styles.text}>
              Rata-rata Pitch:{" "}
              <Text style={styles.statValue}>{session.avgPitch}°</Text>
            </Text>
          </View>
        </View>

        {/* Tabel Data Tiap Titik GPS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Tiap Titik GPS 📍</Text>
          {path.map((p, i: number) => {
            const roll = p.roll || 0;
            const kanan = roll > 0 ? roll.toFixed(1) : "0.0";
            const kiri = roll < 0 ? Math.abs(roll).toFixed(1) : "0.0";

            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.idx}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coord}>
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  </Text>
                  <Text style={styles.lean}>
                    Speed: {p.speed} km/h | Kanan: {kanan}° | Kiri: {kiri}° |
                    Pitch: {(p.pitch || 0).toFixed(1)}°
                  </Text>
                </View>
                <Text style={styles.time}>
                  {new Date(p.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
    marginLeft: 15,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingText: { color: "#E5E7EB", marginTop: 10, fontSize: 16 },

  backButton: {
    marginTop: 20,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
  },
  infoText: { color: "#E5E7EB", marginLeft: 10, fontSize: 14 },

  mapCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#1E293B",
  },
  map: { height: 280, marginTop: 15, borderRadius: 12, overflow: "hidden" },

  card: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 18,
    borderRadius: 16,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  text: { color: "#E5E7EB", marginLeft: 12, fontSize: 15 },
  statValue: { color: "#F9FAFB", fontWeight: "700" },

  accelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  accelLabel: { color: "#94A3B8", fontSize: 15 },
  accelValue: { color: "#10B981", fontSize: 16, fontWeight: "bold" },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  idx: { color: "#9CA3AF", width: 30, fontSize: 14 },
  coord: { color: "#E5E7EB", fontSize: 13 },
  lean: { color: "#94A3B8", fontSize: 12, marginTop: 3 },
  time: { color: "#94A3B8", fontSize: 11 },
});
