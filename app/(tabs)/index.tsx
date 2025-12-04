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
// Sesuaikan path import firebaseConfig Anda
import { db } from "../../utils/firebaseConfig";

// Data structure
interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  roll: number; // Dibuat non-opsional karena sekarang selalu terisi (minimal 0)
  pitch: number; // Dibuat non-opsional karena sekarang selalu terisi (minimal 0)
}

export default function Home() {
  const [status, setStatus] = useState<"Disconnected" | "Connected" | "Paused">(
    "Disconnected"
  );

  // STATE BARU untuk Tampilan/Visualisasi UI
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);

  // REF untuk menyimpan nilai sensor terbaru secara SINKRON
  const rollRef = useRef(0);
  const pitchRef = useRef(0);

  const [subscription, setSubscription] = useState<{
    remove: () => void;
  } | null>(null);
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [paused, setPaused] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const buttonSize = Dimensions.get("window").width / 2.4;

  // ------------------ Activate Sensor & Location ------------------
  const activateMonitoring = async () => {
    const { status: locStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (locStatus !== "granted") {
      Alert.alert(
        "Permission Required",
        "Location permission is required to track position!"
      );
      return;
    }

    // LOCATION WATCHER: Mengambil nilai sensor dari REF
    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 1 },
      (loc) => {
        const newPoint: LocationPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
          // GUNAKAN REF untuk mendapatkan nilai sensor terbaru
          roll: rollRef.current,
          pitch: pitchRef.current,
        };
        setLocationPoints((prev) => [...prev, newPoint]);
      }
    );
    setLocationWatcher(watcher);

    // ACCELEROMETER LISTENER: Memperbarui REF dan STATE UI
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const rollRad = Math.atan2(-x, z);
      const pitchRad = Math.atan2(y, Math.sqrt(x * x + z * z));
      const rollDeg = (rollRad * 180) / Math.PI;
      const pitchDeg = (pitchRad * 180) / Math.PI;
      const clampedRoll = Math.max(-50, Math.min(50, rollDeg));

      // 1. Perbarui REF secara sinkron (untuk Location Watcher)
      rollRef.current = Math.round(clampedRoll);
      pitchRef.current = Math.round(pitchDeg);

      // 2. Perbarui STATE untuk tampilan UI
      setDisplayRoll(rollRef.current);
      setDisplayPitch(pitchRef.current);

      Animated.timing(rotateAnim, {
        toValue: clampedRoll,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
    setSubscription(sub as { remove: () => void });
  };

  // ------------------ Start Button ------------------
  const startMonitoring = async () => {
    if (subscription) subscription.remove();
    if (locationWatcher) locationWatcher.remove();

    // Reset REF dan STATE UI
    rollRef.current = 0;
    pitchRef.current = 0;
    setDisplayRoll(0);
    setDisplayPitch(0);

    setLocationPoints([]);
    await activateMonitoring();
    setStatus("Connected");
    setPaused(false);
  };

  // ------------------ Stop Button ------------------
  const stopMonitoring = () => {
    if (subscription) subscription.remove();
    if (locationWatcher) locationWatcher.remove();
    setSubscription(null);
    setLocationWatcher(null);
    setStatus("Disconnected");

    // Reset STATE UI
    setDisplayRoll(0);
    setDisplayPitch(0);

    // Tidak perlu mereset REF karena akan direset di startMonitoring

    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  // ------------------ Pause / Continue Button ------------------
  const togglePause = async () => {
    if (paused) {
      // CONTINUE
      await activateMonitoring();
      setPaused(false);
      setStatus("Connected");
    } else {
      // PAUSE
      if (subscription) subscription.remove();
      if (locationWatcher) locationWatcher.remove();
      setSubscription(null);
      setLocationWatcher(null);
      setPaused(true);
      setStatus("Paused");
    }
  };

  // ------------------ Save to Firebase ------------------
  // ------------------ Save to Firebase (DENGAN DATA KEMIRINGAN KANAN & KIRI) ------------------
  const saveData = async () => {
    if (locationPoints.length === 0) {
      Alert.alert("Perhatian", "Belum ada data lokasi/sensor untuk disimpan!");
      return;
    }

    if (status === "Connected") stopMonitoring();

    try {
      // Hitung statistik kemiringan kanan & kiri
      let sumRollRight = 0;
      let sumRollLeft = 0;
      let countRight = 0;
      let countLeft = 0;
      let maxRollRight = 0;
      let maxRollLeft = 0;

      let sumPitch = 0;

      locationPoints.forEach((point) => {
        const roll = point.roll;
        const pitch = point.pitch;

        sumPitch += pitch;

        if (roll > 0) {
          // Miring ke KANAN
          sumRollRight += roll;
          countRight++;
          if (roll > maxRollRight) maxRollRight = roll;
        } else if (roll < 0) {
          // Miring ke KIRI
          const absRoll = Math.abs(roll);
          sumRollLeft += absRoll;
          countLeft++;
          if (absRoll > maxRollLeft) maxRollLeft = absRoll;
        }
      });

      const avgRollRight =
        countRight > 0 ? (sumRollRight / countRight).toFixed(1) : "0";
      const avgRollLeft =
        countLeft > 0 ? (sumRollLeft / countLeft).toFixed(1) : "0";
      const avgPitch = (sumPitch / locationPoints.length).toFixed(1);

      const data = {
        sessionName: `Session_${new Date()
          .toISOString()
          .replace(/[:.]/g, "_")}`,
        totalPoints: locationPoints.length,
        path: locationPoints,

        // DATA BARU: KEMIRINGAN KANAN & KIRI
        maxRollRight: Math.round(maxRollRight),
        maxRollLeft: Math.round(maxRollLeft),
        avgRollRight: avgRollRight,
        avgRollLeft: avgRollLeft,

        // Yang lama tetap ada
        avgPitch: avgPitch,
        avgRoll: // ini yang lama, bisa dihapus nanti kalau mau
        (
          locationPoints.reduce((sum, p) => sum + p.roll, 0) /
          locationPoints.length
        ).toFixed(1),

        startPoint: locationPoints[0],
        endPoint: locationPoints[locationPoints.length - 1],
        status: "Completed",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "monitoring_sessions"), data);
      console.log("Data tersimpan dengan ID:", docRef.id);
      Alert.alert("Sukses", "Data sesi berhasil disimpan!");
      setLocationPoints([]);
    } catch (error: any) {
      console.error("Gagal simpan:", error);
      Alert.alert("Gagal", "Tidak dapat menyimpan data: " + error.message);
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

        {/* Visualization */}
        <View style={styles.visualContainer}>
          <Svg height="200" width="300">
            {/* Background Arc */}
            <Path
              d="M30 150 A120 120 0 0 1 270 150"
              stroke="#1F2937"
              strokeWidth="10"
              fill="none"
            />
            {/* Active Roll Arc */}
            <Path
              d={getArcPath(displayRoll)}
              stroke={
                displayRoll === 0
                  ? "#9CA3AF"
                  : displayRoll > 0
                  ? "#10B981"
                  : "#EF4444"
              }
              strokeWidth="10"
              fill="none"
            />
          </Svg>
          {/* Menggunakan displayRoll untuk UI */}
          <Text style={styles.angleText}>{Math.abs(displayRoll)}°</Text>
          <Animated.View
            style={[
              styles.bikeContainer,
              { transform: [{ rotate: rotation }] },
            ]}
          >
            <View style={styles.bike} />
          </Animated.View>
          <Text style={styles.statusDirection}>
            {displayRoll === 0
              ? "Center"
              : displayRoll > 0
              ? "Tilting Right"
              : "Tilting Left"}
          </Text>
          {/* Menggunakan displayPitch untuk UI */}
          <Text style={styles.pitchText}>Pitch: {displayPitch}°</Text>
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

        {/* Control Buttons */}
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
