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
  const colorScheme = useColorScheme();
  const activeColor = Colors[colorScheme ?? "light"].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        headerShown: false,
        tabBarButton: HapticTab as any,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
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
