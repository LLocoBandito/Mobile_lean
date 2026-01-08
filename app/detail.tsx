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
import { WebView } from "react-native-webview";
import { db } from "../utils/firebaseConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootStackParamList = {
  DetailScreen: { id: string };
  ManageScreen: undefined;
};

type DetailRouteProp = RouteProp<RootStackParamList, "DetailScreen">;

/* ===================== LEAFLET HTML ===================== */
const getLeafletHtml = (path: any[]) => {
  const first =
    path.length > 0 ? path[0] : { latitude: -8.65, longitude: 115.22 };
  const last = path.length > 0 ? path[path.length - 1] : first;

  const polyline = JSON.stringify(path.map((p) => [p.latitude, p.longitude]));

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body { margin:0; padding:0; background:#0F172A; }
        #map { width:100vw; height:100vh; }
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl:false })
          .setView([${first.latitude}, ${first.longitude}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
          .addTo(map);

        const poly = L.polyline(${polyline}, {
          color:'#3B82F6',
          weight:5
        }).addTo(map);

        L.circleMarker(
          [${last.latitude}, ${last.longitude}],
          { radius:7, color:'#EF4444', fillOpacity:1 }
        ).addTo(map);

        map.fitBounds(poly.getBounds(), { padding:[20,20] });
      </script>
    </body>
  </html>
  `;
};

/* ===================== SCREEN ===================== */
export default function DetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation();
  const { id } = route.params;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const ref = doc(db, "monitoring_sessions", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setSession({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error("Firestore error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const path = session?.path || [];

  /* ===================== AVG ROLL ===================== */
  const averages = useMemo(() => {
    if (!path.length) return { avgRight: "0", avgLeft: "0" };

    let r = 0,
      l = 0,
      cr = 0,
      cl = 0;

    path.forEach((p: any) => {
      if (p.roll > 0) {
        r += p.roll;
        cr++;
      } else if (p.roll < 0) {
        l += Math.abs(p.roll);
        cl++;
      }
    });

    return {
      avgRight: cr ? (r / cr).toFixed(1) : "0",
      avgLeft: cl ? (l / cl).toFixed(1) : "0",
    };
  }, [path]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: "#E5E7EB", marginTop: 10 }}>
          Memuat detail...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.header} numberOfLines={1}>
          {session?.sessionName || "Detail Perjalanan"}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* MAP */}
        <View style={styles.mapContainer}>
          <WebView
            key={`map-${id}-${path.length}`}
            source={{ html: getLeafletHtml(path) }}
            style={{ flex: 1, backgroundColor: "#0F172A" }}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>

        {/* SUMMARY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ringkasan Sesi</Text>

          <Text style={styles.cardText}>
            ⚡ 0–60 km/h:{" "}
            {session?.accel_0_60 != null
              ? `${session.accel_0_60.toFixed(2)} s`
              : "-"}
          </Text>

          <Text style={styles.cardText}>
            ⚡ 60–100 km/h:{" "}
            {session?.accel_60_100 != null
              ? `${session.accel_60_100.toFixed(2)} s`
              : "-"}
          </Text>

          <Text style={styles.cardText}>
            ⚡ 100–150 km/h:{" "}
            {session?.accel_100_150 != null
              ? `${session.accel_100_150.toFixed(2)} s`
              : "-"}
          </Text>

          <Text style={styles.cardText}>
            📐 Avg Roll Kanan: {averages.avgRight}°
          </Text>
          <Text style={styles.cardText}>
            📐 Avg Roll Kiri: {averages.avgLeft}°
          </Text>
        </View>

        {/* LOG */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log Perjalanan ({path.length})</Text>

          {path.map((p: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text style={styles.idx}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{p.speed || 0} km/h</Text>
                <Text style={styles.sub}>
                  R:{p.roll > 0 ? p.roll : 0}° | L:
                  {p.roll < 0 ? Math.abs(p.roll) : 0}° | P:
                  {p.pitch?.toFixed(1)}°
                </Text>
              </View>
              <Text style={styles.time}>
                {new Date(p.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
  },
  header: {
    color: "#F9FAFB",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 15,
    flex: 1,
  },
  mapContainer: {
    height: 320,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#334155",
  },
  card: {
    backgroundColor: "#1E293B",
    margin: 20,
    padding: 20,
    borderRadius: 20,
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  cardText: {
    color: "#E5E7EB",
    fontSize: 15,
    marginVertical: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#334155",
  },
  idx: { color: "#94A3B8", width: 30 },
  rowText: { color: "#E5E7EB", fontWeight: "600" },
  sub: { color: "#94A3B8", fontSize: 12 },
  time: { color: "#64748B", fontSize: 12 },
});
