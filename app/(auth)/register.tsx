import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AuthButton from "../../components/buttonprimary";
import AuthInput from "../../components/inputfield";

export default function RegisterScreen() {
  const router = useRouter();

  // Simulasi state dummy untuk input
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }
    alert("UI Only — Register Success (dummy)");
    router.replace("../(tabs)");
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#0F172A", // Dark background
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          marginBottom: 40,
          textAlign: "center",
          color: "#fff",
        }}
      >
        Create Account ✨
      </Text>

      <AuthInput
        label="Full Name"
        placeholder="Your name"
        value={name}
        onChangeText={setName}
      />
      <AuthInput
        label="Email"
        placeholder="Your email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthInput
        label="Password"
        placeholder="Create password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <AuthButton title="Sign Up" onPress={handleRegister} />

      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text
          style={{
            textAlign: "center",
            marginTop: 20,
            color: "#CBD5E1",
          }}
        >
          Already have an account?{" "}
          <Text style={{ color: "#3B82F6", fontWeight: "bold" }}>Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
