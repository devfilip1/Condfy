import { StyleSheet, Text, TextInput, View } from "react-native";
import type { ComponentProps } from "react";

import { Colors } from "@/shared/constants/Colors";

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

export const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    fontSize: 12,
    color: Colors.danger,
  },
});

/** Campo de formulário das telas de input e cadastro. Puro: não valida nada. */
export default function FormField({ label, error, ...input }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={Colors.textSecondary}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
