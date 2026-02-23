import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const styles = StyleSheet.create({
  container: {
    marginHorizontal: 25,
    padding: 20,
    backgroundColor: "white",
    borderRadius: 20,
    boxShadow: "0px 4px 3px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  containerUpSide: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    boxShadow: "0px 2px 0px rgba(0, 0, 0, 0.1)",
    paddingBottom: 10,
  },
  name: {
    fontSize: 14,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  role: {
    fontSize: 12,
    color: "#B7B7B7",
  },
});

export default function Visitant() {
  return (
    <View style={styles.container}>
      <View style={styles.containerUpSide}>
        <Ionicons name="person-circle-outline" size={50} color="black" />
        <View>
          <Text style={styles.name}>Filipi Morgado de Oliva</Text>
          <Text style={styles.role}>Visitor</Text>
        </View>
      </View>
      <Text>Acess authorized by: Jane Smith</Text>
    </View>
  );
}
