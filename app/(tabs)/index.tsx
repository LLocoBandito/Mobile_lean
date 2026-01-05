// Home.tsx (full) - UI revised: aligned speed & roll cards, fixed disconnected border, pressed button states
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as ScreenOrientation from "expo-screen-orientation";
import { Accelerometer } from "expo-sensors";
import { addDoc, collection } from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { Audio } from "expo-av";

import { auth, db } from "../../utils/firebaseConfig";
import MonitoringCard from "../../components/MonitoringCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- KONSTANTA ---
const MAX_ROLL_ANGLE = 50;
const DANGER_SPEED_THRESHOLD = 120; // km/h
const DANGER_ROLL_THRESHOLD = 35; // degrees

// --- INTERFACE ---
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
// Status Monitoring: Disconnected, Connected
type MonitoringStatus = "Disconnected" | "Connected";

// --- KOMPONEN DOTS PAGINATION ---
const PaginationDots = ({
  count,
  activeIndex,
  colors,
}: {
  count: number;
  activeIndex: number;
  colors: any;
}) => (
  <View style={styles.dotContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.dot,
          {
            backgroundColor:
              index === activeIndex ? colors.ACCENT_INFO : colors.BORDER,
          },
        ]}
      />
    ))}
  </View>
);

// --- KOMPONEN UTAMA ---
export default function Home() {
  // ---------- Logic & State (UNCHANGED) ----------
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("Portrait");
  const [status, setStatus] = useState<MonitoringStatus>("Disconnected");
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [mapPageIndex, setMapPageIndex] = useState(0);

  const [isSpeedBeeping, setIsSpeedBeeping] = useState(false);
  const [isRollBeeping, setIsRollBeeping] = useState(false);

  // Ref untuk menahan objek Audio Sound
  const beepSoundRef = useRef<Audio.Sound | null>(null);

  const [accelTimes, setAccelTimes] = useState({
    zeroTo60: null as number | null,
    sixtyTo100: null as number | null,
    hundredTo150: null as number | null,
  });

  // --- REFS ---
  const rollRef = useRef(0);
  const pitchRef = useRef(0);
  const speedAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const lastSpeedRef = useRef(0);
  const accelStartTimeRef = useRef<number | null>(null);

  const [subscription, setSubscription] = useState<any>(null); // Accelerometer sub
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  // const [paused, setPaused] = useState(false); // Hapus state paused
  const scrollRef = useRef<ScrollView>(null);

<<<<<<< HEAD
  // ---------- Theme Colors (updated for premium look) ----------
=======
  // === PENGATURAN WARNA ===
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  const isDark = colorScheme === "dark";
  const colors = {
<<<<<<< HEAD
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
=======
    BG_PRIMARY: isDark ? "#0F172A" : "#000000",
    BG_CARD: isDark ? "rgba(30, 41, 59, 0.95)" : "#111111",
    TEXT_PRIMARY: isDark ? "#E2E8F0" : "#FFFFFF",
    TEXT_SECONDARY: isDark ? "#94A3B8" : "#AAAAAA",
    BORDER: isDark ? "#475569" : "#333333",
    ACCENT_SAFE: "#10B981",
    ACCENT_WARNING: "#F59E0B",
    ACCENT_DANGER: "#EF4444",
    ACCENT_INFO: "#3B82F6",
  };

  // --- FUNGSI AUDIO ---

  // Memuat dan mengatur audio loop
  const loadBeepSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/beep_overspeed.mp3"),
        { shouldPlay: false }
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
      );
      beepSoundRef.current = sound;
      await sound.setIsLoopingAsync(true);
    } catch (error) {
      console.error("Gagal memuat atau mengatur suara beep:", error);
    }
  };

  // Menghentikan dan reset audio
  const stopBeepSound = async () => {
    if (beepSoundRef.current) {
      await beepSoundRef.current.stopAsync();
      await beepSoundRef.current.setPositionAsync(0);
    }
  };

  // Memainkan audio
  const playBeepSound = async () => {
    if (beepSoundRef.current) {
      const status = await beepSoundRef.current.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await beepSoundRef.current.playAsync();
      }
    }
  };

  // Membongkar audio saat unmount
  const unloadBeepSound = async () => {
    if (beepSoundRef.current) {
      await beepSoundRef.current.unloadAsync();
      beepSoundRef.current = null;
    }
  };

  // Panggil saat komponen di-mount
  useEffect(() => {
    loadBeepSound();
    return () => {
      unloadBeepSound();
    };
  }, []);

  // === LOGIKA BEEP KOMBINASI ===

  /* Logika: Beep harus dimainkan jika salah satu dari:
     1. Kecepatan > DANGER_SPEED_THRESHOLD
     2. Roll (kemiringan absolut) > DANGER_ROLL_THRESHOLD
   */
  // const isDangerActive = // Dihapus karena tidak digunakan langsung, logikanya ada di useEffect

  useEffect(() => {
    // State isBeeping akan menjadi true jika salah satu kondisi bahaya terpenuhi
    const newIsBeepingState =
      currentSpeed > DANGER_SPEED_THRESHOLD ||
      Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD;

    // Jika monitoring aktif (status === "Connected")
    if (status === "Connected") {
      // Jika kondisi bahaya baru saja aktif (sebelumnya aman)
      if (newIsBeepingState && !(isSpeedBeeping || isRollBeeping)) {
        playBeepSound();
        // Hanya set state yang relevan untuk visualisasi/debug
        if (currentSpeed > DANGER_SPEED_THRESHOLD) setIsSpeedBeeping(true);
        if (Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD)
          setIsRollBeeping(true);

        // Pemicu getaran hanya sekali saat masuk kondisi bahaya
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        // Jika kondisi bahaya baru saja berakhir (sekarang aman)
      } else if (!newIsBeepingState && (isSpeedBeeping || isRollBeeping)) {
        stopBeepSound();
        setIsSpeedBeeping(false);
        setIsRollBeeping(false);

        // Mengupdate state beeping tanpa mengganggu audio yang sudah berjalan
      } else if (newIsBeepingState) {
        if (currentSpeed > DANGER_SPEED_THRESHOLD && !isSpeedBeeping) {
          setIsSpeedBeeping(true);
        } else if (currentSpeed <= DANGER_SPEED_THRESHOLD && isSpeedBeeping) {
          setIsSpeedBeeping(false);
        }

        if (Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD && !isRollBeeping) {
          setIsRollBeeping(true);
        } else if (
          Math.abs(displayRoll) <= DANGER_ROLL_THRESHOLD &&
          isRollBeeping
        ) {
          setIsRollBeeping(false);
        }
      }
    } else {
      // Pastikan audio berhenti jika monitoring berhenti (disconnected)
      stopBeepSound();
      setIsSpeedBeeping(false);
      setIsRollBeeping(false);
    }
  }, [currentSpeed, displayRoll, isSpeedBeeping, isRollBeeping, status]);

  // === FUNGSI UTILITY MONITORING ===

  const updateAccelerationTimes = useCallback(
    (speed: number, prevSpeed: number) => {
      const now = Date.now();

      // Mulai menghitung 0-60
      if (speed > 10 && !accelStartTimeRef.current && !accelTimes.zeroTo60) {
        accelStartTimeRef.current = now;
        return;
      }

      // Catat 0-60
      if (prevSpeed < 60 && speed >= 60 && !accelTimes.zeroTo60) {
        const time = accelStartTimeRef.current
          ? (now - accelStartTimeRef.current) / 1000
          : 0;
        setAccelTimes((prev) => ({ ...prev, zeroTo60: time }));
        accelStartTimeRef.current = now; // Mulai hitungan berikutnya (60-100)
      }
      // Catat 60-100
      else if (
        prevSpeed < 100 &&
        speed >= 100 &&
        accelTimes.zeroTo60 &&
        !accelTimes.sixtyTo100
      ) {
        const time = accelStartTimeRef.current
          ? (now - accelStartTimeRef.current) / 1000
          : 0;
        setAccelTimes((prev) => ({ ...prev, sixtyTo100: time }));
        accelStartTimeRef.current = now; // Mulai hitungan berikutnya (100-150)
      }
      // Catat 100-150
      else if (
        prevSpeed < 150 &&
        speed >= 150 &&
        accelTimes.sixtyTo100 &&
        !accelTimes.hundredTo150
      ) {
        const time = accelStartTimeRef.current
          ? (now - accelStartTimeRef.current) / 1000
          : 0;
        setAccelTimes((prev) => ({ ...prev, hundredTo150: time }));
        accelStartTimeRef.current = null; // Selesai
      }
    },
    [accelTimes]
  );

<<<<<<< HEAD
  // ---------- Monitoring Logic (unchanged) ----------
=======
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  const activateMonitoring = async () => {
    const { status: permStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Izin Ditolak", "Lokasi diperlukan untuk monitoring!");
      return;
    }

    // 1. Location Watcher (GPS & Speed)
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
          updateAccelerationTimes(speed, prevSpeed);
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

    // 2. Accelerometer Watcher (Roll & Pitch)
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      let rollRad: number, pitchRad: number;

      // Hitung Roll/Pitch berdasarkan orientasi layar saat ini
      if (orientationMode === "Portrait") {
        rollRad = Math.atan2(-x, z);
        pitchRad = Math.atan2(y, Math.sqrt(x * x + z * z));
      } else {
        rollRad = Math.atan2(y, z);
        pitchRad = Math.atan2(-x, Math.sqrt(y * y + z * z));
      }

      const rollDeg = (rollRad * 180) / Math.PI;
      const pitchDeg = (pitchRad * 180) / Math.PI;
      // Batasi roll agar tampilan visual tidak berlebihan
      const clampedRoll = Math.max(
        -MAX_ROLL_ANGLE,
        Math.min(MAX_ROLL_ANGLE, rollDeg)
      );

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

  const stopMonitoring = useCallback(() => {
    subscription?.remove();
    locationWatcher?.remove();
    setSubscription(null);
    setLocationWatcher(null);
    setStatus("Disconnected");
    setCurrentSpeed(0);

    // Hentikan beeping audio
    stopBeepSound();

    // Reset state beeping
    setIsSpeedBeeping(false);
    setIsRollBeeping(false);
  }, [subscription, locationWatcher]);

  const startMonitoring = async () => {
    if (status === "Connected") stopMonitoring(); // Stop yang lama jika ada

    setLocationPoints([]);
    setAccelTimes({ zeroTo60: null, sixtyTo100: null, hundredTo150: null });
    accelStartTimeRef.current = null;
    lastSpeedRef.current = 0;

    await activateMonitoring();
    setStatus("Connected");
  };

  // Hapus fungsi togglePause
  /*
  const togglePause = async () => {
    if (paused) {
      // ... logic play
    } else {
      // ... logic pause
    }
  };
  */

  const saveData = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "Anda harus login untuk menyimpan data sesi.");
      return;
    }
    const userId = user.uid;

    if (locationPoints.length < 1) {
      Alert.alert("Data Kurang", "Minimal 1 titik GPS diperlukan.");
      return;
    }

    stopMonitoring();

    try {
      await addDoc(collection(db, "monitoring_sessions"), {
        userId: userId,
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
      setLocationPoints([]);
    } catch (e: any) {
      console.error("Error saving data:", e);
      Alert.alert("Error", `Gagal menyimpan data: ${e.message}.`);
    }
  };

<<<<<<< HEAD
  // ---------- Presentation Helpers ----------
=======
  // --- LOGIKA VISUAL ---

>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  const rotation = rotateAnim.interpolate({
    inputRange: [-MAX_ROLL_ANGLE, MAX_ROLL_ANGLE],
    outputRange: [`-${MAX_ROLL_ANGLE}deg`, `${MAX_ROLL_ANGLE}deg`],
  });

  const getArcPath = (angle: number) => {
    const r = 120,
      cx = 150,
      cy = 150;
    const sweep = (angle / MAX_ROLL_ANGLE) * 120;

    // Mulai dari atas (0 derajat roll)
    const start = { x: cx, y: cy - r };

    // Sudut dihitung dari 0 (atas)
    const angleFromZero = sweep + 270;
    const endX = cx + r * Math.cos((angleFromZero * Math.PI) / 180);
    const endY = cy + r * Math.sin((angleFromZero * Math.PI) / 180);

    // Bendera busur besar/kecil
    const large = Math.abs(sweep) > 180 ? 1 : 0;

    // Perbaikan untuk memastikan busur ditarik dengan benar
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

  const getRollPathColor = () => {
    const absRoll = Math.abs(displayRoll);
    if (absRoll === 0) return colors.TEXT_SECONDARY;
    if (absRoll > DANGER_ROLL_THRESHOLD) return colors.ACCENT_DANGER;
    return colors.ACCENT_SAFE;
  };

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
    // Restart monitoring agar pembacaan accelerometer menyesuaikan orientasi baru
    if (status === "Connected") {
      stopMonitoring();
      setTimeout(startMonitoring, 500);
    }
  };

<<<<<<< HEAD
  // ---------- PREMIUM UI (only visual, logic preserved) ----------
=======
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const cardWidthWithMargin = SCREEN_WIDTH;
    const index = Math.round(contentOffsetX / cardWidthWithMargin);
    setMapPageIndex(index);
  };

>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BG_PRIMARY }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

<<<<<<< HEAD
      {/* Top overlay (kept simple - no invalid linear-gradient string) */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isDark ? "transparent" : "transparent",
        }}
        pointerEvents="none"
      />
=======
      <View style={{ flex: 1 }}>
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: isDark
              ? "rgba(30, 41, 59, 0.4)"
              : "rgba(0, 0, 0, 0.4)",
          }}
          pointerEvents="none"
        />
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad

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
<<<<<<< HEAD
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

=======
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
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
                  size={24}
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
                  size={24}
                  color={colors.TEXT_PRIMARY}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Speedometer */}
          <MonitoringCard
            title="KECEPATAN (km/h)"
            colors={colors}
            style={styles.speedCardOverride}
          >
            <Text
              style={{
                color: colors.TEXT_PRIMARY,
                fontSize: 80,
                fontWeight: "900",
              }}
            >
              {currentSpeed}
            </Text>
            <Text
              style={{
                color: colors.ACCENT_INFO,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              km/h
            </Text>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
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
<<<<<<< HEAD

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
=======
          </MonitoringCard>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad

          {/* Roll Card - aligned to the right and vertically centered with speed card */}
          <View
            style={[
              styles.rollCard,
              { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
            ]}
          >
<<<<<<< HEAD
            <Text style={[styles.cardTitle, { color: colors.TEXT_PRIMARY }]}>
              Sudut Kemiringan
            </Text>

            <View style={{ alignItems: "center", marginTop: 6 }}>
              <Svg height="140" width="220">
                <Path
                  d="M20 120 A90 90 0 0 1 200 120"
=======
            <Text
              style={{
                ...styles.cardTitle,
                color: colors.TEXT_PRIMARY,
                fontSize: 20,
              }}
            >
              Waktu Akselerasi
            </Text>

            {/* Rows Akselerasi */}
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
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            style={{ marginVertical: 20 }}
            onScroll={handleScroll}
            scrollEventThrottle={200}
          >
            {/* Roll (Kemiringan) */}
            <View
              style={[
                styles.rollCard,
                { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
              ]}
            >
              <Text
                style={{
                  ...styles.cardTitle,
                  color: colors.TEXT_PRIMARY,
                  fontSize: 20,
                }}
              >
                Sudut Kemiringan (Roll)
              </Text>

              <Svg height="200" width="300">
                {/* Latar Belakang Arc (Indikator Roll Maks) */}
                <Path
                  d={`M${150 - 120} 150 A120 120 0 0 1 ${150 + 120} 150`}
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
                  stroke={colors.BORDER}
                  strokeWidth="8"
                  fill="none"
                />
                {/* Indikator Roll Aktif */}
                <Path
                  d={getArcPath(displayRoll)}
                  stroke={getRollPathColor()}
                  strokeWidth="8"
                  fill="none"
                />
              </Svg>
<<<<<<< HEAD

              <Text
                style={{
                  ...styles.angleText,
                  color: colors.TEXT_PRIMARY,
                  marginTop: 6,
=======
              <Text
                style={{
                  ...styles.angleText,
                  color: getRollPathColor(),
                  fontSize: 42,
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
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
                    {
                      backgroundColor:
                        Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD
                          ? colors.ACCENT_DANGER
                          : colors.TEXT_PRIMARY,
                    },
                  ]}
                />
              </Animated.View>
<<<<<<< HEAD

              <Text style={{ color: colors.TEXT_SECONDARY, marginTop: 8 }}>
                Pitch: {displayPitch}°
              </Text>
            </View>
=======
              <Text
                style={{
                  ...styles.statusDirection,
                  color: colors.TEXT_SECONDARY,
                  marginTop: 20,
                  fontSize: 16,
                }}
              >
                {displayRoll === 0
                  ? "Center"
                  : displayRoll > 0
                  ? "Tilting Right"
                  : "Tilting Left"}
              </Text>
              <Text style={{ color: colors.TEXT_SECONDARY, fontSize: 16 }}>
                Pitch (Mendaki/Menurun): {displayPitch}°
              </Text>
            </View>

            {/* Map */}
            <View
              style={[
                styles.mapCard,
                { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
              ]}
            >
              <Text
                style={{
                  ...styles.cardTitle,
                  color: colors.TEXT_PRIMARY,
                  fontSize: 20,
                }}
              >
                Peta Perjalanan
              </Text>
              <MapView
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
                showsUserLocation
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
                  fontSize: 16,
                }}
              >
                Titik GPS Terekam: {locationPoints.length}
              </Text>
            </View>
          </ScrollView>

          {/* Indikator Slide */}
          <PaginationDots
            count={2}
            activeIndex={mapPageIndex}
            colors={colors}
          />

          {/* Control Buttons (Tombol PAUSE dihilangkan) */}
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[
                styles.controlBtn,
                styles.startBtn,
                { width: 100, height: 100 }, // Sesuaikan ukuran agar tetap rapi
              ]}
              onPress={startMonitoring}
              disabled={status === "Connected"}
            >
              <Ionicons name="play-circle" size={40} color="#fff" />
              <Text style={styles.btnText}>MULAI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlBtn,
                styles.saveBtn,
                { width: 100, height: 100 },
              ]}
              onPress={saveData}
              disabled={locationPoints.length === 0}
            >
              <Ionicons name="cloud-upload" size={40} color="#fff" />
              <Text style={styles.btnText}>SIMPAN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.controlBtn,
                styles.stopBtn,
                { width: 100, height: 100 },
              ]}
              onPress={stopMonitoring}
              disabled={
                status === "Disconnected" && locationPoints.length === 0
              }
            >
              <Ionicons name="stop-circle" size={40} color="#fff" />
              <Text style={styles.btnText}>STOP</Text>
            </TouchableOpacity>
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
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
<<<<<<< HEAD
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
=======
    padding: 8,
    borderRadius: 14,
  },

  // --- CARD STYLES ---
  speedCardOverride: {
    marginVertical: 20,
    padding: 32,
  },
  speedBarContainer: {
    width: "100%",
    height: 25,
    borderRadius: 12.5,
    overflow: "hidden",
    marginTop: 20,
  },
  speedBar: { height: "100%", borderRadius: 12.5 },
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad

  accelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
<<<<<<< HEAD
    marginTop: 12,
  },
  accelCell: { alignItems: "center", flex: 1 },
  accelLabel: { fontSize: 12, marginBottom: 6 },
  accelValue: { fontSize: 14, fontWeight: "800" },
=======
    marginVertical: 6,
  },
  accelLabel: { fontSize: 15 },
  accelValue: { color: "#F8FAFC", fontSize: 16, fontWeight: "bold" },
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad

  rollCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
<<<<<<< HEAD
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
=======
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
  cardTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  angleText: { fontSize: 42, fontWeight: "900", position: "absolute", top: 60 },
  bikeContainer: { marginTop: -75 },
  bike: { width: 40, height: 90, borderRadius: 20 },
  statusDirection: { fontSize: 16, fontWeight: "600", marginTop: 10 },
  map: { width: "100%", height: 300, borderRadius: 20 },

  // --- BUTTON STYLES ---
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    padding: 20,
    paddingBottom: 40,
  },
  controlBtn: {
    width: 80,
    height: 80,
    borderRadius: 20,
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#000",
<<<<<<< HEAD
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: "#fff", fontWeight: "800", marginTop: 8 },

  /* Disabled look */
  btnDisabled: {
    opacity: 0.45,
  },
=======
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 15,
  },
  startBtn: { backgroundColor: "#10B981" },
  pauseBtn: { backgroundColor: "#F59E0B" }, // Tetap didefinisikan untuk menghindari error jika style ini masih dipakai
  saveBtn: { backgroundColor: "#3B82F6" },
  stopBtn: { backgroundColor: "#EF4444" },
  btnText: { color: "#fff", fontWeight: "bold", marginTop: 5, fontSize: 12 },

  // --- DOTS PAGINATION STYLES ---
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
>>>>>>> 9527ca4677aeadf4909e8213e5184278a9bf0dad
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
