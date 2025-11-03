import React from "react";
import { Text, TextInput, View } from "react-native";

type AuthInputProps = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  value?: string;
  onChangeText?: (text: string) => void;
};

export default function AuthInput({
  label,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  value,
  onChangeText,
}: AuthInputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontWeight: "600", color: "#fff", marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        style={{
          backgroundColor: "#1E293B",
          color: "#fff",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
        }}
      />
    </View>
  );
}
