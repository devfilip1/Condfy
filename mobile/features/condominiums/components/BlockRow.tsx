import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import {
  BLOCK_CODE_MAX_LENGTH,
  NewBlock,
} from "@/features/condominiums/domain/newCondominium";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

/**
 * Um bloco do condomínio no formulário: a sigla, quantas unidades ele tem, e o remover.
 *
 * Puro: recebe o bloco e callbacks por props (constituição, Princípio II).
 *
 * A sigla chega aqui JÁ normalizada pelo hook — maiúsculas, só letras, no máximo duas. O
 * `maxLength` e o `autoCapitalize` do campo são só para o teclado ajudar; a regra não mora neles.
 */

export interface BlockRowProps {
  /** A posição do bloco na lista, a partir de zero. Serve para os rótulos de acessibilidade. */
  index: number;
  block: NewBlock;
  codeError?: string;
  unitCountError?: string;
  /** `false` quando é o único bloco: um condomínio tem ao menos um. */
  canRemove: boolean;
  onChangeCode: (typed: string) => void;
  onChangeUnitCount: (typed: string) => void;
  onRemove: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    codeColumn: {
      width: 84,
    },
    unitsColumn: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      fontSize: fontSizes.caption,
      fontFamily: fonts.regular,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 4,
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
    inputInvalid: {
      borderColor: colors.danger,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 16,
      color: colors.danger,
      marginTop: 4,
    },
    // Alinhado aos campos, não aos rótulos: o rótulo ocupa a primeira linha da coluna.
    remove: {
      width: 44,
      height: 46,
      marginTop: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    removePlaceholder: {
      width: 44,
    },
  })
);

export default function BlockRow({
  index,
  block,
  codeError,
  unitCountError,
  canRemove,
  onChangeCode,
  onChangeUnitCount,
  onRemove,
}: BlockRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const position = index + 1;

  return (
    <View style={styles.row}>
      <View style={styles.codeColumn}>
        <Text style={styles.label}>Code</Text>
        <TextInput
          style={[styles.input, codeError ? styles.inputInvalid : null]}
          value={block.code}
          onChangeText={onChangeCode}
          placeholder="A"
          placeholderTextColor={colors.textSecondary}
          maxLength={BLOCK_CODE_MAX_LENGTH}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={`Code of block ${position}`}
        />
        {codeError ? <Text style={styles.error}>{codeError}</Text> : null}
      </View>

      <View style={styles.unitsColumn}>
        <Text style={styles.label}>Units</Text>
        <TextInput
          style={[styles.input, unitCountError ? styles.inputInvalid : null]}
          value={block.unitCount}
          onChangeText={onChangeUnitCount}
          placeholder="40"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          accessibilityLabel={`Number of units of block ${position}`}
        />
        {unitCountError ? (
          <Text style={styles.error}>{unitCountError}</Text>
        ) : null}
      </View>

      {/* Com um bloco só não há lixeira nenhuma, nem desabilitada — mas o espaço dela fica. */}
      {canRemove ? (
        <TouchableOpacity
          style={styles.remove}
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove block ${position}`}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      ) : (
        <View style={styles.removePlaceholder} />
      )}
    </View>
  );
}
