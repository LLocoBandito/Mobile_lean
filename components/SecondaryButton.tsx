import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
}

const SecondaryButton: React.FC<SecondaryButtonProps> = ({ title, onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#475569",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  text: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SecondaryButton;
