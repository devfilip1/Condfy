import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

export interface ConfirmDialogProps {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Ação em andamento: os dois botões ficam desativados e o diálogo não fecha. */
  busy?: boolean;
  /** Falha da ação, exibida abaixo da message. */
  errorMessage?: string | null;
  /**
   * Rótulos e segundo botão são configuráveis desde o segundo uso (feature de reservas, que só
   * avisa em vez de confirmar). Os defaults preservam o diálogo de remoção, que não mudou.
   */
  confirmLabel?: string;
  busyLabel?: string;
  /** `false` esconde o botão de cancelar: diálogo de aviso, sem nada a recusar. */
  showCancel?: boolean;
  /**
   * `destructive` (padrão) pinta o botão de confirmar de vermelho; `neutral` usa o acento.
   * Um "Got it" vermelho leria como se fosse apagar alguma coisa.
   */
  tone?: "destructive" | "neutral";
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 30,
    },
    dialog: {
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      padding: 25,
      gap: 25,
    },
    message: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    error: {
      marginTop: -15,
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      color: colors.danger,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: radius.control,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    cancelButton: {
      backgroundColor: colors.chipBackground,
    },
    confirmButton: {
      backgroundColor: colors.danger,
    },
    /** Aviso, não ação destrutiva: vermelho aqui leria como "isso apaga alguma coisa". */
    confirmButtonNeutral: {
      backgroundColor: colors.accent,
    },
    cancelLabel: {
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    confirmLabel: {
      fontFamily: fonts.semibold,
      color: colors.textOnStrong,
    },
  })
);

/**
 * Diálogo de confirmação genérico (FR-011).
 *
 * Construído com `Modal` em vez de `Alert.alert` porque `Alert` não funciona em web —
 * a remoção aconteceria sem confirmação no navegador (decisão D-002).
 * `busy` e `errorMessage` são opcionais: quem não os usa mantém o comportamento original.
 */
export default function ConfirmDialog({
  visible,
  message,
  onConfirm,
  onCancel,
  busy = false,
  errorMessage = null,
  confirmLabel = "Remove",
  busyLabel = "Removing…",
  showCancel = true,
  tone = "destructive",
}: ConfirmDialogProps) {
  const styles = useStyles();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? () => {} : onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.message}>{message}</Text>
          {errorMessage ? (
            <Text style={styles.error} accessibilityRole="alert">
              {errorMessage}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {showCancel ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  busy ? styles.buttonDisabled : null,
                ]}
                onPress={onCancel}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.button,
                tone === "neutral"
                  ? styles.confirmButtonNeutral
                  : styles.confirmButton,
                busy ? styles.buttonDisabled : null,
              ]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
            >
              <Text style={styles.confirmLabel}>
                {busy ? busyLabel : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
