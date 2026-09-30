import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export interface PrimaryButtonProps {
  label: string;
  /** Rótulo exibido enquanto `busy` é verdadeiro. */
  busyLabel: string;
  busy: boolean;
  onPress: () => void;
}

export const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.textOnAccent,
  },
});

/** Botão principal das telas de sessão. Desativa enquanto a operação está em andamento. */
export default function PrimaryButton({
  label,
  busyLabel,
  busy,
  onPress,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, busy ? styles.disabled : null]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
    >
      <Text style={styles.label}>{busy ? busyLabel : label}</Text>
    </TouchableOpacity>
  );
}
