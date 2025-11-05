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
  Alert,
  FlatList,
  Modal,
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
  path?: {
    latitude: number;
    longitude: number;
    roll?: number;
    pitch?: number;
    timestamp: string;
  }[];
  avgRoll?: number;
  avgPitch?: number;
  [key: string]: any;
}

export default function Manage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputName, setInputName] = useState("");
  const [dataList, setDataList] = useState<MonitoringSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] =
    useState<MonitoringSession | null>(null);

  // 🔹 Ambil data dari Firestore
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
          totalLocationPoints: data.totalLocationPoints || 0,
          path: data.path || [],
          avgRoll: data.avgRoll || 0,
          avgPitch: data.avgPitch || 0,
          ...data,
        });
      });
      firebaseData.sort(
        (a, b) =>
          new Date(b.startPoint?.timestamp || 0).getTime() -
          new Date(a.startPoint?.timestamp || 0).getTime()
      );
      setDataList(firebaseData);
    } catch (error) {
      console.error("Error getting documents: ", error);
      Alert.alert("Error", "Gagal memuat data dari database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 🔹 Hapus sesi
  const handleDelete = (id: string) => {
    Alert.alert(
      "Konfirmasi Hapus",
      "Apakah Anda yakin ingin menghapus sesi ini?",
      [
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
              console.error("Error deleting document: ", error);
              Alert.alert("Error", "Gagal menghapus sesi.");
            }
          },
        },
      ]
    );
  };

  // 🔹 Simpan hasil edit
  const handleEditSave = async () => {
    if (!selectedSession || !inputName.trim()) {
      Alert.alert("Perhatian", "Nama sesi tidak boleh kosong.");
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
      Alert.alert("Sukses", "Nama sesi berhasil diperbarui!");
    } catch (error) {
      console.error("Error updating document: ", error);
      Alert.alert("Error", "Gagal memperbarui nama sesi.");
    }
  };

  // 🔹 Buka modal edit
  const openEditModal = (item: MonitoringSession) => {
    setSelectedSession(item);
    setInputName(item.sessionName);
    setModalVisible(true);
  };

  // 🔹 Render item daftar
  const renderItem = ({ item }: { item: MonitoringSession }) => (
    <View style={styles.card}>
      <View>
        <Text style={styles.cardName}>{item.sessionName}</Text>
        <Text style={styles.cardValue}>
          Total Titik GPS: {item.totalLocationPoints ?? "N/A"}
        </Text>
        <Text style={styles.cardValue}>
          Waktu Mulai:{" "}
          {new Date(item.startPoint?.timestamp || 0).toLocaleString()}
        </Text>
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <Feather name="edit-2" size={20} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Feather name="trash-2" size={20} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/detail/[id]",
              params: { id: item.id },
            })
          }
        >
          <Feather name="info" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Sesi Monitoring</Text>

      {loading ? (
        <Text style={styles.loadingText}>Memuat data...</Text>
      ) : dataList.length === 0 ? (
        <Text style={styles.loadingText}>
          Belum ada sesi monitoring tersimpan.
        </Text>
      ) : (
        <FlatList
          data={dataList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 50 }}
        />
      )}

      {/* Modal Edit */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Nama Sesi</Text>
            <TextInput
              placeholder="Masukkan nama baru"
              style={styles.input}
              value={inputName}
              onChangeText={setInputName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#10B981" }]}
                onPress={handleEditSave}
              >
                <Text style={styles.modalButtonText}>Simpan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  loadingText: { color: "#6B7280", textAlign: "center", marginTop: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  cardName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardValue: { color: "#6B7280", fontSize: 13 },
  actionContainer: { flexDirection: "row", gap: 15, alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 12,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    color: "#111827",
  },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
