import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FormErrors,
  NAME_MAX_LENGTH,
} from "@/features/reservations/domain/newCommonArea";
import PhotoField from "@/shared/components/PhotoField";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * Formulário de um novo local de reserva: o nome, a taxa de uso e a foto — os três obrigatórios.
 *
 * Puro quanto a dados: guarda só o texto dos dois campos enquanto a pessoa digita. A foto escolhida,
 * a validação e o envio são do hook; abrir a câmera ou a galeria também (constituição, Princípio II).
 *
 * Só é desenhado para o síndico — quem decide isso é a tela, e quem recusa de verdade é a API.
 */

const PHOTO_HINT = "Recommended: 1200 × 675 px (16:9)";

export interface CommonAreaFormModalProps {
  visible: boolean;
  errors: FormErrors;
  /** Endereço local da foto já escolhida, ou `null`. */
  photoPreviewUri: string | null;
  /** Envio em andamento: o botão fica desativado e o formulário não fecha. */
  submitting: boolean;
  /** Falha que não é de um field específico (rede ou servidor). */
  submitError: string | null;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  /** A foto vem do hook; o formulário só entrega o texto. */
  onSubmit: (input: { name: string; usageFee: string }) => void;
  onCancel: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "92%",
      backgroundColor: colors.screenBackground,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    heading: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 20,
    },
    field: { marginBottom: 18 },
    label: {
      fontSize: 12,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    hint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
    error: { fontSize: 13, color: colors.danger, marginTop: 6 },
    actions: { flexDirection: "row", gap: 12, marginTop: 8 },
    button: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancel: { backgroundColor: colors.chipBackground },
    submit: { backgroundColor: colors.accent },
    disabled: { opacity: 0.5 },
    cancelLabel: { fontWeight: "600", color: colors.textPrimary },
    submitLabel: { fontWeight: "bold", color: colors.textOnAccent },
  })
);

export default function CommonAreaFormModal({
  visible,
  errors,
  photoPreviewUri,
  submitting,
  submitError,
  onTakePhoto,
  onChoosePhoto,
  onRemovePhoto,
  onSubmit,
  onCancel,
}: CommonAreaFormModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [usageFee, setUsageFee] = useState("");
  const insets = useSafeAreaInsets();

  // Limpa os campos ao REABRIR, para não vazar o rascunho de uma tentativa anterior. Um envio que
  // falha não fecha o formulário, então nada do que foi digitado se perde.
  useEffect(() => {
    if (visible) {
      setName("");
      setUsageFee("");
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={submitting ? undefined : onCancel}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.heading}>New place</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Party room"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={NAME_MAX_LENGTH}
                  accessibilityLabel="Name of the place"
                />
                {errors.name ? (
                  <Text style={styles.error}>{errors.name}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Usage fee (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={usageFee}
                  onChangeText={setUsageFee}
                  placeholder="150,00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  maxLength={11}
                  accessibilityLabel="Usage fee in reais"
                />
                {errors.usageFee ? (
                  <Text style={styles.error}>{errors.usageFee}</Text>
                ) : (
                  <Text style={styles.hint}>Enter 0 if the place is free.</Text>
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Photo</Text>
                <PhotoField
                  previewUri={photoPreviewUri}
                  hint={PHOTO_HINT}
                  accessibilityLabel="Photo of the place"
                  error={errors.photo}
                  disabled={submitting}
                  onTake={onTakePhoto}
                  onChoose={onChoosePhoto}
                  onRemove={onRemovePhoto}
                />
              </View>

              {submitError ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {submitError}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancel,
                    submitting && styles.disabled,
                  ]}
                  onPress={onCancel}
                  disabled={submitting}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submit,
                    submitting && styles.disabled,
                  ]}
                  onPress={() => onSubmit({ name, usageFee })}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.textOnAccent} />
                  ) : (
                    <Text style={styles.submitLabel}>Create place</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
