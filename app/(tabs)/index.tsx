import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WebView } from "react-native-webview";

import MonitoringCard from "../../components/MonitoringCard";
import { auth, db } from "../../utils/firebaseConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const getLeafletHtml = (points: LocationPoint[]) => {
  const lastPoint =
    points.length > 0
      ? points[points.length - 1]
      : { latitude: -8.65, longitude: 115.21 };
  const pathData = JSON.stringify(points.map((p) => [p.latitude, p.longitude]));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          #map { height: 100vh; width: 100vw; margin: 0; padding: 0; background: #0F172A; }
          .leaflet-control-attribution { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${lastPoint.latitude}, ${lastPoint.longitude}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
          }).addTo(map);

          var path = L.polyline(${pathData}, {color: '#3B82F6', weight: 5}).addTo(map);
          
          if (${points.length} > 0) {
            var marker = L.circleMarker([${lastPoint.latitude}, ${lastPoint.longitude}], {
              radius: 8, fillOpacity: 1, color: 'white', fillColor: '#EF4444', weight: 2
            }).addTo(map);
            map.panTo([${lastPoint.latitude}, ${lastPoint.longitude}]);
          }
        </script>
      </body>
    </html>
  `;
};
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
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("Portrait");
  const [status, setStatus] = useState<MonitoringStatus>("Disconnected");
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [mapPageIndex, setMapPageIndex] = useState(0);
  const accelStageRef = useRef<0 | 60 | 100 | 150>(0);

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
  const completedStagesRef = useRef({
    zeroTo60: false,
    sixtyTo100: false,
    hundredTo150: false,
  });

  const [subscription, setSubscription] = useState<any>(null); // Accelerometer sub
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  // const [paused, setPaused] = useState(false); // Hapus state paused
  const scrollRef = useRef<ScrollView>(null);

  // === PENGATURAN WARNA ===
  const isDark = colorScheme === "dark";
  const colors = {
    BG_PRIMARY: isDark ? "#0F172A" : "#FFFFFF", // Background utama: putih murni di light mode
    BG_CARD: isDark ? "rgba(30, 41, 59, 0.95)" : "#FFFFFF", // Card: putih murni di light mode
    TEXT_PRIMARY: isDark ? "#E2E8F0" : "#000000", // Teks utama: hitam di light mode
    TEXT_SECONDARY: isDark ? "#94A3B8" : "#444444", // Teks sekunder: abu-abu gelap
    BORDER: isDark ? "#475569" : "#E0E0E0", // Border sangat terang di light
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
      );
      beepSoundRef.current = sound;
      await sound.setIsLoopingAsync(true);
    } catch (error) {
      console.error("Gagal memuat atau mengatur suara beep:", error);
    }
  };

  // Menghentikan dan reset audio
  const stopBeepSound = async () => {
    if (!beepSoundRef.current) return;

    try {
      const status = await beepSoundRef.current.getStatusAsync();
      if (status && "isLoaded" in status && status.isLoaded) {
        await beepSoundRef.current.stopAsync();
        await beepSoundRef.current.setPositionAsync(0);
      }
    } catch (error) {
      console.warn("Gagal menghentikan suara:", error);
    }
  };

  // Memainkan audio
  const playBeepSound = async () => {
    // 1. Pastikan ref tidak null
    if (!beepSoundRef.current) return;

    try {
      const status = await beepSoundRef.current.getStatusAsync();

      // 2. Cek apakah properti 'isLoaded' ada dan bernilai true
      if (status && "isLoaded" in status && status.isLoaded) {
        // 3. Hanya mainkan jika tidak sedang bunyi
        if (!status.isPlaying) {
          await beepSoundRef.current.playAsync();
        }
      }
    } catch (error) {
      // Menangkap error jika status dipanggil saat sound sedang unload
      console.warn("Gagal memainkan suara (belum dimuat):", error);
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

  const activateMonitoring = async () => {
    const { status: permStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") {
      Alert.alert("Izin Ditolak", "Lokasi diperlukan untuk monitoring!");
      return;
    }

    // 1. Location Watcher
    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 500, // Update lebih cepat (500ms) untuk akurasi timer
        distanceInterval: 0, // Set 0 agar update terus meski bergerak sedikit
      },
      (loc) => {
        const speed = loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : 0;
        // Ambil speed sebelumnya DARI REF sebelum diupdate
        const prevSpeed = lastSpeedRef.current;

        setCurrentSpeed(speed);

        // Animasi Speedometer
        Animated.timing(speedAnim, {
          toValue: Math.min(speed, 160),
          duration: 400,
          useNativeDriver: false,
        }).start();

        // === LOGIKA PENGHITUNGAN AKSELERASI DISINI ===
        // Kita pakai Ref completedStagesRef agar tidak terkena stale closure
        if (status === "Connected" || true) {
          // Force true logic check inside watcher context
          const now = Date.now();

          // A. DETEKSI START (0 km/h -> Bergerak)
          // Jika speed turun ke 0/1, reset timer start (mobil berhenti)
          if (speed <= 1 && !completedStagesRef.current.zeroTo60) {
            accelStartTimeRef.current = null;
          }
          // Start Timer saat speed > 2 km/h
          else if (
            speed > 2 &&
            !accelStartTimeRef.current &&
            !completedStagesRef.current.zeroTo60
          ) {
            accelStartTimeRef.current = now;
          }

          // B. LOGIKA 0 - 60 KM/H
          if (
            prevSpeed < 60 &&
            speed >= 60 &&
            !completedStagesRef.current.zeroTo60
          ) {
            const startTime = accelStartTimeRef.current || now; // Fallback safety
            const duration = (now - startTime) / 1000;

            // 1. Langsung update State agar muncul di layar
            setAccelTimes((prev) => ({ ...prev, zeroTo60: duration }));

            // 2. Tandai selesai di Ref
            completedStagesRef.current.zeroTo60 = true;

            // 3. Reset timer untuk start hitungan 60-100 berikutnya
            accelStartTimeRef.current = now;

            // 4. Beri getaran SUKSES agar user tahu sudah tercatat tanpa melihat layar
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          // C. LOGIKA 60 - 100 KM/H
          else if (
            prevSpeed < 100 &&
            speed >= 100 &&
            completedStagesRef.current.zeroTo60 &&
            !completedStagesRef.current.sixtyTo100
          ) {
            const startTime = accelStartTimeRef.current || now;
            const duration = (now - startTime) / 1000;

            setAccelTimes((prev) => ({ ...prev, sixtyTo100: duration }));
            completedStagesRef.current.sixtyTo100 = true;
            accelStartTimeRef.current = now; // Reset untuk 100-150
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }

          // D. LOGIKA 100 - 150 KM/H
          else if (
            prevSpeed < 150 &&
            speed >= 150 &&
            completedStagesRef.current.sixtyTo100 &&
            !completedStagesRef.current.hundredTo150
          ) {
            const startTime = accelStartTimeRef.current || now;
            const duration = (now - startTime) / 1000;

            setAccelTimes((prev) => ({ ...prev, hundredTo150: duration }));
            completedStagesRef.current.hundredTo150 = true;
            accelStartTimeRef.current = null; // Selesai
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }

        // Update Ref Speed Terakhir
        lastSpeedRef.current = speed;

        // Simpan titik lokasi
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

    // 2. Accelerometer Watcher (Tetap sama seperti kode Anda)
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      // ... (kode accelerometer Anda tetap sama)
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
    if (status === "Connected") stopMonitoring();

    setLocationPoints([]);
    setAccelTimes({ zeroTo60: null, sixtyTo100: null, hundredTo150: null });

    // RESET Ref disini
    accelStartTimeRef.current = null;
    lastSpeedRef.current = 0;
    completedStagesRef.current = {
      zeroTo60: false,
      sixtyTo100: false,
      hundredTo150: false,
    };

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

  // --- LOGIKA VISUAL ---

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

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const cardWidthWithMargin = SCREEN_WIDTH;
    const index = Math.round(contentOffsetX / cardWidthWithMargin);
    setMapPageIndex(index);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BG_PRIMARY }}>
      <StatusBar
        barStyle={"light-content"}
        backgroundColor="transparent"
        translucent
      />

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

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={{ ...styles.title, color: colors.TEXT_PRIMARY }}>
              PrimeLean Monitor
            </Text>
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
          </MonitoringCard>

          {/* Waktu Akselerasi */}
          <View
            style={[
              styles.accelCard,
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
                  stroke={colors.BORDER}
                  strokeWidth="10"
                  fill="none"
                />
                {/* Indikator Roll Aktif */}
                <Path
                  d={getArcPath(displayRoll)}
                  stroke={getRollPathColor()}
                  strokeWidth="10"
                  fill="none"
                />
              </Svg>
              <Text
                style={{
                  ...styles.angleText,
                  color: getRollPathColor(),
                  fontSize: 42,
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
            {/* Map */}
            {/* Map (Leaflet via WebView) */}
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
                Peta Perjalanan (Leaflet)
              </Text>

              <View
                style={[styles.map, { overflow: "hidden", borderRadius: 12 }]}
              >
                <WebView
                  key={locationPoints.length} // Force re-render saat koordinat bertambah
                  originWhitelist={["*"]}
                  source={{ html: getLeafletHtml(locationPoints) }}
                  style={{ flex: 1, backgroundColor: colors.BG_PRIMARY }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  scrollEnabled={false} // Agar tidak mengganggu scroll utama aplikasi
                />
              </View>

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
  title: { fontSize: 26, fontWeight: "900" },
  iconBtn: {
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
    marginVertical: 6,
  },
  accelLabel: { fontSize: 15 },
  accelValue: { color: "#F8FAFC", fontSize: 16, fontWeight: "bold" },

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
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
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
});
