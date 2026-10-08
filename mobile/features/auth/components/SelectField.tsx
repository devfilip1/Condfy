import { Octicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

/**
 * Um campo de escolha: mostra o que foi escolhido e, ao toque, abre a lista do que existe.
 *
 * Componente puro: recebe as opções, o valor e o callback por props (constituição, Princípio II).
 * O único state é "a lista está aberta", que é dele e de mais ninguém.
 *
 * Feito à mão, sem biblioteca de seletor: são três campos de um formulário, e uma dependência nova
 * para isso não se paga (Princípio V). O aplicativo não tinha lista suspensa — o formulário de
 * visitante escolhe a unidade em pílulas, o que não serve para quarenta apartamentos. Mora nesta
 * feature porque só o cadastro o usa; no segundo uso, vai para `shared/components/`.
 */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label: string;
  placeholder: string;
  /** O valor escolhido, ou `null` enquanto nada foi escolhido. */
  value: string | null;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Não abre: falta escolher o campo de que este depende, ou há um envio em andamento. */
  disabled?: boolean;
  /** Mensagem sob o campo; vem do domínio ou do servidor, sem tradução. */
  error?: string;
  /** O que dizer quando a lista abre vazia. */
  emptyText?: string;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    field: {
      gap: 6,
    },
    label: {
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    input: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 48,
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inputError: {
      borderColor: colors.danger,
    },
    inputDisabled: {
      opacity: 0.5,
    },
    value: {
      flex: 1,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    placeholder: {
      flex: 1,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.overlay,
    },
    sheet: {
      maxHeight: "70%",
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      backgroundColor: colors.cardBackground,
      paddingTop: 16,
      paddingBottom: 24,
    },
    sheetTitle: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    optionLabel: {
      flex: 1,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    empty: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      textAlign: "center",
      color: colors.textMuted,
    },
  })
);

export default function SelectField({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
  error,
  emptyText = "Nothing to choose from.",
}: SelectFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.input,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${label}: ${selected ? selected.label : placeholder}`}
      >
        <Text
          style={selected ? styles.value : styles.placeholder}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Octicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Tocar fora da lista fecha sem escolher. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* O toque DENTRO da folha não pode chegar ao fundo, senão fecharia ao rolar. */}
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.length === 0 ? (
              <Text style={styles.empty}>{emptyText}</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(option) => option.value}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <TouchableOpacity
                      style={styles.option}
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={item.label}
                    >
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {isSelected ? (
                        <Octicons name="check" size={18} color={colors.textPrimary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
