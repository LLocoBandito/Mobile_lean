import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
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
import { db } from "../utils/firebaseconfig";

type RootStackParamList = {
  DetailScreen: { id: string };
  ManageScreen: undefined;
};

type DetailRouteProp = RouteProp<RootStackParamList, "DetailScreen">;

export default function DetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { id } = route.params;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const docRef = doc(db, "monitoring_sessions", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSession({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.warn("Data tidak ditemukan di Firestore");
        }
      } catch (err) {
        console.error("Gagal ambil data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  // Hitung rata-rata roll kanan & kiri dari gpsPath
  const averages = useMemo(() => {
    const path = session?.gpsPath || [];
    if (path.length === 0) {
      return { avgRight: 0, avgLeft: 0 };
    }

    let sumRight = 0;
    let sumLeft = 0;
    let countRight = 0;
    let countLeft = 0;

    path.forEach((p: any) => {
      const roll = p.roll || 0;
      if (roll > 0) {
        sumRight += roll;
        countRight++;
      } else if (roll < 0) {
        sumLeft += Math.abs(roll);
        countLeft++;
      }
    });

    return {
      avgRight: countRight > 0 ? (sumRight / countRight).toFixed(1) : 0,
      avgLeft: countLeft > 0 ? (sumLeft / countLeft).toFixed(1) : 0,
    };
  }, [session]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#E5E7EB", marginTop: 10 }}>
          Memuat detail sesi...
        </Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "#E5E7EB" }}>Data tidak ditemukan</Text>
      </View>
    );
  }

  const path = session.gpsPath || [];

  return (
    <View style={styles.container}>
      {/* Header dengan tombol Back */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.header}>{session.sessionName}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Peta */}
        <View style={styles.mapContainer}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: path[0]?.latitude || -8.65,
              longitude: path[0]?.longitude || 115.22,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Polyline
              coordinates={path}
              strokeWidth={5}
              strokeColor="#3B82F6"
            />
            {path.length > 0 && (
              <>
                <Marker coordinate={path[0]} title="Start" pinColor="green" />
                <Marker
                  coordinate={path[path.length - 1]}
                  title="Finish"
                  pinColor="red"
                />
              </>
            )}
          </MapView>
        </View>

        {/* Ringkasan */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan Sesi</Text>

          <View style={styles.summaryRow}>
            <Ionicons name="speedometer-outline" size={18} color="#10B981" />
            <Text style={styles.summaryText}>Total Titik: {path.length}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons
              name="swap-horizontal-outline"
              size={18}
              color="#3B82F6"
            />
            <Text style={styles.summaryText}>
              Max Roll Kanan: {session.leanData?.maxRollRight ?? 0}°
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons
              name="swap-horizontal-outline"
              size={18}
              color="#EF4444"
            />
            <Text style={styles.summaryText}>
              Max Roll Kiri: {session.leanData?.maxRollLeft ?? 0}°
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="trending-up-outline" size={18} color="#8B5CF6" />
            <Text style={styles.summaryText}>
              Avg Roll Kanan: {averages.avgRight}°
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="trending-down-outline" size={18} color="#EC4899" />
            <Text style={styles.summaryText}>
              Avg Roll Kiri: {averages.avgLeft}°
            </Text>
          </View>
        </View>

        {/* Tabel Data GPS */}
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>Data Kemiringan per Titik GPS</Text>
          {path.map((p: any, i: number) => {
            const roll = p.roll || 0;
            const rollKanan = roll > 0 ? roll.toFixed(1) : 0;
            const rollKiri = roll < 0 ? Math.abs(roll).toFixed(1) : 0;

            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableIndex}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableText}>
                    Lat: {p.latitude.toFixed(5)}, Lng: {p.longitude.toFixed(5)}
                  </Text>
                  <Text style={styles.tableSubText}>
                    Roll Kanan: {rollKanan}° | Roll Kiri: {rollKiri}° | Pitch:{" "}
                    {p.pitch?.toFixed(1) ?? 0}°
                  </Text>
                </View>
                <Text style={styles.timeText}>
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  header: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "700",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 5,
  },
  summaryCard: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    color: "#F9FAFB",
    fontSize: 19,
    fontWeight: "600",
    marginBottom: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  summaryText: { color: "#E5E7EB", marginLeft: 10, fontSize: 15 },
  tableContainer: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    marginBottom: 30,
  },
  tableTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  tableIndex: { color: "#9CA3AF", width: 30, fontSize: 14 },
  tableText: { color: "#E5E7EB", fontSize: 14 },
  tableSubText: { color: "#94A3B8", fontSize: 12.5, marginTop: 2 },
  timeText: { color: "#94A3B8", fontSize: 12 },
});
