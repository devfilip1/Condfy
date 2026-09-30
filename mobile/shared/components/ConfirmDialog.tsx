import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export interface ConfirmDialogProps {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Ação em andamento: os dois botões ficam desativados e o diálogo não fecha. */
  busy?: boolean;
  /** Falha da ação, exibida abaixo da message. */
  errorMessage?: string | null;
}

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  dialog: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 25,
    gap: 25,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  error: {
    marginTop: -15,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.danger,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: Colors.chipBackground,
  },
  confirmButton: {
    backgroundColor: Colors.danger,
  },
  cancelLabel: {
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  confirmLabel: {
    fontWeight: "600",
    color: Colors.cardBackground,
  },
});

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
}: ConfirmDialogProps) {
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
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                busy ? styles.buttonDisabled : null,
              ]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
            >
              <Text style={styles.confirmLabel}>
                {busy ? "Removing…" : "Remove"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
