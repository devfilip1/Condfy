import { StyleSheet, Text, TextInput, View } from "react-native";
import type { ComponentProps } from "react";

import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

export interface FormFieldProps
  extends Pick<
    ComponentProps<typeof TextInput>,
    | "value"
    | "onChangeText"
    | "placeholder"
    | "autoCapitalize"
    | "autoComplete"
    | "keyboardType"
    | "secureTextEntry"
    | "returnKeyType"
    | "onSubmitEditing"
    | "editable"
  > {
  label: string;
  /** Mensagem sob o field; vem do domínio ou do servidor, sem tradução. */
  error?: string;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    field: {
      gap: 6,
    },
    label: {
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radius.control,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    inputError: {
      borderColor: colors.danger,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
  })
);

/** Campo de formulário das telas de input e cadastro. Puro: não valida nada. */
export default function FormField({ label, error, ...input }: FormFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={colors.textSecondary}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
