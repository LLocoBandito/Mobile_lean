// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import { addDoc, collection } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
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

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  roll: number;
  pitch: number;
  speed: number;
}

export default function Home() {
  const [status, setStatus] = useState<"Disconnected" | "Connected" | "Paused">(
    "Disconnected"
  );
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isBeeping, setIsBeeping] = useState(false);

  const rollRef = useRef(0);
  const pitchRef = useRef(0);
  const speedAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [subscription, setSubscription] = useState<any>(null);
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [paused, setPaused] = useState(false);

  const buttonSize = Dimensions.get("window").width / 2.4;

  // BEEP + VIBRATION
  const playBeep = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: "system_sound_id://1005" },
        { shouldPlay: true }
      );
      setTimeout(() => sound.unloadAsync(), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  useEffect(() => {
    if (currentSpeed > 120 && !isBeeping) {
      setIsBeeping(true);
      beepIntervalRef.current = setInterval(playBeep, 1000);
    } else if (currentSpeed <= 120 && isBeeping) {
      setIsBeeping(false);
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    }
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, [currentSpeed]);

  // START MONITORING
  const activateMonitoring = async () => {
    const { status: locStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (locStatus !== "granted") {
      Alert.alert("Izin Ditolak", "Lokasi diperlukan untuk monitoring!");
      return;
    }

    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const speedKmh = loc.coords.speed
          ? Math.round(loc.coords.speed * 3.6)
          : 0;
        setCurrentSpeed(speedKmh);
        Animated.timing(speedAnim, {
          toValue: Math.min(speedKmh, 145),
          duration: 300,
          useNativeDriver: false,
        }).start();

        const newPoint: LocationPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
          roll: rollRef.current,
          pitch: pitchRef.current,
          speed: speedKmh,
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

      rollRef.current = Math.round(clampedRoll);
      pitchRef.current = Math.round(pitchDeg);
      setDisplayRoll(rollRef.current);
      setDisplayPitch(pitchRef.current);

      Animated.timing(rotateAnim, {
        toValue: clampedRoll,
        duration: 120,
        useNativeDriver: true,
      }).start();
    });
    setSubscription(sub);
  };

  const startMonitoring = async () => {
    if (subscription) subscription.remove();
    if (locationWatcher) locationWatcher.remove();
    setLocationPoints([]);
    setCurrentSpeed(0);
    setDisplayRoll(0);
    setDisplayPitch(0);
    await activateMonitoring();
    setStatus("Connected");
    setPaused(false);
  };

  const stopMonitoring = () => {
    subscription?.remove();
    locationWatcher?.remove();
    setSubscription(null);
    setLocationWatcher(null);
    setStatus("Disconnected");
    setCurrentSpeed(0);
    setDisplayRoll(0);
    setDisplayPitch(0);
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const togglePause = async () => {
    if (paused) {
      await activateMonitoring();
      setPaused(false);
      setStatus("Connected");
    } else {
      subscription?.remove();
      locationWatcher?.remove();
      setSubscription(null);
      setLocationWatcher(null);
      setPaused(true);
      setStatus("Paused");
    }
  };

  const saveData = async () => {
    if (locationPoints.length === 0) {
      Alert.alert("Kosong", "Tidak ada data untuk disimpan!");
      return;
    }
    stopMonitoring();

    let sumR = 0,
      sumL = 0,
      cntR = 0,
      cntL = 0,
      maxR = 0,
      maxL = 0,
      sumP = 0;
    locationPoints.forEach((p) => {
      sumP += p.pitch;
      if (p.roll > 0) {
        sumR += p.roll;
        cntR++;
        if (p.roll > maxR) maxR = p.roll;
      } else if (p.roll < 0) {
        const abs = Math.abs(p.roll);
        sumL += abs;
        cntL++;
        if (abs > maxL) maxL = abs;
      }
    });

    try {
      await addDoc(collection(db, "monitoring_sessions"), {
        sessionName: `Session_${new Date()
          .toISOString()
          .replace(/[:.]/g, "_")}`,
        totalPoints: locationPoints.length,
        path: locationPoints,
        maxRollRight: Math.round(maxR),
        maxRollLeft: Math.round(maxL),
        avgRollRight: cntR > 0 ? (sumR / cntR).toFixed(1) : "0",
        avgRollLeft: cntL > 0 ? (sumL / cntL).toFixed(1) : "0",
        avgPitch: (sumP / locationPoints.length).toFixed(1),
        startPoint: locationPoints[0],
        endPoint: locationPoints[locationPoints.length - 1],
        status: "Completed",
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Sukses!", "Data sesi berhasil disimpan ke Firebase!");
      setLocationPoints([]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [-50, 50],
    outputRange: ["-50deg", "50deg"],
  });

  const getArcPath = (angle: number) => {
    const r = 120,
      cx = 150,
      cy = 150;
    const sweep = (angle / 50) * 120;
    const start = { x: cx, y: cy - r };
    const endX = cx + r * Math.sin((sweep * Math.PI) / 180);
    const endY = cy - r * Math.cos((sweep * Math.PI) / 180);
    const large = Math.abs(sweep) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} ${
      sweep > 0 ? 1 : 0
    } ${endX} ${endY}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <ScrollView contentContainerStyle={styles.container}>
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

        {currentSpeed > 120 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={28} color="#fff" />
            <Text style={styles.warningText}>KECEPATAN BERLEBIH!</Text>
          </View>
        )}

        <View style={styles.speedContainer}>
          <View style={styles.speedHeader}>
            <Ionicons name="speedometer" size={30} color="#FBBF24" />
            <Text style={styles.speedText}>{currentSpeed} km/h</Text>
          </View>
          <View style={styles.speedBarBg}>
            <Animated.View
              style={[
                styles.speedBarFill,
                {
                  width: speedAnim.interpolate({
                    inputRange: [0, 145],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor:
                    currentSpeed < 60
                      ? "#10B981"
                      : currentSpeed < 100
                      ? "#FBBF24"
                      : "#EF4444",
                },
              ]}
            />
          </View>
          <View style={styles.speedLabels}>
            <Text style={styles.speedLabel}>0</Text>
            <Text style={styles.speedLabel}>145 km/h</Text>
          </View>
        </View>

        <View style={styles.visualContainer}>
          <Svg height="200" width="300">
            <Path
              d="M30 150 A120 120 0 0 1 270 150"
              stroke="#1F2937"
              strokeWidth="10"
              fill="none"
            />
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
          <Text style={styles.pitchText}>Pitch: {displayPitch}°</Text>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={{ flex: 1 }}
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
                  title="Now"
                  pinColor="red"
                />
              </>
            )}
          </MapView>
        </View>

        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: "#10B981", width: buttonSize },
            ]}
            onPress={startMonitoring}
            disabled={status === "Connected"}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.mainBtnText}>Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: "#FBBF24", width: buttonSize },
            ]}
            onPress={togglePause}
            disabled={!paused && status !== "Connected"}
          >
            <Ionicons name={paused ? "play" : "pause"} size={24} color="#fff" />
            <Text style={styles.mainBtnText}>
              {paused ? "Lanjut" : "Pause"}
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
            <Ionicons name="save" size={24} color="#fff" />
            <Text style={styles.mainBtnText}>Simpan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: "#EF4444", width: buttonSize },
            ]}
            onPress={stopMonitoring}
          >
            <Ionicons name="stop" size={24} color="#fff" />
            <Text style={styles.mainBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#0F172A" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#F9FAFB" },
  statusBadge: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  statusText: { color: "#fff", fontWeight: "700" },

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 10,
  },
  warningText: { color: "#fff", fontSize: 19, fontWeight: "800" },

  speedContainer: { marginVertical: 20 },
  speedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  speedText: { fontSize: 38, fontWeight: "900", color: "#FBBF24" },
  speedBarBg: {
    height: 38,
    backgroundColor: "#1F2937",
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#334155",
  },
  speedBarFill: { height: "100%", borderRadius: 17 },
  speedLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  speedLabel: { color: "#9CA3AF", fontSize: 13 },

  visualContainer: { alignItems: "center", marginVertical: 30 },
  angleText: {
    fontSize: 44,
    fontWeight: "900",
    color: "#E5E7EB",
    position: "absolute",
    top: 68,
  },
  bikeContainer: { marginTop: -75 },
  bike: {
    width: 46,
    height: 104,
    backgroundColor: "#F3F4F6",
    borderRadius: 23,
  },
  statusDirection: {
    color: "#E5E7EB",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
  },
  pitchText: { color: "#9CA3AF", fontSize: 17, marginTop: 8 },

  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 20,
  },

  controlButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginVertical: 20,
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  mainBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
