import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview"; // Pastikan sudah npx expo install react-native-webview
import { db } from "../utils/firebaseConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootStackParamList = {
  DetailScreen: { id: string };
  ManageScreen: undefined;
};

type DetailRouteProp = RouteProp<RootStackParamList, "DetailScreen">;

// --- LEAFLET HTML GENERATOR ---
// Fungsi ini membuat halaman web mini yang menjalankan Leaflet JS
const getLeafletHtml = (path: any[]) => {
  const firstPoint =
    path.length > 0 ? path[0] : { latitude: -8.65, longitude: 115.22 };
  const lastPoint = path.length > 0 ? path[path.length - 1] : firstPoint;

  // Konversi array koordinat untuk Polyline Leaflet [[lat, lon], [lat, lon]]
  const pathData = JSON.stringify(path.map((p) => [p.latitude, p.longitude]));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          /* Pastikan background ID map tidak transparan */
          html, body { margin: 0; padding: 0; background-color: #0F172A; }
          #map { height: 100vh; width: 100vw; background: #0F172A; }
          .leaflet-tile { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Tambahkan try-catch di dalam JS untuk debug jika perlu
          try {
            var map = L.map('map', { zoomControl: false }).setView([${firstPoint.latitude}, ${firstPoint.longitude}], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            // ... sisa logic polyline Anda
          } catch (e) {
            document.getElementById('map').innerHTML = "<p style='color:white'>" + e.message + "</p>";
          }
        </script>
      </body>
    </html>
  `;
};

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
        }
      } catch (err) {
        console.error("Gagal ambil data Firestore:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id]);

  const path = session?.path || [];

  // Logic perhitungan rata-rata kemiringan
  const averages = useMemo(() => {
    if (path.length === 0) return { avgRight: "0", avgLeft: "0" };
    let sumRight = 0,
      sumLeft = 0,
      countRight = 0,
      countLeft = 0;

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
      avgRight: countRight > 0 ? (sumRight / countRight).toFixed(1) : "0",
      avgLeft: countLeft > 0 ? (sumLeft / countLeft).toFixed(1) : "0",
    };
  }, [path]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#E5E7EB", marginTop: 10 }}>
          Memuat detail...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.header} numberOfLines={1}>
          {session?.sessionName || "Detail Perjalanan"}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* MAP SECTION: Menggunakan WebView + Leaflet */}
        <View style={styles.mapContainer}>
          <WebView
            // Gunakan ID unik agar WebView benar-benar refresh setiap kali data berubah
            key={`map-${session?.id}-${path.length}`}
            originWhitelist={["*"]}
            source={{ html: getLeafletHtml(path) }}
            // Tambahkan style latar belakang solid
            style={{ flex: 1, backgroundColor: "#0F172A" }}
            containerStyle={{ backgroundColor: "#0F172A" }}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            startInLoadingState={true}
            // Tambahkan ini untuk memastikan hardware acceleration tidak bentrok
            androidLayerType="hardware"
            mixedContentMode="always"
          />
        </View>

        {/* Ringkasan Statistik */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ringkasan Sesi</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="flash-outline" size={18} color="#10B981" />
            <Text style={styles.summaryText}>
              Akselerasi 0-60: {session?.accel?.zeroTo60?.toFixed(2) || "-"}s
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

        {/* Log Perjalanan (List) */}
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>
            Log Perjalanan ({path.length} titik)
          </Text>
          {path.map((p: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableIndex}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableText}>Kec: {p.speed || 0} km/h</Text>
                <Text style={styles.tableSubText}>
                  R: {p.roll > 0 ? p.roll : 0}° | L:{" "}
                  {p.roll < 0 ? Math.abs(p.roll) : 0}° | P:{" "}
                  {p.pitch?.toFixed(1)}°
                </Text>
              </View>
              <Text style={styles.timeText}>
                {p.timestamp
                  ? new Date(p.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </Text>
            </View>
          ))}
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
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: { marginRight: 15, padding: 5 },
  header: { color: "#F9FAFB", fontSize: 20, fontWeight: "700", flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  mapContainer: {
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  summaryCard: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  summaryText: { color: "#E5E7EB", marginLeft: 10, fontSize: 15 },
  tableContainer: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  tableIndex: { color: "#9CA3AF", width: 30, fontSize: 14 },
  tableText: { color: "#E5E7EB", fontSize: 14, fontWeight: "500" },
  tableSubText: { color: "#94A3B8", fontSize: 12, marginTop: 4 },
  timeText: { color: "#64748B", fontSize: 12 },
});
