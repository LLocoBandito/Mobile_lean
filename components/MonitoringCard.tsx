// components/MonitoringCard.tsx

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MonitoringCardProps {
  title: string;
  children: React.ReactNode;
  // Tambahkan style untuk menyesuaikan lebar atau margin jika diperlukan
  style?: ViewStyle;
  // Warna dinamis dari komponen Home (untuk konsistensi tema)
  colors: {
    BG_CARD: string;
    BORDER: string;
    TEXT_PRIMARY: string;
  };
}

// Menggunakan objek Colors dan Layout dari file utils/theme.ts jika sudah dibuat
// Jika belum, gunakan style lokal/konstanta yang sudah ada

const MonitoringCard: React.FC<MonitoringCardProps> = ({
  title,
  children,
  style,
  colors,
}) => {
  return (
    <View
      style={[
        styles.cardBase, // Style dasar kartu
        { backgroundColor: colors.BG_CARD, borderColor: colors.BORDER },
        style, // Style opsional dari parent
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.TEXT_PRIMARY }]}>
        {title}
      </Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    // Menggabungkan style dari speedCard, accelCard, rollCard, dan mapCard
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 32, // Default: menggunakan radius besar
    padding: 32, // Default: menggunakan padding besar
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 25,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center", // Agar judul di tengah
  },
});

export default MonitoringCard;
