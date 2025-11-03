import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function Detail() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tiltData, setTiltData] = useState({
    left: 0,
    right: 0,
    gforce: 0,
  });
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    let accelSub: any;
    let gyroSub: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    })();

    Accelerometer.setUpdateInterval(300);
    Gyroscope.setUpdateInterval(300);

    accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const gforce = Math.sqrt(x * x + y * y + z * z).toFixed(2);
      setTiltData((prev) => ({ ...prev, gforce: parseFloat(gforce) }));
    });

    gyroSub = Gyroscope.addListener(({ x, y }) => {
      const left = y < 0 ? parseFloat(Math.abs(y * 45).toFixed(2)) : 0;
      const right = y > 0 ? parseFloat(Math.abs(y * 45).toFixed(2)) : 0;

      setTiltData((prev) => ({
        ...prev,
        left,
        right,
      }));
    });

    setTimeout(() => setLoading(false), 1500);

    return () => {
      accelSub && accelSub.remove();
      gyroSub && gyroSub.remove();
    };
  }, []);

  const handleExit = () => {
    router.push("/manage"); // ✅ arahkan ke halaman Manage
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Detail Monitoring</Text>

      {/* PETA GPS */}
      <View style={styles.mapContainer}>
        {loading || !location ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.mapLoadingText}>Memuat peta...</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Lokasi Sekaran"
              description="Titik awal perjalanan"
            />
          </MapView>
        )}
      </View>

      {/* DATA SENSOR */}
      <View style={styles.dataContainer}>
        <Text style={styles.sectionTitle}>📊 Data Sensor</Text>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Kemiringan Kiri:</Text>
          <Text style={styles.dataValue}>{tiltData.left}°</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Kemiringan Kanan:</Text>
          <Text style={styles.dataValue}>{tiltData.right}°</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>G-Force Akselerasi:</Text>
          <Text style={styles.dataValue}>{tiltData.gforce} g</Text>
        </View>
      </View>

      {/* TOMBOL KELUAR */}
      <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
        <Text style={styles.exitButtonText}>Keluar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 15,
  },
  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#E5E7EB",
  },
  map: {
    flex: 1,
    width: width - 40,
    height: 300,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapLoadingText: {
    color: "#6B7280",
    marginTop: 8,
  },
  dataContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  dataLabel: {
    color: "#6B7280",
    fontWeight: "500",
  },
  dataValue: {
    fontWeight: "700",
    color: "#111827",
  },
  exitButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 25,
  },
  exitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
