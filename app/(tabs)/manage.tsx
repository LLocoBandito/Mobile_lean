import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Manage() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputName, setInputName] = useState("");

  // data dummy untuk tampilan
  const dataDummy = [
    { id: 1, name: "Data 1", value: 0.23 },
    { id: 2, name: "Data 2", value: 0.45 },
    { id: 3, name: "Data 3", value: 0.67 },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Data Tersimpan</Text>

      <FlatList
        data={dataDummy}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardValue}>Rata-rata: {item.value}</Text>
            </View>
            <View style={styles.actionContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                accessibilityLabel="Edit"
              >
                <Feather name="edit-2" size={20} color="#4F46E5" />
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Hapus">
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/detail")}
                accessibilityLabel="Detail"
              >
                <Feather name="info" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal edit (layout saja) */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Data</Text>
            <TextInput
              placeholder="Masukkan nama baru"
              style={styles.input}
              value={inputName}
              onChangeText={setInputName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#4ADE80" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Simpan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#F87171" }]}
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  cardName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardValue: { color: "#6B7280", fontSize: 13 },
  actionContainer: { flexDirection: "row", gap: 15, alignItems: "center" },
  // Removed text styles; colors now applied on icons
  // editText: { color: "#4F46E5", fontWeight: "600" },
  // deleteText: { color: "#EF4444", fontWeight: "600" },
  // detailText: { color: "#3B82F6", fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "85%",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 15 },
  input: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonText: { color: "#fff", fontWeight: "700" },
});
