// Home.tsx (full) - UI revised: aligned speed & roll cards, fixed disconnected border, pressed button states
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
  GestureResponderEvent,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
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
  // ---------- Logic & State (UNCHANGED) ----------
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

  // ---------- Theme Colors (updated for premium look) ----------
  const isDark = colorScheme === "dark";

  const colors = {
    BG_PRIMARY: isDark ? "#04060b" : "#F7F8FB",
    BG_CARD: isDark ? "rgba(18,20,26,0.95)" : "#FFFFFF",
    TEXT_PRIMARY: isDark ? "#E6EDF3" : "#0B1220",
    TEXT_SECONDARY: isDark ? "#9AA6B2" : "#6B7280",
    BORDER: isDark ? "rgba(255,255,255,0.06)" : "rgba(11,18,32,0.06)",
    ACCENT_SAFE: "#00D084",
    ACCENT_WARNING: "#FFB020",
    ACCENT_DANGER: "#FF5A5F",
    ACCENT_INFO: "#48A9FF",
    GLASS: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
  };

  // ---------- Pressed button visual state ----------
  const [activeButton, setActiveButton] = useState<
    "start" | "pause" | "save" | "stop" | null
  >(null);

  const onPressIn = (key: "start" | "pause" | "save" | "stop") =>
    setActiveButton(key);
  const onPressOut = (key: "start" | "pause" | "save" | "stop") =>
    setActiveButton((prev) => (prev === key ? null : prev));

  // ---------- BEEP & HAPTICS (unchanged) ----------
  useEffect(() => {
    if (currentSpeed > 120 && !isBeeping) {
      setIsBeeping(true);
      beepIntervalRef.current = setInterval(
        () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
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

  // ---------- Monitoring Logic (unchanged) ----------
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

  // ---------- Presentation Helpers ----------
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

  // ---------- PREMIUM UI (only visual, logic preserved) ----------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BG_PRIMARY }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Top overlay (kept simple - no invalid linear-gradient string) */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isDark ? "transparent" : "transparent",
        }}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: 44 }]}>
          <View>
            <Text style={[styles.title, { color: colors.TEXT_PRIMARY }]}>
              PrimeLean Monitor
            </Text>
            <Text style={{ color: colors.TEXT_SECONDARY, marginTop: 6 }}>
              Real-time vehicle telemetry
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={toggleOrientation}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.GLASS,
                  borderColor: colors.BORDER,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons
                name={
                  orientationMode === "Portrait"
                    ? "phone-portrait"
                    : "phone-landscape"
                }
                size={20}
                color={colors.TEXT_PRIMARY}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.GLASS,
                  borderColor: colors.BORDER,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons
                name={colorScheme === "dark" ? "moon" : "sunny"}
                size={20}
                color={colors.TEXT_PRIMARY}
              />
            </TouchableOpacity>

            {/* Status pill: ensure not cut by using zIndex and padding */}
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
                  marginLeft: 10,
                  zIndex: 10,
                },
              ]}
            >
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>
        </View>

        {/* ===== TOP ROW: Speed Card (left, larger) + Roll Card (right) ===== */}
        <View style={styles.topRow}>
          {/* Speed Card - takes more space */}
          <View
            style={[
              styles.speedCard,
              { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
            ]}
          >
            <Text style={{ color: colors.TEXT_SECONDARY, fontSize: 16 }}>
              KECEPATAN
            </Text>

            <View style={styles.speedCenterRow}>
              <Text
                style={{
                  color: colors.TEXT_PRIMARY,
                  fontSize: 64,
                  fontWeight: "900",
                }}
              >
                {currentSpeed}
              </Text>
              <Text
                style={{
                  color: colors.ACCENT_INFO,
                  fontSize: 18,
                  fontWeight: "700",
                  marginLeft: 8,
                }}
              >
                km/h
              </Text>
            </View>

            <View
              style={[
                styles.speedBarContainer,
                { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#F1F5F9" },
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

            <View style={styles.accelRow}>
              <View style={styles.accelCell}>
                <Text style={[styles.accelLabel, { color: colors.TEXT_SECONDARY }]}>
                  0 → 60
                </Text>
                <Text
                  style={[
                    styles.accelValue,
                    {
                      color: accelTimes.zeroTo60 ? colors.ACCENT_SAFE : colors.TEXT_SECONDARY,
                    },
                  ]}
                >
                  {accelTimes.zeroTo60 !== null
                    ? `${accelTimes.zeroTo60.toFixed(2)}s`
                    : "-"}
                </Text>
              </View>

              <View style={styles.accelCell}>
                <Text style={[styles.accelLabel, { color: colors.TEXT_SECONDARY }]}>
                  60 → 100
                </Text>
                <Text
                  style={[
                    styles.accelValue,
                    {
                      color: accelTimes.sixtyTo100 ? colors.ACCENT_INFO : colors.TEXT_SECONDARY,
                    },
                  ]}
                >
                  {accelTimes.sixtyTo100 !== null
                    ? `${accelTimes.sixtyTo100.toFixed(2)}s`
                    : "-"}
                </Text>
              </View>

              <View style={styles.accelCell}>
                <Text style={[styles.accelLabel, { color: colors.TEXT_SECONDARY }]}>
                  100 → 150
                </Text>
                <Text
                  style={[
                    styles.accelValue,
                    {
                      color: accelTimes.hundredTo150 ? colors.ACCENT_DANGER : colors.TEXT_SECONDARY,
                    },
                  ]}
                >
                  {accelTimes.hundredTo150 !== null
                    ? `${accelTimes.hundredTo150.toFixed(2)}s`
                    : "-"}
                </Text>
              </View>
            </View>
          </View>

          {/* Roll Card - aligned to the right and vertically centered with speed card */}
          <View
            style={[
              styles.rollCard,
              { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.TEXT_PRIMARY }]}>
              Sudut Kemiringan
            </Text>

            <View style={{ alignItems: "center", marginTop: 6 }}>
              <Svg height="140" width="220">
                <Path
                  d="M20 120 A90 90 0 0 1 200 120"
                  stroke={colors.BORDER}
                  strokeWidth="8"
                  fill="none"
                />
                <Path
                  d={getArcPath(displayRoll)}
                  stroke={getRollPathColor()}
                  strokeWidth="8"
                  fill="none"
                />
              </Svg>

              <Text
                style={{
                  ...styles.angleText,
                  color: colors.TEXT_PRIMARY,
                  marginTop: 6,
                }}
              >
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

              <Text style={{ color: colors.TEXT_SECONDARY, marginTop: 8 }}>
                Pitch: {displayPitch}°
              </Text>
            </View>
          </View>
        </View>

        {/* ===== MAP CARD (under the row) ===== */}
        <View
          style={[
            styles.mapCard,
            { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.TEXT_PRIMARY }]}>
            Peta Perjalanan
          </Text>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={
              locationPoints.length > 0
                ? {
                    latitude: locationPoints[locationPoints.length - 1].latitude,
                    longitude: locationPoints[locationPoints.length - 1].longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : undefined
            }
            showsUserLocation
            showsCompass={false}
            customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          >
            {locationPoints.length > 0 && (
              <>
                <Polyline
                  coordinates={locationPoints}
                  strokeWidth={5}
                  strokeColor={colors.ACCENT_INFO}
                />
                <Marker
                  coordinate={locationPoints[0]}
                  title="Start"
                  pinColor={colors.ACCENT_SAFE}
                />
                <Marker
                  coordinate={locationPoints[locationPoints.length - 1]}
                  title="Sekarang"
                  pinColor={colors.ACCENT_DANGER}
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

        {/* ===== CONTROL BUTTONS: pressed state + disabled styling ===== */}
        <View style={styles.controlsWrap}>
          <TouchableOpacity
            onPressIn={() => onPressIn("start")}
            onPressOut={() => onPressOut("start")}
            onPress={() => {
              onPressOut("start");
              startMonitoring();
            }}
            disabled={status === "Connected"}
            activeOpacity={0.9}
            style={[
              styles.controlBtn,
              { backgroundColor: activeButton === "start" ? "#08917a" : "#10B981" },
              status === "Connected" && styles.btnDisabled,
            ]}
          >
            <Ionicons name="play-circle" size={28} color="#fff" />
            <Text style={styles.btnText}>MULAI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => onPressIn("pause")}
            onPressOut={() => onPressOut("pause")}
            onPress={() => {
              onPressOut("pause");
              togglePause();
            }}
            disabled={status === "Disconnected"}
            activeOpacity={0.9}
            style={[
              styles.controlBtn,
              { backgroundColor: activeButton === "pause" ? "#d18b14" : "#F59E0B" },
              status === "Disconnected" && styles.btnDisabled,
            ]}
          >
            <Ionicons name={paused ? "play-circle" : "pause-circle"} size={28} color="#fff" />
            <Text style={styles.btnText}>{paused ? "LANJUT" : "PAUSE"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => onPressIn("save")}
            onPressOut={() => onPressOut("save")}
            onPress={() => {
              onPressOut("save");
              saveData();
            }}
            disabled={locationPoints.length === 0}
            activeOpacity={0.9}
            style={[
              styles.controlBtn,
              { backgroundColor: activeButton === "save" ? "#2563eb" : "#3B82F6" },
              locationPoints.length === 0 && styles.btnDisabled,
            ]}
          >
            <Ionicons name="cloud-upload" size={28} color="#fff" />
            <Text style={styles.btnText}>SIMPAN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => onPressIn("stop")}
            onPressOut={() => onPressOut("stop")}
            onPress={() => {
              onPressOut("stop");
              stopMonitoring();
            }}
            activeOpacity={0.9}
            style={[
              styles.controlBtn,
              { backgroundColor: activeButton === "stop" ? "#d83b3b" : "#EF4444" },
            ]}
          >
            <Ionicons name="stop-circle" size={28} color="#fff" />
            <Text style={styles.btnText}>STOP</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: { fontSize: 26, fontWeight: "900" },
  iconBtn: {
    padding: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
  },
  statusText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  topRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 12,
    alignItems: "stretch",
  },

  /* Speed Card occupies ~60% and Roll ~40% so they're balanced */
  speedCard: {
    flex: 1.6,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 10,
  },
  speedCenterRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  speedBarContainer: {
    height: 14,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
  },
  speedBar: { height: "100%", borderRadius: 12 },

  accelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  accelCell: { alignItems: "center", flex: 1 },
  accelLabel: { fontSize: 12, marginBottom: 6 },
  accelValue: { fontSize: 14, fontWeight: "800" },

  rollCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 220,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  angleText: { fontSize: 34, fontWeight: "900" },
  bikeContainer: { marginTop: -32, alignItems: "center" },
  bike: { width: 38, height: 84, borderRadius: 10 },

  /* Map card underneath */
  mapCard: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  map: {
    width: "100%",
    height: 320,
    borderRadius: 12,
    marginTop: 8,
  },

  /* Controls area */
  controlsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    height: 92,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: "#fff", fontWeight: "800", marginTop: 8 },

  /* Disabled look */
  btnDisabled: {
    opacity: 0.45,
  },
});

/* ---------- Map Styles ---------- */
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa6b2" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#9aa6b2" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#02102b" }] },
];

const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f7fb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f7fb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
];
