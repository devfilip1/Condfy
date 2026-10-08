import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import BlockRow from "@/features/condominiums/components/BlockRow";
import {
  FormErrors,
  NewBlock,
  blockCodeErrorKey,
  blockUnitCountErrorKey,
} from "@/features/condominiums/domain/newCondominium";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

/**
 * Os blocos do condomínio no formulário: as linhas, o "acrescentar" e o total de unidades.
 *
 * Puro: recebe os blocos e callbacks por props (constituição, Princípio II). Quantos blocos cabem,
 * o que é uma sigla válida e quanto dá o total são do domínio e do hook; aqui só se desenha.
 */

export interface BlockListProps {
  blocks: NewBlock[];
  errors: FormErrors;
  total: number;
  /** `false` quando a lista chegou ao teto de blocos. */
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChangeCode: (index: number, typed: string) => void;
  onChangeUnitCount: (index: number, typed: string) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      gap: 12,
    },
    hint: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      color: colors.textMuted,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    add: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.control,
      backgroundColor: colors.chipBackground,
    },
    addDisabled: {
      opacity: 0.5,
    },
    addLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    total: {
      flexShrink: 1,
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
  })
);

export default function BlockList({
  blocks,
  errors,
  total,
  canAdd,
  onAdd,
  onRemove,
  onChangeCode,
  onChangeUnitCount,
}: BlockListProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Give each block a code of one or two letters and say how many units it
        has.
      </Text>

      {blocks.map((block, index) => (
        // A posição como chave é segura aqui: uma linha não guarda state próprio, e tudo o que ela
        // mostra vem das props.
        <BlockRow
          key={index}
          index={index}
          block={block}
          codeError={errors[blockCodeErrorKey(index)]}
          unitCountError={errors[blockUnitCountErrorKey(index)]}
          canRemove={blocks.length > 1}
          onChangeCode={(typed) => onChangeCode(index, typed)}
          onChangeUnitCount={(typed) => onChangeUnitCount(index, typed)}
          onRemove={() => onRemove(index)}
        />
      ))}

      {errors.blocks ? (
        <Text style={styles.error} accessibilityRole="alert">
          {errors.blocks}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.add, !canAdd && styles.addDisabled]}
          onPress={onAdd}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canAdd }}
        >
          <Ionicons name="add" size={18} color={colors.textPrimary} />
          <Text style={styles.addLabel}>Add block</Text>
        </TouchableOpacity>

        <Text style={styles.total}>
          Total: {total} {total === 1 ? "unit" : "units"}
        </Text>
      </View>
    </View>
  );
}
