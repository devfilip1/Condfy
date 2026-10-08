import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  MESSAGE_ADMIN_TAKEN,
  STAFF_ROLE_LABELS,
  StaffRole,
} from "@/features/staff/domain/staff";
import { makeStyles } from "@/shared/theme";

/**
 * A escolha do cargo: Administrator ou Doorman, e mais nada (FR-012).
 *
 * Componente puro: recebe o valor e o callback por props (constituição, Princípio II).
 *
 * `administratorTaken` deixa a opção "Administrator" indisponível e diz POR QUÊ ao lado — uma
 * opção cinza sem explicação parece defeito. Se a pessoa em tela É a administradora, quem chama
 * passa `false`: o lugar está ocupado por ela mesma.
 */

export interface RoleChoiceProps {
  label: string;
  value: StaffRole | null;
  onChange: (role: StaffRole) => void;
  administratorTaken?: boolean;
  /** Trava as duas opções enquanto uma mudança está em andamento. */
  disabled?: boolean;
  /** Mensagem sob o campo; vem do domínio ou do servidor, sem tradução. */
  error?: string | null;
}

const ROLES: readonly StaffRole[] = ["admin", "doorman"];

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    options: {
      flexDirection: "row",
      gap: 10,
    },
    option: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
      paddingVertical: 12,
      alignItems: "center",
    },
    optionSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    optionUnavailable: {
      opacity: 0.5,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
    },
    error: {
      fontSize: 13,
      color: colors.danger,
    },
  })
);

export default function RoleChoice({
  label,
  value,
  onChange,
  administratorTaken = false,
  disabled = false,
  error,
}: RoleChoiceProps) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.options} accessibilityRole="radiogroup">
        {ROLES.map((role) => {
          const selected = value === role;
          const unavailable = role === "admin" && administratorTaken && !selected;
          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.option,
                selected ? styles.optionSelected : null,
                unavailable ? styles.optionUnavailable : null,
              ]}
              onPress={() => onChange(role)}
              disabled={disabled || unavailable}
              accessibilityRole="radio"
              accessibilityState={{
                selected,
                disabled: disabled || unavailable,
              }}
              accessibilityLabel={STAFF_ROLE_LABELS[role]}
            >
              <Text style={styles.optionLabel}>{STAFF_ROLE_LABELS[role]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {administratorTaken && value !== "admin" ? (
        <Text style={styles.hint}>{MESSAGE_ADMIN_TAKEN}</Text>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
