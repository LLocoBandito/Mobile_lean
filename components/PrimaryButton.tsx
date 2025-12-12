// components/PrimaryButton.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

interface Props {
  text: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  color?: string; // default: biru PrimeLean
  textColor?: string;
  borderColor?: string;
}

export default function PrimaryButton({
  text,
  onPress,
  icon,
  loading = false,
  color = "#3B82F6",
  textColor = "#FFF",
  borderColor,
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: color, borderColor: borderColor || color },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={22}
              color={textColor}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={[styles.text, { color: textColor }]}>{text}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
