// app/detail/[id].tsx
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
import { db } from "../../utils/firebaseconfig";

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        const docRef = doc(db, "monitoring_sessions", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSession({
            id: docSnap.id,
            sessionName: data.sessionName || "Tanpa Nama",
            path: data.path || [], // ← INI YANG BENAR
            totalPoints: data.totalPoints || 0,
            avgRoll: data.avgRoll || "0",
            avgPitch: data.avgPitch || "0",
            startPoint: data.startPoint,
            endPoint: data.endPoint,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  // Hitung Avg Roll Kanan & Kiri dari data path (karena tidak disimpan maxRollRight/left)
  const { avgRight, avgLeft, maxRight, maxLeft } = useMemo(() => {
    const path = session?.path || [];
    let sumR = 0,
      sumL = 0,
      countR = 0,
      countL = 0;
    let maxR = 0,
      maxL = 0;

    path.forEach((p: any) => {
      const roll = p.roll || 0;
      if (roll > 0) {
        sumR += roll;
        countR++;
        if (roll > maxR) maxR = roll;
      } else if (roll < 0) {
        sumL += Math.abs(roll);
        countL++;
        if (Math.abs(roll) > maxL) maxL = Math.abs(roll);
      }
    });

    return {
      avgRight: countR > 0 ? (sumR / countR).toFixed(1) : "0",
      avgLeft: countL > 0 ? (sumL / countL).toFixed(1) : "0",
      maxRight: maxR.toFixed(1),
      maxLeft: maxL.toFixed(1),
    };
  }, [session]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Memuat sesi...</Text>
      </View>
    );
  }

  if (!session || !session.path || session.path.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Data GPS tidak ditemukan</Text>
      </View>
    );
  }

  const path = session.path;

  return (
    <View style={styles.container}>
      {/* Header + Back */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.title}>{session.sessionName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Peta */}
        <View style={styles.map}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: path[0].latitude,
              longitude: path[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Polyline
              coordinates={path}
              strokeWidth={5}
              strokeColor="#3B82F6"
            />
            <Marker coordinate={path[0]} title="Start" pinColor="green" />
            <Marker
              coordinate={path[path.length - 1]}
              title="Finish"
              pinColor="red"
            />
          </MapView>
        </View>

        {/* Ringkasan */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ringkasan Sesi</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color="#10B981" />
            <Text style={styles.text}>Total Titik: {path.length}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="trending-up-outline" size={18} color="#3B82F6" />
            <Text style={styles.text}>Max Roll Kanan: {maxRight}°</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="trending-down-outline" size={18} color="#EF4444" />
            <Text style={styles.text}>Max Roll Kiri: {maxLeft}°</Text>
          </View>
          <View style={styles.row}>
            <Feather name="arrow-up-right" size={18} color="#8B5CF6" />
            <Text style={styles.text}>Rata-rata Roll Kanan: {avgRight}°</Text>
          </View>
          <View style={styles.row}>
            <Feather name="arrow-down-left" size={18} color="#EC4899" />
            <Text style={styles.text}>Rata-rata Roll Kiri: {avgLeft}°</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="stats-chart-outline" size={18} color="#FBBF24" />
            <Text style={styles.text}>
              Rata-rata Pitch: {session.avgPitch}°
            </Text>
          </View>
        </View>

        {/* Tabel */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Tiap Titik GPS</Text>
          {path.map((p: any, i: number) => {
            const roll = p.roll || 0;
            const kanan = roll > 0 ? roll.toFixed(1) : "0";
            const kiri = roll < 0 ? Math.abs(roll).toFixed(1) : "0";

            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.idx}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coord}>
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  </Text>
                  <Text style={styles.lean}>
                    Kanan: {kanan}° | Kiri: {kiri}° | Pitch:{" "}
                    {(p.pitch || 0).toFixed(1)}°
                  </Text>
                </View>
                <Text style={styles.time}>
                  {new Date(p.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            );
          })}
        </View>
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
    marginLeft: 10,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  loadingText: { color: "#E5E7EB", marginTop: 10 },
  map: { height: 300, margin: 20, borderRadius: 16, overflow: "hidden" },
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
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  idx: { color: "#9CA3AF", width: 30 },
  coord: { color: "#E5E7EB", fontSize: 13 },
  lean: { color: "#94A3B8", fontSize: 12, marginTop: 3 },
  time: { color: "#94A3B8", fontSize: 11 },
});
