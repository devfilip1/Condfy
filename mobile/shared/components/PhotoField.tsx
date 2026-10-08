import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Photo from "@/shared/components/Photo";
import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

/**
 * O campo de foto de um formulário: a pré-visualização, uma linha de orientação e as ações.
 *
 * Puro: recebe o endereço da pré-visualização e callbacks por props (constituição, Princípio II).
 * Abrir a câmera ou a galeria é de quem consome.
 *
 * Nasceu como o campo da foto do condomínio e veio para `shared/` no segundo uso — o formulário de
 * um local de reserva —, como manda o Princípio II. Por isso recebe só o ENDEREÇO da prévia, e não
 * o tipo de foto de uma feature: `shared/` não importa de feature nenhuma.
 *
 * A pré-visualização é 16:9, a proporção em que as duas fotos aparecem depois (o banner da home e o
 * topo da tela de reserva): o que a pessoa vê aqui é o enquadramento que ela vai ter lá.
 */

export interface PhotoFieldProps {
  /** Endereço local da foto escolhida, ou `null` enquanto não há nenhuma. */
  previewUri: string | null;
  /** A linha embaixo da prévia: o tamanho recomendado. */
  hint: string;
  /** O que a foto mostra, para quem usa leitor de tela. */
  accessibilityLabel: string;
  error?: string;
  /** Envio em andamento: as ações ficam paradas. */
  disabled?: boolean;
  onTake: () => void;
  onChoose: () => void;
  onRemove: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      gap: 10,
    },
    preview: {
      width: "100%",
      aspectRatio: 16 / 9,
      borderRadius: radius.card,
    },
    hint: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    action: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.control,
      backgroundColor: colors.chipBackground,
    },
    actionDisabled: {
      opacity: 0.5,
    },
    actionLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    removeLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.danger,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
  })
);

export default function PhotoField({
  previewUri,
  hint,
  accessibilityLabel,
  error,
  disabled = false,
  onTake,
  onChoose,
  onRemove,
}: PhotoFieldProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Photo
        uri={previewUri}
        style={styles.preview}
        iconSize={40}
        accessibilityLabel={accessibilityLabel}
      />

      <Text style={styles.hint}>{hint}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.action, disabled && styles.actionDisabled]}
          onPress={onTake}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.actionLabel}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.action, disabled && styles.actionDisabled]}
          onPress={onChoose}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.actionLabel}>Choose photo</Text>
        </TouchableOpacity>
        {previewUri !== null ? (
          <TouchableOpacity
            style={[styles.action, disabled && styles.actionDisabled]}
            onPress={onRemove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
          >
            <Text style={styles.removeLabel}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
