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
import { db } from "../../utils/firebaseConfig"; // ensure this path is correct

type SessionData = {
  id: string;
  sessionName: string;
  // Ensure data types match what is stored in Firestore (e.g., number or string)
  avgRoll: number;
  avgPitch: number;
  totalPoints: number;
  path: {
    latitude: number;
    longitude: number;
    roll?: number;
    pitch?: number;
    timestamp: string;
  }[];
  // Retrieving timestamp from startPoint
  startPoint: { timestamp: string };
};

export default function DetailByIdScreen() {
  // Ensure the 'id' parameter is retrieved as a string
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        // --- IMPORTANT FIX HERE ---
        // Change 'sessions' to 'monitoring_sessions'
        const docRef = doc(db, "monitoring_sessions", id);
        // --------------------------

        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSession({
            id: docSnap.id,
            sessionName: data.sessionName || "Untitled Session",
            avgRoll: parseFloat(data.avgRoll) || 0, // Ensure numeric format
            avgPitch: parseFloat(data.avgPitch) || 0, // Ensure numeric format
            totalPoints: data.totalLocationPoints || data.totalPoints || 0, // Flexible retrieval
            path: data.path || [],
            startPoint: data.startPoint,
          } as SessionData);
        } else {
          console.warn(`Document with ID: ${id} not found.`);
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
        <Text style={{ color: "#9CA3AF", marginTop: 10 }}>Loading data...</Text>
      </View>
    );
  }

  if (!session || session.path.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#E5E7EB" }}>
          Session data not found or contains no location data.
        </Text>
      </View>
    );
  }

  const { path } = session;
  const createdAtTimestamp =
    session.startPoint?.timestamp || new Date().toISOString();

  // Calculate map region
  const initialRegion = {
    latitude: path[0]?.latitude || -8.65,
    longitude: path[0]?.longitude || 115.22,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{session.sessionName}</Text>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          // Optional: Center map to fit all path coordinates
          // onLayout={() => mapRef.current?.fitToCoordinates(path, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: false })}
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
        <Text style={styles.summaryTitle}>Session Summary</Text>
        <View style={styles.summaryRow}>
          <Ionicons name="speedometer-outline" size={18} color="#10B981" />
          <Text style={styles.summaryText}>
            Total Points: {session.totalPoints}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="swap-horizontal-outline" size={18} color="#3B82F6" />
          <Text style={styles.summaryText}>
            Average Roll: {session.avgRoll.toFixed(2)}°
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="stats-chart-outline" size={18} color="#FBBF24" />
          <Text style={styles.summaryText}>
            Average Pitch: {session.avgPitch.toFixed(2)}°
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
          <Text style={styles.summaryText}>
            Start Time: {new Date(createdAtTimestamp).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Data Table */}
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>Tilt Data per GPS Point</Text>
        {path.map((p, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableIndex}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableText}>
                Lat: {p.latitude.toFixed(5)}, Lng: {p.longitude.toFixed(5)}
              </Text>
              <Text style={styles.tableSubText}>
                Roll: {(p.roll ?? 0).toFixed(2)}°, Pitch:{" "}
                {(p.pitch ?? 0).toFixed(2)}°
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
