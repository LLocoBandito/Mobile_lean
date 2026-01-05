import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { FC } from "react";
import { TouchableOpacity } from "react-native";

// Mock for external dependencies
type ColorScheme = "light" | "dark";
interface ColorPalette {
  tint: string;
  background: string;
}
type ColorsType = Record<ColorScheme, ColorPalette>;

const useColorScheme = (): ColorScheme | null => "light";
const Colors: ColorsType = {
  light: { tint: "#0A7EA4", background: "#fff" },
  dark: { tint: "#fff", background: "#000" },
};

const HapticTab = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => <TouchableOpacity {...props}>{children}</TouchableOpacity>;

interface TabBarIconProps {
  name: keyof typeof Feather.glyphMap;
  color: string;
}

const RealTabBarIcon: FC<TabBarIconProps> = ({ name, color }) => (
  <Feather name={name} size={24} color={color} />
);

const TabLayout: FC = () => {
  // const colorScheme = useColorScheme();
  // const activeColor = Colors[colorScheme ?? "light"].tint;

  // Tetapkan warna untuk tab bar yang hitam
  const BLACK_COLOR = "#000";
  const ACTIVE_COLOR_ON_BLACK = "#ffffff"; // Putih untuk ikon/teks aktif
  const INACTIVE_COLOR_ON_BLACK = "#aaaaaa"; // Abu-abu terang untuk ikon/teks non-aktif

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR_ON_BLACK, // Gunakan warna terang
        tabBarInactiveTintColor: INACTIVE_COLOR_ON_BLACK, // Gunakan warna terang
        headerShown: false,
        tabBarButton: HapticTab as any,
        tabBarStyle: {
          // DIUBAH: Setel latar belakang menjadi hitam secara langsung
          backgroundColor: BLACK_COLOR,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <RealTabBarIcon name="home" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="manage"
        options={{
          title: "Manage",
          tabBarIcon: ({ color }) => (
            <RealTabBarIcon name="settings" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabLayout;
