import { Octicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export interface AddButtonProps {
  onPress: () => void;
  /**
   * O que o botao adiciona, para quem usa leitor de tela. O padrao preserva o uso original em
   * visitantes; a feature de newsletter foi o segundo uso e pediu o proprio rotulo.
   */
  accessibilityLabel?: string;
}

export const styles = StyleSheet.create({
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: "absolute",
    bottom: 80,
    right: 30,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "3px 4px 5px rgba(0, 0, 0, 0.1)",
  },
  label: {
    fontWeight: "bold",
  },
});

export default function AddButton({
  onPress,
  accessibilityLabel = "Add visitor",
}: AddButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Octicons name="plus" size={40} color={Colors.textOnAccent} />
    </TouchableOpacity>
  );
}
