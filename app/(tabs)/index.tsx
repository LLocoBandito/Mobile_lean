import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as ScreenOrientation from "expo-screen-orientation";
import { Accelerometer } from "expo-sensors";
import { addDoc, collection } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { db } from "../../utils/firebaseConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  roll: number;
  pitch: number;
  speed: number;
}

type ColorScheme = "dark" | "light";
type OrientationMode = "Portrait" | "Landscape";

export default function Home() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("Portrait");
  const [status, setStatus] = useState<"Disconnected" | "Connected" | "Paused">(
    "Disconnected"
  );
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isBeeping, setIsBeeping] = useState(false);

  // Akselerasi
  const [accelTimes, setAccelTimes] = useState({
    zeroTo60: null as number | null,
    sixtyTo100: null as number | null,
    hundredTo150: null as number | null,
  });

  const rollRef = useRef(0);
  const pitchRef = useRef(0);
  const speedAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeedRef = useRef(0);
  const accelStartTimeRef = useRef<number | null>(null);
  const currentSegmentRef = useRef<"0-60" | "60-100" | "100-150" | null>(null);

  const [subscription, setSubscription] = useState<any>(null);
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [paused, setPaused] = useState(false);

  // === WARNA DINAMIS (KONTRAST EKSTREM) ===
  const isDark = colorScheme === "dark";

  const colors = {
    // NIGHT MODE (Dark, Soft)
    // SUN MODE (Light/Negative Display, Hard Black/White)

    BG_PRIMARY: isDark ? "#0F172A" : "#000000",
    BG_CARD: isDark
      ? "rgba(30, 41, 59, 0.95)" // Dark: elemen gelap transparan
      : "#111111", // Light (Negative): elemen sangat gelap solid

    TEXT_PRIMARY: isDark ? "#E2E8F0" : "#FFFFFF", // Dark: Putih kebiruan, Light: Putih murni
    TEXT_SECONDARY: isDark ? "#94A3B8" : "#AAAAAA", // Dark: Abu-abu, Light: Abu-abu terang

    BORDER: isDark ? "#475569" : "#333333", // Batas yang berbeda kecerahannya

    // Warna Aksen tetap cerah dan memiliki kontras tinggi di kedua mode
    ACCENT_SAFE: "#10B981",
    ACCENT_WARNING: "#F59E0B",
    ACCENT_DANGER: "#EF4444",
    ACCENT_INFO: "#3B82F6",
  };

  // === Implementasi fungsi lainnya tetap sama ===

  // === BEEP & HAPTICS ===
  useEffect(() => {
    if (currentSpeed > 120 && !isBeeping) {
      setIsBeeping(true);
      beepIntervalRef.current = setInterval(
        () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
        800
      );
    } else if (currentSpeed <= 120 && isBeeping) {
      setIsBeeping(false);
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    }
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, [currentSpeed]);

  // === MONITORING LOGIC DENGAN AKSELERASI ===
  const activateMonitoring = async () => {
    const { status: permStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Izin Ditolak", "Lokasi diperlukan untuk monitoring!");
      return;
    }

    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (loc) => {
        const speed = loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : 0;
        const prevSpeed = lastSpeedRef.current;
        setCurrentSpeed(speed);
        lastSpeedRef.current = speed;

        Animated.timing(speedAnim, {
          toValue: Math.min(speed, 160),
          duration: 400,
          useNativeDriver: false,
        }).start();

        if (status === "Connected") {
          if (
            speed > 10 &&
            !accelStartTimeRef.current &&
            !accelTimes.zeroTo60
          ) {
            accelStartTimeRef.current = Date.now();
            currentSegmentRef.current = "0-60";
          }

          if (prevSpeed < 60 && speed >= 60 && !accelTimes.zeroTo60) {
            const time = accelStartTimeRef.current
              ? (Date.now() - accelStartTimeRef.current) / 1000
              : null;
            setAccelTimes((prev) => ({ ...prev, zeroTo60: time || 0 }));
            accelStartTimeRef.current = Date.now();
            currentSegmentRef.current = "60-100";
          } else if (
            prevSpeed < 100 &&
            speed >= 100 &&
            accelTimes.zeroTo60 &&
            !accelTimes.sixtyTo100
          ) {
            const time = accelStartTimeRef.current
              ? (Date.now() - accelStartTimeRef.current) / 1000
              : null;
            setAccelTimes((prev) => ({ ...prev, sixtyTo100: time || 0 }));
            accelStartTimeRef.current = Date.now();
            currentSegmentRef.current = "100-150";
          } else if (
            prevSpeed < 150 &&
            speed >= 150 &&
            accelTimes.sixtyTo100 &&
            !accelTimes.hundredTo150
          ) {
            const time = accelStartTimeRef.current
              ? (Date.now() - accelStartTimeRef.current) / 1000
              : null;
            setAccelTimes((prev) => ({ ...prev, hundredTo150: time || 0 }));
            currentSegmentRef.current = null;
          }
        }

        setLocationPoints((prev) => [
          ...prev,
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: new Date().toISOString(),
            roll: rollRef.current,
            pitch: pitchRef.current,
            speed,
          },
        ]);
      }
    );
    setLocationWatcher(watcher);

    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      let rollRad: number, pitchRad: number;
      if (orientationMode === "Portrait") {
        rollRad = Math.atan2(-x, z);
        pitchRad = Math.atan2(y, Math.sqrt(x * x + z * z));
      } else {
        rollRad = Math.atan2(y, z);
        pitchRad = Math.atan2(-x, Math.sqrt(y * y + z * z));
      }

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
    if (subscription || locationWatcher) stopMonitoring();
    setLocationPoints([]);
    setCurrentSpeed(0);
    setDisplayRoll(0);
    setDisplayPitch(0);
    setAccelTimes({ zeroTo60: null, sixtyTo100: null, hundredTo150: null });
    accelStartTimeRef.current = null;
    currentSegmentRef.current = null;
    lastSpeedRef.current = 0;

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
    setLocationPoints([]);
    setCurrentSpeed(0);
  };

  const togglePause = async () => {
    if (paused) {
      await activateMonitoring();
      setPaused(false);
      setStatus("Connected");
    } else {
      subscription?.remove();
      locationWatcher?.remove();
      setPaused(true);
      setStatus("Paused");
    }
  };

  const saveData = async () => {
    if (locationPoints.length < 1) {
      Alert.alert("Data Kurang", "Minimal 1 titik GPS!");
      return;
    }
    stopMonitoring();

    try {
      await addDoc(collection(db, "monitoring_sessions"), {
        sessionName: `Lean Session ${new Date().toLocaleString("id-ID")}`,
        totalPoints: locationPoints.length,
        path: locationPoints,
        startPoint: locationPoints[0],
        endPoint: locationPoints[locationPoints.length - 1],
        accel_0_60: accelTimes.zeroTo60,
        accel_60_100: accelTimes.sixtyTo100,
        accel_100_150: accelTimes.hundredTo150,
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Sukses!", "Data + waktu akselerasi tersimpan!");
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

  const getSpeedBarColor = () =>
    currentSpeed < 60
      ? colors.ACCENT_SAFE
      : currentSpeed < 100
      ? colors.ACCENT_WARNING
      : colors.ACCENT_DANGER;
  const getRollPathColor = () =>
    displayRoll === 0
      ? colors.TEXT_SECONDARY
      : displayRoll > 0
      ? colors.ACCENT_SAFE
      : colors.ACCENT_DANGER;

  const toggleTheme = () => {
    setColorScheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const toggleOrientation = async () => {
    if (orientationMode === "Portrait") {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
      );
      setOrientationMode("Landscape");
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      setOrientationMode("Portrait");
    }
    if (status === "Connected" || status === "Paused") {
      stopMonitoring();
      setTimeout(startMonitoring, 500);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BG_PRIMARY }}>
      {/* StatusBar selalu light-content karena BG selalu gelap (atau sangat gelap) */}
      <StatusBar
        barStyle={"light-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={{ flex: 1 }}>
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            // Overlay tetap gelap di kedua mode
            backgroundColor: isDark
              ? "rgba(30, 41, 59, 0.4)"
              : "rgba(0, 0, 0, 0.4)",
          }}
          pointerEvents="none"
        />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={{ ...styles.title, color: colors.TEXT_PRIMARY }}>
              PrimeLean Monitor
            </Text>
            <View
              style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
            >
              <TouchableOpacity
                onPress={toggleOrientation}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.1)",
                  },
                ]}
              >
                <Ionicons
                  name={
                    orientationMode === "Portrait"
                      ? "phone-portrait"
                      : "phone-landscape"
                  }
                  size={28}
                  color={colors.TEXT_PRIMARY}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleTheme}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.1)",
                  },
                ]}
              >
                <Ionicons
                  name={colorScheme === "dark" ? "moon" : "sunny"}
                  size={28}
                  color={colors.TEXT_PRIMARY}
                />
              </TouchableOpacity>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      status === "Connected"
                        ? colors.ACCENT_SAFE
                        : status === "Paused"
                        ? colors.ACCENT_WARNING
                        : colors.ACCENT_DANGER,
                  },
                ]}
              >
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </View>
          </View>

          {/* Speedometer */}
          <View
            style={[
              styles.speedCard,
              { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
            ]}
          >
            <Text style={{ color: colors.TEXT_SECONDARY, fontSize: 18 }}>
              KECEPATAN
            </Text>
            <Text
              style={{
                color: colors.TEXT_PRIMARY,
                fontSize: 90,
                fontWeight: "900",
              }}
            >
              {currentSpeed}
            </Text>
            <Text
              style={{
                color: colors.ACCENT_INFO,
                fontSize: 24,
                fontWeight: "bold",
              }}
            >
              km/h
            </Text>
            <View
              style={[
                styles.speedBarContainer,
                { backgroundColor: isDark ? "#1E293B" : "#111111" },
              ]}
            >
              <Animated.View
                style={[
                  styles.speedBar,
                  {
                    width: speedAnim.interpolate({
                      inputRange: [0, 160],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: getSpeedBarColor(),
                  },
                ]}
              />
            </View>
          </View>

          {/* Waktu Akselerasi */}
          <View
            style={[
              styles.accelCard,
              { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
            ]}
          >
            <Text style={{ ...styles.cardTitle, color: colors.TEXT_PRIMARY }}>
              Waktu Akselerasi
            </Text>
            <View style={styles.accelRow}>
              <Text
                style={[styles.accelLabel, { color: colors.TEXT_SECONDARY }]}
              >
                0 → 60 km/h
              </Text>
              <Text
                style={[
                  styles.accelValue,
                  {
                    color: accelTimes.zeroTo60
                      ? "#10B981"
                      : colors.TEXT_SECONDARY,
                  },
                ]}
              >
                {accelTimes.zeroTo60 !== null
                  ? `${accelTimes.zeroTo60.toFixed(2)}s`
                  : "-"}
              </Text>
            </View>
            <View style={styles.accelRow}>
              <Text
                style={[styles.accelLabel, { color: colors.TEXT_SECONDARY }]}
              >
                60 → 100 km/h
              </Text>
              <Text
                style={[
                  styles.accelValue,
                  {
                    color: accelTimes.sixtyTo100
                      ? "#3B82F6"
                      : colors.TEXT_SECONDARY,
                  },
                ]}
              >
                {accelTimes.sixtyTo100 !== null
                  ? `${accelTimes.sixtyTo100.toFixed(2)}s`
                  : "-"}
              </Text>
            </View>
            <View style={styles.accelRow}>
              <Text
                style={[styles.accelLabel, { color: colors.TEXT_SECONDARY }]}
              >
                100 → 150 km/h
              </Text>
              <Text
                style={[
                  styles.accelValue,
                  {
                    color: accelTimes.hundredTo150
                      ? "#EF4444"
                      : colors.TEXT_SECONDARY,
                  },
                ]}
              >
                {accelTimes.hundredTo150 !== null
                  ? `${accelTimes.hundredTo150.toFixed(2)}s`
                  : "-"}
              </Text>
            </View>
          </View>

          {/* Horizontal Scroll: Roll + Map */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            style={{ marginVertical: 20 }}
          >
            {/* Roll */}
            <View
              style={[
                styles.rollCard,
                { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
              ]}
            >
              <Text style={{ ...styles.cardTitle, color: colors.TEXT_PRIMARY }}>
                Sudut Kemiringan (Roll)
              </Text>
              <Svg height="200" width="300">
                <Path
                  d="M30 150 A120 120 0 0 1 270 150"
                  stroke={colors.BORDER}
                  strokeWidth="10"
                  fill="none"
                />
                <Path
                  d={getArcPath(displayRoll)}
                  stroke={getRollPathColor()}
                  strokeWidth="10"
                  fill="none"
                />
              </Svg>
              <Text style={{ ...styles.angleText, color: colors.TEXT_PRIMARY }}>
                {Math.abs(displayRoll)}°
              </Text>
              <Animated.View
                style={[
                  styles.bikeContainer,
                  { transform: [{ rotate: rotation }] },
                ]}
              >
                <View
                  style={[
                    styles.bike,
                    { backgroundColor: colors.TEXT_PRIMARY },
                  ]}
                />
              </Animated.View>
              <Text
                style={{
                  ...styles.statusDirection,
                  color: colors.TEXT_SECONDARY,
                  marginTop: 20,
                }}
              >
                {displayRoll === 0
                  ? "Center"
                  : displayRoll > 0
                  ? "Tilting Right"
                  : "Tilting Left"}
              </Text>
              <Text style={{ color: colors.TEXT_SECONDARY }}>
                Pitch: {displayPitch}°
              </Text>
            </View>

            {/* Map */}
            <View
              style={[
                styles.mapCard,
                { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
              ]}
            >
              <Text style={{ ...styles.cardTitle, color: colors.TEXT_PRIMARY }}>
                Peta Perjalanan
              </Text>
              <MapView
                // MapView tidak dapat diubah warnanya menjadi negative display dengan mudah
                // Jadi, kita biarkan default atau menggunakan mapStyle yang gelap
                style={styles.map}
                region={
                  locationPoints.length > 0
                    ? {
                        latitude:
                          locationPoints[locationPoints.length - 1].latitude,
                        longitude:
                          locationPoints[locationPoints.length - 1].longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }
                    : undefined
                }
              >
                {locationPoints.length > 0 && (
                  <>
                    <Polyline
                      coordinates={locationPoints}
                      strokeWidth={6}
                      strokeColor={colors.ACCENT_INFO}
                    />
                    <Marker
                      coordinate={locationPoints[0]}
                      title="Start"
                      pinColor="#10B981"
                    />
                    <Marker
                      coordinate={locationPoints[locationPoints.length - 1]}
                      title="Sekarang"
                      pinColor="#EF4444"
                    />
                  </>
                )}
              </MapView>
              <Text
                style={{
                  color: colors.TEXT_SECONDARY,
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                Titik: {locationPoints.length}
              </Text>
            </View>
          </ScrollView>

          {/* Control Buttons */}
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.controlBtn, styles.startBtn]}
              onPress={startMonitoring}
              disabled={status === "Connected"}
            >
              <Ionicons name="play-circle" size={40} color="#fff" />
              <Text style={styles.btnText}>MULAI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.pauseBtn]}
              onPress={togglePause}
              disabled={status === "Disconnected"}
            >
              <Ionicons
                name={paused ? "play-circle" : "pause-circle"}
                size={40}
                color="#fff"
              />
              <Text style={styles.btnText}>{paused ? "LANJUT" : "PAUSE"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.saveBtn]}
              onPress={saveData}
              disabled={locationPoints.length === 0}
            >
              <Ionicons name="cloud-upload" size={40} color="#fff" />
              <Text style={styles.btnText}>SIMPAN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.stopBtn]}
              onPress={stopMonitoring}
            >
              <Ionicons name="stop-circle" size={40} color="#fff" />
              <Text style={styles.btnText}>STOP</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
  },
  title: { fontSize: 30, fontWeight: "900" },
  iconBtn: {
    padding: 10,
    borderRadius: 16,
  },
  statusBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  speedCard: {
    margin: 20,
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 25,
  },
  speedBarContainer: {
    width: "100%",
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 24,
  },
  speedBar: { height: "100%", borderRadius: 15 },

  accelCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 25,
  },
  accelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  accelLabel: { fontSize: 16 },
  accelValue: { color: "#F8FAFC", fontSize: 18, fontWeight: "bold" },

  rollCard: {
    width: SCREEN_WIDTH - 40,
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 25,
  },
  mapCard: {
    width: SCREEN_WIDTH - 40,
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 25,
  },
  cardTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  angleText: { fontSize: 52, fontWeight: "900", position: "absolute", top: 60 },
  bikeContainer: { marginTop: -75 },
  bike: { width: 46, height: 104, borderRadius: 23 },
  statusDirection: { fontSize: 18, fontWeight: "600", marginTop: 10 },
  map: { width: "100%", height: 340, borderRadius: 24 },

  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    padding: 30,
    paddingBottom: 80,
  },
  controlBtn: {
    width: 110,
    height: 110,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 25,
  },
  startBtn: { backgroundColor: "#10B981" },
  pauseBtn: { backgroundColor: "#F59E0B" },
  saveBtn: { backgroundColor: "#3B82F6" },
  stopBtn: { backgroundColor: "#EF4444" },
  btnText: { color: "#fff", fontWeight: "bold", marginTop: 10, fontSize: 15 },
});
