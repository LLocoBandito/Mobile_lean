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
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import MonitoringCard from "../../components/MonitoringCard";
import { auth, db } from "../../utils/firebaseConfig";

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

export default function Home() {
  // ---------- Logic & State ----------
  const [colorScheme, setColorScheme] = useState<ColorScheme>("dark");
  const [orientationMode, setOrientationMode] = useState<OrientationMode>("Portrait");
  const [status, setStatus] = useState<MonitoringStatus>("Disconnected");
  const [displayPitch, setDisplayPitch] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [mapPageIndex, setMapPageIndex] = useState(0);
  
  // State Baru untuk menangani eror tombol
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const [isSpeedBeeping, setIsSpeedBeeping] = useState(false);
  const [isRollBeeping, setIsRollBeeping] = useState(false);

  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const [accelTimes, setAccelTimes] = useState({
    zeroTo60: null as number | null,
    sixtyTo100: null as number | null,
    hundredTo150: null as number | null,
  });

  const rollRef = useRef(0);
  const pitchRef = useRef(0);
  const speedAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const lastSpeedRef = useRef(0);
  const accelStartTimeRef = useRef<number | null>(null);

  const [subscription, setSubscription] = useState<any>(null);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const isDark = colorScheme === "dark";
  const colors = {
    BG_PRIMARY: isDark ? "#0F172A" : "#F8FAFC",
    BG_CARD: isDark ? "rgba(30, 41, 59, 0.95)" : "#FFFFFF",
    TEXT_PRIMARY: isDark ? "#E2E8F0" : "#1E293B",
    TEXT_SECONDARY: isDark ? "#94A3B8" : "#64748B",
    BORDER: isDark ? "#475569" : "#CBD5E1",
    ACCENT_SAFE: "#10B981",
    ACCENT_WARNING: "#F59E0B",
    ACCENT_DANGER: "#EF4444",
    ACCENT_INFO: "#3B82F6",
  };

  // --- HANDLERS ---
  const onPressIn = (id: string) => {
    setActiveButton(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onPressOut = (id?: string) => {
    setActiveButton(null);
  };

  const togglePause = () => {
    if (status === "Connected") {
      setPaused(!paused);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const loadBeepSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/beep_overspeed.mp3"),
        { shouldPlay: false }
      );
      beepSoundRef.current = sound;
      await sound.setIsLoopingAsync(true);
    } catch (error) {
      console.error("Audio Load Error:", error);
    }
  };

  const stopBeepSound = async () => {
    if (beepSoundRef.current) {
      await beepSoundRef.current.stopAsync();
    }
  };

  const playBeepSound = async () => {
    if (beepSoundRef.current) {
      const status = await beepSoundRef.current.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await beepSoundRef.current.playAsync();
      }
    }
  };

  useEffect(() => {
    loadBeepSound();
    return () => { if (beepSoundRef.current) beepSoundRef.current.unloadAsync(); };
  }, []);

  useEffect(() => {
    const newIsBeepingState = currentSpeed > DANGER_SPEED_THRESHOLD || Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD;
    if (status === "Connected" && !paused) {
      if (newIsBeepingState && !(isSpeedBeeping || isRollBeeping)) {
        playBeepSound();
        if (currentSpeed > DANGER_SPEED_THRESHOLD) setIsSpeedBeeping(true);
        if (Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD) setIsRollBeeping(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (!newIsBeepingState) {
        stopBeepSound();
        setIsSpeedBeeping(false);
        setIsRollBeeping(false);
      }
    } else {
      stopBeepSound();
    }
  }, [currentSpeed, displayRoll, status, paused]);

  const activateMonitoring = async () => {
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") return;

    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
      (loc) => {
        if (paused) return;
        const speed = loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : 0;
        setCurrentSpeed(speed);
        lastSpeedRef.current = speed;
        Animated.timing(speedAnim, { toValue: Math.min(speed, 160), duration: 400, useNativeDriver: false }).start();
        
        setLocationPoints(prev => [...prev, {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: new Date().toISOString(),
          roll: rollRef.current,
          pitch: pitchRef.current,
          speed
        }]);
      }
    );
    setLocationWatcher(watcher);

    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      if (paused) return;
      let rollRad = orientationMode === "Portrait" ? Math.atan2(-x, z) : Math.atan2(y, z);
      let rollDeg = (rollRad * 180) / Math.PI;
      const clampedRoll = Math.max(-MAX_ROLL_ANGLE, Math.min(MAX_ROLL_ANGLE, rollDeg));
      rollRef.current = Math.round(clampedRoll);
      setDisplayRoll(rollRef.current);
      Animated.timing(rotateAnim, { toValue: clampedRoll, duration: 120, useNativeDriver: true }).start();
    });
    setSubscription(sub);
  };

  const startMonitoring = async () => {
    setLocationPoints([]);
    setPaused(false);
    await activateMonitoring();
    setStatus("Connected");
  };

  const stopMonitoring = () => {
    subscription?.remove();
    locationWatcher?.remove();
    setStatus("Disconnected");
    setCurrentSpeed(0);
    stopBeepSound();
  };

  const saveData = async () => {
    const user = auth.currentUser;
    if (!user || locationPoints.length < 1) {
        Alert.alert("Error", "Gagal menyimpan data (Cek login/data GPS)");
        return;
    }
    try {
      await addDoc(collection(db, "monitoring_sessions"), {
        userId: user.uid,
        totalPoints: locationPoints.length,
        path: locationPoints,
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Sukses", "Data perjalanan berhasil disimpan!");
      setLocationPoints([]);
    } catch (e) {
      Alert.alert("Error", "Gagal ke database");
    }
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [-MAX_ROLL_ANGLE, MAX_ROLL_ANGLE],
    outputRange: [`-${MAX_ROLL_ANGLE}deg`, `${MAX_ROLL_ANGLE}deg`],
  });

  const getArcPath = (angle: number) => {
    const r = 120, cx = 150, cy = 150;
    const sweep = (angle / MAX_ROLL_ANGLE) * 120;
    const start = { x: cx, y: cy - r };
    const angleFromZero = sweep + 270;
    const endX = cx + r * Math.cos((angleFromZero * Math.PI) / 180);
    const endY = cy + r * Math.sin((angleFromZero * Math.PI) / 180);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${Math.abs(sweep) > 180 ? 1 : 0} ${sweep > 0 ? 1 : 0} ${endX} ${endY}`;
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setMapPageIndex(index);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.BG_PRIMARY }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.TEXT_PRIMARY }]}>PrimeLean Monitor</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity onPress={() => setOrientationMode(prev => prev === "Portrait" ? "Landscape" : "Portrait")} style={styles.iconBtn}>
              <Ionicons name={orientationMode === "Portrait" ? "phone-portrait" : "phone-landscape"} size={24} color={colors.TEXT_PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setColorScheme(prev => prev === "dark" ? "light" : "dark")} style={styles.iconBtn}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={colors.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Speed Card */}
        <MonitoringCard title="KECEPATAN" colors={colors} style={styles.speedCardOverride}>
          <Text style={{ color: colors.TEXT_PRIMARY, fontSize: 80, fontWeight: "900" }}>{currentSpeed}</Text>
          <View style={[styles.speedBarContainer, { backgroundColor: isDark ? "#1E293B" : "#E2E8F0" }]}>
            <Animated.View style={[styles.speedBar, { width: speedAnim.interpolate({ inputRange: [0, 160], outputRange: ["0%", "100%"] }), backgroundColor: colors.ACCENT_INFO }]} />
          </View>
        </MonitoringCard>

        {/* Horizontal Scroll: Roll & Map */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          onScroll={handleScroll}
          scrollEventThrottle={200}
          showsHorizontalScrollIndicator={false}
        >
          {/* Roll Card */}
          <View style={[styles.mapCard, { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER }]}>
            <Text style={[styles.cardTitle, { color: colors.TEXT_PRIMARY }]}>Sudut Roll</Text>
            <View style={{ alignItems: 'center' }}>
                <Svg height="200" width="300">
                    <Path d={`M${150 - 120} 150 A120 120 0 0 1 ${150 + 120} 150`} stroke={colors.BORDER} strokeWidth="8" fill="none" />
                    <Path d={getArcPath(displayRoll)} stroke={Math.abs(displayRoll) > DANGER_ROLL_THRESHOLD ? colors.ACCENT_DANGER : colors.ACCENT_SAFE} strokeWidth="8" fill="none" />
                </Svg>
                <Animated.View style={[styles.bike, { transform: [{ rotate: rotation }], backgroundColor: colors.TEXT_PRIMARY, marginTop: -60 }]} />
                <Text style={[styles.angleText, { color: colors.TEXT_PRIMARY }]}>{Math.abs(displayRoll)}°</Text>
            </View>
          </View>

          {/* Map Card */}
          <View style={[styles.mapCard, { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER }]}>
            <Text style={[styles.cardTitle, { color: colors.TEXT_PRIMARY }]}>Peta</Text>
            <MapView 
                provider={PROVIDER_GOOGLE} 
                style={styles.map} 
                region={locationPoints.length > 0 ? {
                    latitude: locationPoints[locationPoints.length-1].latitude,
                    longitude: locationPoints[locationPoints.length-1].longitude,
                    latitudeDelta: 0.01, longitudeDelta: 0.01
                } : undefined}
            >
                {locationPoints.length > 0 && <Polyline coordinates={locationPoints} strokeWidth={5} strokeColor={colors.ACCENT_INFO} />}
            </MapView>
          </View>
        </ScrollView>

        <PaginationDots count={2} activeIndex={mapPageIndex} colors={colors} />

        {/* Control Buttons */}
        <View style={styles.controlsWrap}>
          <TouchableOpacity
            onPressIn={() => onPressIn("start")}
            onPressOut={() => onPressOut()}
            onPress={startMonitoring}
            disabled={status === "Connected"}
            style={[styles.controlBtn, status === "Connected" && styles.btnDisabled, { backgroundColor: "#10B981" }]}
          >
            <Ionicons name="play-circle" size={28} color="#fff" />
            <Text style={styles.btnText}>MULAI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => onPressIn("pause")}
            onPressOut={() => onPressOut()}
            onPress={togglePause}
            disabled={status === "Disconnected"}
            style={[styles.controlBtn, status === "Disconnected" && styles.btnDisabled, { backgroundColor: "#F59E0B" }]}
          >
            <Ionicons name={paused ? "play-circle" : "pause-circle"} size={28} color="#fff" />
            <Text style={styles.btnText}>{paused ? "LANJUT" : "PAUSE"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => onPressIn("save")}
            onPressOut={() => onPressOut()}
            onPress={saveData}
            disabled={locationPoints.length === 0}
            style={[styles.controlBtn, locationPoints.length === 0 && styles.btnDisabled, { backgroundColor: "#3B82F6" }]}
          >
            <Ionicons name="cloud-upload" size={28} color="#fff" />
            <Text style={styles.btnText}>SIMPAN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPressIn={() => onPressIn("stop")}
            onPressOut={() => onPressOut()}
            onPress={stopMonitoring}
            style={[styles.controlBtn, { backgroundColor: "#EF4444" }]}
          >
            <Ionicons name="stop-circle" size={28} color="#fff" />
            <Text style={styles.btnText}>STOP</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: "900" },
  iconBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(150,150,150,0.1)' },
  speedCardOverride: { margin: 20, padding: 30, alignItems: 'center', borderRadius: 20 },
  speedBarContainer: { width: "100%", height: 12, borderRadius: 6, overflow: "hidden", marginTop: 20 },
  speedBar: { height: "100%" },
  mapCard: { width: SCREEN_WIDTH - 40, marginHorizontal: 20, borderRadius: 24, padding: 20, borderWidth: 1, height: 400 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  map: { width: "100%", height: 280, borderRadius: 15 },
  bike: { width: 30, height: 70, borderRadius: 15 },
  angleText: { fontSize: 32, fontWeight: "900", marginTop: 10 },
  controlsWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 20 },
  controlBtn: { width: 85, height: 85, borderRadius: 20, justifyContent: "center", alignItems: "center", elevation: 5 },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 10, marginTop: 5 },
  dotContainer: { flexDirection: "row", justifyContent: "center", marginTop: 15 },
  dot: { height: 8, width: 8, borderRadius: 4, marginHorizontal: 4 },
});