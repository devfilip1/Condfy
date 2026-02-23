import { Octicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

export const styles = StyleSheet.create({
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "absolute",
    bottom: 80,
    right: 30,
    backgroundColor: "#FFB133",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "3px 4px 5px rgba(0, 0, 0, 0.1)",
  },
  label: {
    fontWeight: "bold",
  },
});

export default function AddButton() {
  return (
    <TouchableOpacity style={styles.button}>
      <Octicons name="plus" size={40} color="black" />
    </TouchableOpacity>
  );
}
