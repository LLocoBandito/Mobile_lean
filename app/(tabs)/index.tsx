import { Ionicons } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

export default function Home() {
  const [status, setStatus] = useState("Disconnected");
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      /**
       * Orientasi: HP vertikal di motor
       * - x = kiri–kanan
       * - y = atas–bawah
       * - z = ke depan/belakang layar
       */
      const rollRad = Math.atan2(-x, z); // dibalik (-x) agar arah lean sesuai
      const pitchRad = Math.atan2(y, Math.sqrt(x * x + z * z));

      const rollDeg = (rollRad * 180) / Math.PI;
      const pitchDeg = (pitchRad * 180) / Math.PI;

      const clampedRoll = Math.max(-50, Math.min(50, rollDeg));

      Animated.timing(rotateAnim, {
        toValue: clampedRoll,
        duration: 120,
        useNativeDriver: true,
      }).start();

      setRoll(Math.round(clampedRoll));
      setPitch(Math.round(pitchDeg));
    });

    return () => subscription && subscription.remove();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [-50, 50],
    outputRange: ["-50deg", "50deg"],
  });

  const handleReset = () => {
    setStatus("Disconnected");
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const buttonSize = Dimensions.get("window").width / 2.4;

  // Fungsi bantu untuk menggambar arc
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angle: number
  ) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const getArcPath = (angle: number) => {
    const radius = 120;
    const centerX = 150;
    const centerY = 150;
    const sweep = (angle / 50) * 120;
    const mid = polarToCartesian(centerX, centerY, radius, 0);
    const end = polarToCartesian(centerX, centerY, radius, sweep);
    const largeArcFlag = Math.abs(sweep) > 180 ? 1 : 0;
    const path = `M ${mid.x} ${mid.y} A ${radius} ${radius} 0 ${largeArcFlag} ${
      sweep > 0 ? 1 : 0
    } ${end.x} ${end.y}`;
    return path;
  };

  return (
    <ScrollView style={styles.container}>
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

      {/* Visualisasi Motor */}
      <View style={styles.visualContainer}>
        <Svg height="200" width="300">
          {/* Arc dasar */}
          <Path
            d="M30 150 A120 120 0 0 1 270 150"
            stroke="#1F2937"
            strokeWidth="10"
            fill="none"
          />

          {/* Arc aktif */}
          <Path
            d={getArcPath(roll)}
            stroke={roll === 0 ? "#9CA3AF" : roll > 0 ? "#10B981" : "#EF4444"}
            strokeWidth="10"
            fill="none"
          />
        </Svg>

        {/* Sudut kemiringan */}
        <Text style={styles.angleText}>{Math.abs(roll)}°</Text>

        {/* Motor */}
        <Animated.View
          style={[styles.bikeContainer, { transform: [{ rotate: rotation }] }]}
        >
          <View style={styles.bike} />
        </Animated.View>

        <Text style={styles.statusDirection}>
          {roll === 0 ? "Center" : roll > 0 ? "Tilting Right" : "Tilting Left"}
        </Text>
        <Text style={styles.pitchText}>Pitch: {pitch}°</Text>
      </View>

      {/* Tombol Kontrol */}
      <View style={styles.controlButtons}>
        <TouchableOpacity
          style={[
            styles.mainBtn,
            { backgroundColor: "#10B981", width: buttonSize },
          ]}
          onPress={() => setStatus("Connected")}
        >
          <Ionicons name="play-outline" size={20} color="#fff" />
          <Text style={styles.mainBtnText}>Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainBtn,
            { backgroundColor: "#FBBF24", width: buttonSize },
          ]}
          onPress={() => setStatus("Paused")}
        >
          <Ionicons name="pause-outline" size={20} color="#fff" />
          <Text style={styles.mainBtnText}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainBtn,
            { backgroundColor: "#EF4444", width: buttonSize },
          ]}
          onPress={handleReset}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.mainBtnText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainBtn,
            { backgroundColor: "#3B82F6", width: buttonSize },
          ]}
          onPress={() => alert("Data disimpan ke Manage.tsx (simulasi)")}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.mainBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
  },
  visualContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  angleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E5E7EB",
    position: "absolute",
    top: 60,
    left: 55,
  },
  pitchText: {
    color: "#9CA3AF",
    marginTop: 10,
    fontSize: 16,
  },
  bikeContainer: {
    marginTop: -60,
  },
  bike: {
    width: 40,
    height: 90,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
  },
  statusDirection: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "500",
    marginTop: 15,
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
  mainBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
