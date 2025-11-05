import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { addDoc, collection } from "firebase/firestore";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { db } from "../../utils/firebaseConfig";

// Struktur data
interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  roll?: number;
  pitch?: number;
}

export default function Home() {
  const [status, setStatus] = useState<"Disconnected" | "Connected" | "Paused">(
    "Disconnected"
  );
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [subscription, setSubscription] = useState<{
    remove: () => void;
  } | null>(null);
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [paused, setPaused] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const buttonSize = Dimensions.get("window").width / 2.4;

  // ------------------ Aktivasi Sensor & Lokasi ------------------
  const activateMonitoring = async () => {
    const { status: locStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (locStatus !== "granted") {
      Alert.alert(
        "Izin Diperlukan",
        "Izin lokasi diperlukan untuk melacak posisi!"
      );
      return;
    }

    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
      (loc) => {
        const newPoint: LocationPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
          roll,
          pitch,
        };
        setLocationPoints((prev) => [...prev, newPoint]);
      }
    );
    setLocationWatcher(watcher);

    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const rollRad = Math.atan2(-x, z);
      const pitchRad = Math.atan2(y, Math.sqrt(x * x + z * z));
      const rollDeg = (rollRad * 180) / Math.PI;
      const pitchDeg = (pitchRad * 180) / Math.PI;
      const clampedRoll = Math.max(-50, Math.min(50, rollDeg));

      setRoll(Math.round(clampedRoll));
      setPitch(Math.round(pitchDeg));

      Animated.timing(rotateAnim, {
        toValue: clampedRoll,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
    setSubscription(sub as { remove: () => void });
  };

  // ------------------ Tombol Start ------------------
  const startMonitoring = async () => {
    if (subscription) subscription.remove();
    if (locationWatcher) locationWatcher.remove();

    setLocationPoints([]);
    await activateMonitoring();
    setStatus("Connected");
    setPaused(false);
  };

  // ------------------ Tombol Stop ------------------
  const stopMonitoring = () => {
    if (subscription) subscription.remove();
    if (locationWatcher) locationWatcher.remove();
    setSubscription(null);
    setLocationWatcher(null);
    setStatus("Disconnected");
    setRoll(0);
    setPitch(0);
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  // ------------------ Tombol Pause / Continue ------------------
  const togglePause = async () => {
    if (paused) {
      await activateMonitoring();
      setPaused(false);
      setStatus("Connected");
    } else {
      if (subscription) subscription.remove();
      if (locationWatcher) locationWatcher.remove();
      setSubscription(null);
      setLocationWatcher(null);
      setPaused(true);
      setStatus("Paused");
    }
  };

  // ------------------ Simpan ke Firebase ------------------
  const saveData = async () => {
    if (locationPoints.length === 0) {
      Alert.alert("Perhatian", "Belum ada data lokasi/sensor untuk disimpan!");
      return;
    }

    if (status === "Connected") stopMonitoring();

    try {
      const data = {
        sessionName: `Session_${new Date()
          .toISOString()
          .replace(/[:.]/g, "_")}`,
        totalPoints: locationPoints.length,
        path: locationPoints,
        avgRoll: (
          locationPoints.reduce((sum, p) => sum + (p.roll || 0), 0) /
          locationPoints.length
        ).toFixed(1),
        avgPitch: (
          locationPoints.reduce((sum, p) => sum + (p.pitch || 0), 0) /
          locationPoints.length
        ).toFixed(1),
        startPoint: locationPoints[0],
        endPoint: locationPoints[locationPoints.length - 1],
        status: "Completed",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "monitoring_sessions"), data);
      console.log("✅ Data tersimpan dengan ID:", docRef.id);
      Alert.alert("Sukses", "Data berhasil disimpan ke Firebase!");
      setLocationPoints([]);
    } catch (error) {
      console.error("❌ Gagal simpan:", error);
      Alert.alert("Gagal", "Tidak bisa menyimpan data ke Firebase!");
    }
  };

  // ------------------ Utility Arc ------------------
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angle: number
  ) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const getArcPath = (angle: number) => {
    const radius = 120,
      centerX = 150,
      centerY = 150;
    const sweep = (angle / 50) * 120;
    const mid = polarToCartesian(centerX, centerY, radius, 0);
    const end = polarToCartesian(centerX, centerY, radius, sweep);
    const largeArcFlag = Math.abs(sweep) > 180 ? 1 : 0;
    return `M ${mid.x} ${mid.y} A ${radius} ${radius} 0 ${largeArcFlag} ${
      sweep > 0 ? 1 : 0
    } ${end.x} ${end.y}`;
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [-50, 50],
    outputRange: ["-50deg", "50deg"],
  });

  const isMonitoringActive = status === "Connected" || status === "Paused";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PrimeLean Monitor</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status === "Connected"
                    ? "#10B981"
                    : status === "Paused"
                    ? "#FBBF24"
                    : "#EF4444",
              },
            ]}
          >
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {/* Visualisasi */}
        <View style={styles.visualContainer}>
          <Svg height="200" width="300">
            <Path
              d="M30 150 A120 120 0 0 1 270 150"
              stroke="#1F2937"
              strokeWidth="10"
              fill="none"
            />
            <Path
              d={getArcPath(roll)}
              stroke={roll === 0 ? "#9CA3AF" : roll > 0 ? "#10B981" : "#EF4444"}
              strokeWidth="10"
              fill="none"
            />
          </Svg>
          <Text style={styles.angleText}>{Math.abs(roll)}°</Text>
          <Animated.View
            style={[
              styles.bikeContainer,
              { transform: [{ rotate: rotation }] },
            ]}
          >
            <View style={styles.bike} />
          </Animated.View>
          <Text style={styles.statusDirection}>
            {roll === 0
              ? "Center"
              : roll > 0
              ? "Tilting Right"
              : "Tilting Left"}
          </Text>
          <Text style={styles.pitchText}>Pitch: {pitch}°</Text>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: locationPoints.at(-1)?.latitude || -8.65,
              longitude: locationPoints.at(-1)?.longitude || 115.22,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={{
              latitude: locationPoints.at(-1)?.latitude || -8.65,
              longitude: locationPoints.at(-1)?.longitude || 115.22,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {locationPoints.length > 0 && (
              <>
                <Polyline
                  coordinates={locationPoints}
                  strokeWidth={4}
                  strokeColor="#3B82F6"
                />
                <Marker
                  coordinate={locationPoints[0]}
                  title="Start"
                  pinColor="green"
                />
                <Marker
                  coordinate={locationPoints.at(-1)!}
                  title="Current"
                  pinColor="red"
                />
              </>
            )}
          </MapView>
        </View>

        {/* Tombol kontrol */}
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: "#10B981", width: buttonSize },
            ]}
            onPress={startMonitoring}
            disabled={status === "Connected"}
          >
            <Ionicons name="play-outline" size={20} color="#fff" />
            <Text style={styles.mainBtnText}>Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: "#FBBF24", width: buttonSize },
            ]}
            onPress={togglePause}
            disabled={!isMonitoringActive}
          >
            <Ionicons
              name={paused ? "play-outline" : "pause-outline"}
              size={20}
              color="#fff"
            />
            <Text style={styles.mainBtnText}>
              {paused ? "Continue" : "Pause"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              {
                backgroundColor:
                  locationPoints.length > 0 ? "#3B82F6" : "#6B7280",
                width: buttonSize,
              },
            ]}
            onPress={saveData}
            disabled={locationPoints.length === 0}
          >
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.mainBtnText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: "#EF4444", width: buttonSize },
            ]}
            onPress={stopMonitoring}
          >
            <Ionicons name="stop-outline" size={20} color="#fff" />
            <Text style={styles.mainBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------------ Styles ------------------
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#F9FAFB" },
  statusBadge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  statusText: { color: "#fff", fontWeight: "600" },
  visualContainer: { alignItems: "center", marginTop: 40 },
  angleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E5E7EB",
    position: "absolute",
    top: 60,
    left: 55,
  },
  pitchText: { color: "#9CA3AF", marginTop: 10, fontSize: 16 },
  bikeContainer: { marginTop: -60 },
  bike: { width: 40, height: 90, backgroundColor: "#F3F4F6", borderRadius: 20 },
  statusDirection: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "500",
    marginTop: 15,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 30,
  },
  controlButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 35,
    gap: 12,
  },
  mainBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  mainBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
