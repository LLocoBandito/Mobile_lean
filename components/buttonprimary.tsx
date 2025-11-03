import React from "react";
import { GestureResponderEvent, Text, TouchableOpacity } from "react-native";

// ✅ Definisikan tipe props
type AuthButtonProps = {
  title: string; // teks tombol
  onPress: (event: GestureResponderEvent) => void; // fungsi saat tombol ditekan
  backgroundColor?: string; // opsional, untuk ubah warna background
  textColor?: string; // opsional, untuk ubah warna teks
};

export default function AuthButton({
  title,
  onPress,
  backgroundColor = "#3b82f6",
  textColor = "#fff",
}: AuthButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
