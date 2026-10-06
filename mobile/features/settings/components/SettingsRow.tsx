import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";

/**
 * Uma linha do menu de configurações: ícone, rótulo, e a seta de "abre outra tela".
 *
 * Componente puro: recebe o que mostrar e o callback por props (constituição, Princípio II).
 */

export interface SettingsRowProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  /** Texto menor sob o rótulo, quando ajuda a decidir antes de tocar. */
  detail?: string;
  /** `danger` pinta a linha de vermelho: é a de apagar a conta. */
  tone?: "default" | "danger";
  onPress: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    texts: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    labelDanger: {
      color: colors.danger,
    },
    detail: {
      fontSize: 13,
      color: colors.textMuted,
    },
  })
);

export default function SettingsRow({
  icon,
  label,
  detail,
  tone = "default",
  onPress,
}: SettingsRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tint = tone === "danger" ? colors.danger : colors.textPrimary;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.texts}>
        <Text
          style={[styles.label, tone === "danger" && styles.labelDanger]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
