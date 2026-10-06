import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { makeStyles } from "@/shared/theme";

export interface PrimaryButtonProps {
  label: string;
  /** Rótulo exibido enquanto `busy` é verdadeiro. */
  busyLabel: string;
  busy: boolean;
  onPress: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    button: {
      backgroundColor: colors.accent,
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
      color: colors.textOnAccent,
    },
  })
);

/** Botão principal das telas de sessão. Desativa enquanto a operação está em andamento. */
export default function PrimaryButton({
  label,
  busyLabel,
  busy,
  onPress,
}: PrimaryButtonProps) {
  const styles = useStyles();
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
