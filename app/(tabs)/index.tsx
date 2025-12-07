// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { db } from "../../utils/firebaseconfig"; // Pastikan path ini benar

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- TIPE DATA ---
interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  roll: number;
  pitch: number;
  speed: number;
}

type ColorScheme = "dark" | "light";
type Status = "Disconnected" | "Connected" | "Paused";
type OrientationMode = "Portrait" | "Landscape";

// --- FUNGSI UTAMA KOMPONEN ---
export default function Home() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const [status, setStatus] = useState<Status>("Disconnected");
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isBeeping, setIsBeeping] = useState(false);
  const [orientationMode, setOrientationMode] =
    useState<OrientationMode>("Portrait");

  // Hitung ulang dimensi saat orientasi berubah
  const buttonSize = Dimensions.get("window").width / 2.4;

  // Refs untuk nilai yang sering diupdate
  const rollRef = useRef(0);
  const pitchRef = useRef(0);
  const speedAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // States untuk monitoring
  const [subscription, setSubscription] = useState<any>(null);
  const [locationWatcher, setLocationWatcher] =
    useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [paused, setPaused] = useState(false);

  // --- DEFINISI WARNA DINAMIS ---
  const getColors = (mode: ColorScheme) => ({
    // Backgrounds
    BG_PRIMARY: mode === "dark" ? "#0F172A" : "#F8F8F8",
    BG_CARD: mode === "dark" ? "#1F2937" : "#FFFFFF",
    BG_BUTTON: mode === "dark" ? "#374151" : "#E5E7EB",
    // Text & Border
    TEXT_PRIMARY: mode === "dark" ? "#F9FAFB" : "#1F2937",
    TEXT_SECONDARY: mode === "dark" ? "#9CA3AF" : "#6B7280",
    BORDER_COLOR: mode === "dark" ? "#334155" : "#D1D5DB",
    // Accents
    ACCENT_SAFE: "#10B981", // Green
    ACCENT_WARNING: "#FBBF24", // Yellow
    ACCENT_DANGER: "#EF4444", // Red
    ACCENT_INFO: "#3B82F6", // Blue
  });

  const colors = getColors(colorScheme);

  // --- LOGIKA BEEP + VIBRATION ---
  const playBeep = async () => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        // Coba sound ID yang berbeda jika 1005 tidak bekerja
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

  // --- LOGIKA MONITORING (DENGAN PENYESUAIAN ORIENTASI) ---
  const activateMonitoring = async () => {
    // 1. Izin Lokasi
    const { status: locStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (locStatus !== "granted") {
      Alert.alert("Izin Ditolak", "Lokasi diperlukan untuk monitoring!");
      return;
    }

    // 2. Location Watcher
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

    // 3. Accelerometer Listener (DENGAN PENYESUAIAN RUMUS)
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      let rollRad: number, pitchRad: number;

      if (orientationMode === "Portrait") {
        // ✅ PORTRAIT: Roll dari X, Pitch dari Y
        // Roll: Kemiringan samping
        rollRad = Math.atan2(-x, z);
        // Pitch: Kemiringan maju/mundur
        pitchRad = Math.atan2(y, Math.sqrt(x * x + z * z));
      } else {
        // 🛠️ LANDSCAPE: Penyesuaian sumbu untuk LANDSCAPE_RIGHT (90 derajat kanan)
        // Roll: Sumbu yang bertanggung jawab untuk kemiringan lateral saat ini adalah Y.
        rollRad = Math.atan2(y, z);

        // Pitch: Sumbu yang bertanggung jawab untuk nungging/mendongak saat ini adalah X.
        // Perlu tanda negatif agar nilai Pitch tetap logis.
        pitchRad = Math.atan2(-x, Math.sqrt(y * y + z * z));
      }

      const rollDeg = (rollRad * 180) / Math.PI;
      const pitchDeg = (pitchRad * 180) / Math.PI;

      // Batasi Roll pada nilai yang masuk akal
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
        orientation: orientationMode,
      });
      Alert.alert("Sukses!", "Data sesi berhasil disimpan ke Firebase!");
      setLocationPoints([]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // --- FUNGSI UI PENDUKUNG ---
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

  const getSpeedBarColor = () => {
    if (currentSpeed < 60) return colors.ACCENT_SAFE;
    if (currentSpeed < 100) return colors.ACCENT_WARNING;
    return colors.ACCENT_DANGER;
  };

  const getRollPathColor = () => {
    if (displayRoll === 0) return colors.TEXT_SECONDARY;
    if (displayRoll > 0) return colors.ACCENT_SAFE;
    return colors.ACCENT_DANGER;
  };

  // --- KOMPONEN SWITCH TEMA ---
  const ThemeSwitcher = () => (
    <TouchableOpacity
      onPress={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}
      style={styles.themeSwitcher}
    >
      <Ionicons
        name={colorScheme === "dark" ? "sunny-outline" : "moon-outline"}
        size={24}
        color={colors.TEXT_PRIMARY}
      />
    </TouchableOpacity>
  );

  // --- KOMPONEN SWITCH ORIENTASI BARU ---
  const LandscapeToggle = () => {
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
      // Hentikan dan mulai ulang monitoring agar accelerometer listener menggunakan formula baru
      if (status === "Connected" || status === "Paused") {
        stopMonitoring();
        setTimeout(startMonitoring, 500);
      }
    };

    return (
      <TouchableOpacity
        onPress={toggleOrientation}
        style={styles.themeSwitcher}
      >
        <Ionicons
          name={
            orientationMode === "Portrait"
              ? "phone-portrait-outline"
              : "phone-landscape-outline"
          }
          size={24}
          color={
            orientationMode === "Portrait"
              ? colors.ACCENT_SAFE
              : colors.ACCENT_INFO
          }
        />
      </TouchableOpacity>
    );
  };

  // --- RENDER UTAMA ---
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.BG_PRIMARY }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.BG_PRIMARY },
        ]}
      >
        {/* HEADER & STATUS */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.TEXT_PRIMARY }]}>
            PrimeLean Monitor
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LandscapeToggle />
            <ThemeSwitcher />
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

        {/* WARNING BANNER */}
        {currentSpeed > 120 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={28} color="#fff" />
            <Text style={styles.warningText}>KECEPATAN BERLEBIH!</Text>
          </View>
        )}

        {/* 1. SPEEDOMETER */}
        <View style={[styles.card, { backgroundColor: colors.BG_CARD }]}>
          <View style={styles.speedHeader}>
            <Ionicons
              name="speedometer"
              size={30}
              color={colors.ACCENT_WARNING}
            />
            <Text style={[styles.speedText, { color: colors.ACCENT_WARNING }]}>
              {currentSpeed} km/h
            </Text>
          </View>
          <View
            style={[styles.speedBarBg, { backgroundColor: colors.BG_BUTTON }]}
          >
            <Animated.View
              style={[
                styles.speedBarFill,
                {
                  width: speedAnim.interpolate({
                    inputRange: [0, 145],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: getSpeedBarColor(),
                },
              ]}
            />
          </View>
          <View style={styles.speedLabels}>
            <Text style={[styles.speedLabel, { color: colors.TEXT_SECONDARY }]}>
              0
            </Text>
            <Text style={[styles.speedLabel, { color: colors.TEXT_SECONDARY }]}>
              145 km/h
            </Text>
          </View>
        </View>

        {/* 2. ROLL & PITCH VISUALIZATION */}
        <View
          style={[
            styles.card,
            styles.visualContainer,
            { backgroundColor: colors.BG_CARD },
          ]}
        >
          <Text
            style={[styles.statusDirection, { color: colors.TEXT_PRIMARY }]}
          >
            Sudut Kemiringan (Roll)
          </Text>
          <Svg height="200" width="300">
            <Path
              d="M30 150 A120 120 0 0 1 270 150"
              stroke={colors.BORDER_COLOR}
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
          <Text style={[styles.angleText, { color: colors.TEXT_PRIMARY }]}>
            {Math.abs(displayRoll)}°
          </Text>
          <Animated.View
            style={[
              styles.bikeContainer,
              { transform: [{ rotate: rotation }] },
            ]}
          >
            <View
              style={[styles.bike, { backgroundColor: colors.TEXT_PRIMARY }]}
            />
          </Animated.View>
          <Text
            style={[
              styles.statusDirection,
              { marginTop: 20, color: colors.TEXT_SECONDARY },
            ]}
          >
            {displayRoll === 0
              ? "Center"
              : displayRoll > 0
              ? "Tilting Right"
              : "Tilting Left"}
          </Text>
          <Text style={[styles.pitchText, { color: colors.TEXT_SECONDARY }]}>
            Pitch: {displayPitch}°
          </Text>
        </View>

        {/* 3. MAP VIEW */}
        <View
          style={[
            styles.card,
            styles.mapContainer,
            { backgroundColor: colors.BG_CARD },
          ]}
        >
          <MapView
            style={{ flex: 1, width: "100%" }}
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
                  strokeColor={colors.ACCENT_INFO}
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

        {/* 4. CONTROL BUTTONS */}
        <View style={styles.controlButtons}>
          {/* Tombol Start */}
          <TouchableOpacity
            style={[
              styles.mainBtn,
              {
                backgroundColor:
                  status === "Connected"
                    ? colors.BG_BUTTON
                    : colors.ACCENT_SAFE,
                width: buttonSize,
              },
            ]}
            onPress={startMonitoring}
            disabled={status === "Connected"}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.mainBtnText}>Start</Text>
          </TouchableOpacity>

          {/* Tombol Pause/Lanjut */}
          <TouchableOpacity
            style={[
              styles.mainBtn,
              {
                backgroundColor:
                  !paused && status !== "Connected"
                    ? colors.BG_BUTTON
                    : colors.ACCENT_WARNING,
                width: buttonSize,
              },
            ]}
            onPress={togglePause}
            disabled={!paused && status !== "Connected"}
          >
            <Ionicons name={paused ? "play" : "pause"} size={24} color="#fff" />
            <Text style={styles.mainBtnText}>
              {paused ? "Lanjut" : "Pause"}
            </Text>
          </TouchableOpacity>

          {/* Tombol Simpan */}
          <TouchableOpacity
            style={[
              styles.mainBtn,
              {
                backgroundColor:
                  locationPoints.length > 0
                    ? colors.ACCENT_INFO
                    : colors.BG_BUTTON,
                width: buttonSize,
              },
            ]}
            onPress={saveData}
            disabled={locationPoints.length === 0}
          >
            <Ionicons name="save" size={24} color="#fff" />
            <Text style={styles.mainBtnText}>Simpan</Text>
          </TouchableOpacity>

          {/* Tombol Stop */}
          <TouchableOpacity
            style={[
              styles.mainBtn,
              { backgroundColor: colors.ACCENT_DANGER, width: buttonSize },
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

// --- STYLES (Dinamis dan Static) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flexGrow: 1, padding: 20 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },

  // Header & Status
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 28, fontWeight: "800" },
  statusBadge: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16 },
  statusText: { color: "#fff", fontWeight: "700" },
  themeSwitcher: {
    padding: 5,
    borderRadius: 20,
  },

  // Warning
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  warningText: { color: "#fff", fontSize: 19, fontWeight: "800" },

  // Speedometer
  speedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  speedText: { fontSize: 48, fontWeight: "900" },
  speedBarBg: {
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
  },
  speedBarFill: { height: "100%", borderRadius: 18 },
  speedLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  speedLabel: { fontSize: 14 },

  // Roll & Pitch Visual
  visualContainer: {
    alignItems: "center",
  },
  angleText: {
    fontSize: 52,
    fontWeight: "900",
    position: "absolute",
    top: 60,
  },
  bikeContainer: { marginTop: -75 },
  bike: {
    width: 46,
    height: 104,
    borderRadius: 23,
  },
  statusDirection: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
  },
  pitchText: { fontSize: 16, marginTop: 8 },

  // Map
  mapContainer: { height: 300, padding: 0, overflow: "hidden" },

  // Controls
  controlButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginVertical: 10,
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mainBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});
