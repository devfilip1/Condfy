import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/features/auth";

export const styles = StyleSheet.create({
  container: {
    height: 100,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
  },
  settings: {
    position: "absolute",
    right: 20,
    top: 60,
  },
  unit: {
    fontSize: 12,
    color: "#B7B7B7",
    fontWeight: "semibold",
    textTransform: "uppercase",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});

export default function HeaderHome() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.unit}>Unit</Text>
        <Text style={styles.name}>Filipi Oliva - BV-1303</Text>
      </View>
      <TouchableOpacity
        style={styles.settings}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={35} color="black" />
      </TouchableOpacity>
    </View>
  );
}
