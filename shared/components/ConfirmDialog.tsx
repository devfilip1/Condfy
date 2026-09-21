import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export interface ConfirmDialogProps {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
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
 */
export default function ConfirmDialog({
  visible,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              <Text style={styles.confirmLabel}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
