import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.unit}>Unit</Text>
        <Text style={styles.name}>Filipi Oliva - BV-1303</Text>
      </View>
      <Ionicons
        style={styles.settings}
        name="settings-outline"
        size={35}
        color="black"
      />
    </View>
  );
}
