import { Octicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  menuButton: {
    display: "flex",
    position: "absolute",
    bottom: 20,
    marginHorizontal: "25%",
    paddingTop: 10,
    alignItems: "center",
    borderRadius: 23,
    height: 70,
    boxShadow: "0px 4px 5px rgba(0, 0, 0, 0.1)",
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default function MenuButton() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.menuButton,
        tabBarLabelStyle: styles.label,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Octicons name="home" size={32} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color, size }) => (
            <Octicons name="question" size={32} />
          ),
        }}
      />
    </Tabs>
  );
}
