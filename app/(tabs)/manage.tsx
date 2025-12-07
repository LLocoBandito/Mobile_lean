import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../utils/firebaseConfig";

interface MonitoringSession {
  id: string;
  sessionName: string;
  startPoint: { timestamp: string };
  totalLocationPoints: number;
  path?: any[];
  avgRoll?: number;
  avgPitch?: number;
}

export default function Manage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputName, setInputName] = useState("");
  const [dataList, setDataList] = useState<MonitoringSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] =
    useState<MonitoringSession | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(
        collection(db, "monitoring_sessions")
      );
      const firebaseData: MonitoringSession[] = [];

      querySnapshot.forEach((document) => {
        const data = document.data();
        firebaseData.push({
          id: document.id,
          sessionName: data.sessionName || "Sesi Tanpa Nama",
          startPoint: data.startPoint,
          totalLocationPoints: data.totalPoints || 0,
          path: data.path || [],
          avgRoll: data.avgRoll || 0,
          avgPitch: data.avgPitch || 0,
        });
      });

      firebaseData.sort(
        (a, b) =>
          new Date(b.startPoint?.timestamp || 0).getTime() -
          new Date(a.startPoint?.timestamp || 0).getTime()
      );
      setDataList(firebaseData);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Gagal memuat data dari database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = (id: string) => {
    Alert.alert("Hapus Sesi", "Yakin ingin menghapus sesi ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "monitoring_sessions", id));
            setDataList((prev) => prev.filter((item) => item.id !== id));
            Alert.alert("Sukses", "Sesi berhasil dihapus!");
          } catch (error) {
            Alert.alert("Error", "Gagal menghapus sesi.");
          }
        },
      },
    ]);
  };

  const openEditModal = (item: MonitoringSession) => {
    setSelectedSession(item);
    setInputName(item.sessionName);
    setModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!selectedSession || !inputName.trim()) {
      Alert.alert("Perhatian", "Nama sesi tidak boleh kosong!");
      return;
    }

    try {
      await updateDoc(doc(db, "monitoring_sessions", selectedSession.id), {
        sessionName: inputName.trim(),
      });

      setDataList((prev) =>
        prev.map((item) =>
          item.id === selectedSession.id
            ? { ...item, sessionName: inputName.trim() }
            : item
        )
      );

      setModalVisible(false);
      setInputName("");
      setSelectedSession(null);
      Alert.alert("Sukses", "Nama sesi berhasil diubah!");
    } catch (error) {
      Alert.alert("Error", "Gagal mengubah nama sesi.");
    }
  };

  const renderItem = ({ item }: { item: MonitoringSession }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.sessionName} numberOfLines={1}>
          {item.sessionName}
        </Text>
        <Text style={styles.sessionInfo}>
          Titik GPS: {item.totalLocationPoints.toLocaleString()}
        </Text>
        <Text style={styles.sessionDate}>
          {new Date(item.startPoint?.timestamp || 0).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openEditModal(item)}
        >
          <Feather name="edit-2" size={22} color="#A78BFA" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id)}
        >
          <Feather name="trash-2" size={22} color="#F87171" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/detail/${item.id}`)}
        >
          <Feather name="eye" size={24} color="#60A5FA" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        {/* Gradient overlay */}
        <View style={styles.overlay} pointerEvents="none" />

        <View style={styles.header}>
          <Text style={styles.title}>Data Sesi Monitoring</Text>
          <Text style={styles.subtitle}>Kelola semua sesi monitoring kamu</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.loadingText}>Memuat data sesi...</Text>
          </View>
        ) : dataList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="database" size={80} color="#475569" />
            <Text style={styles.emptyText}>Belum ada sesi monitoring</Text>
            <Text style={styles.emptySubtext}>
              Mulai monitoring untuk melihat data di sini
            </Text>
          </View>
        ) : (
          <FlatList
            data={dataList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Modal Edit Nama Sesi */}
        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ubah Nama Sesi</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Masukkan nama baru..."
                placeholderTextColor="#94A3B8"
                value={inputName}
                onChangeText={setInputName}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSave]}
                  onPress={handleEditSave}
                >
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                    Simpan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
  },

  header: { padding: 24, paddingTop: 60, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#F8FAFC" },
  subtitle: { fontSize: 16, color: "#94A3B8", marginTop: 8 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#94A3B8", marginTop: 16, fontSize: 16 },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "600",
    marginTop: 20,
  },
  emptySubtext: {
    color: "#94A3B8",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },

  card: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: "rgba(30, 41, 59, 0.95)",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 18,
  },
  cardContent: { flex: 1 },
  sessionName: { color: "#F8FAFC", fontSize: 18, fontWeight: "bold" },
  sessionInfo: { color: "#94A3B8", fontSize: 14, marginTop: 6 },
  sessionDate: { color: "#64748B", fontSize: 13, marginTop: 4 },

  actionButtons: { flexDirection: "row", gap: 18 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "88%",
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "#475569",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    elevation: 25,
  },
  modalTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#475569",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  modalBtnCancel: { backgroundColor: "rgba(148, 163, 184, 0.3)" },
  modalBtnSave: { backgroundColor: "#10B981" },
  modalBtnText: { color: "#F8FAFC", fontWeight: "bold", fontSize: 16 },
});
