import { useEffect, useState } from "react";
import {
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
  BODY_MAX_LENGTH,
  FormErrors,
  NewNotice,
  TITLE_MAX_LENGTH,
} from "@/features/newsletter/domain/notice";
import DateField from "@/shared/components/DateField";
import { Colors } from "@/shared/constants/Colors";

/**
 * Formulário de publicação de aviso.
 *
 * Só é montado para quem pode publicar, mas esconder não é a permissão: quem recusa de verdade é a
 * API (FR-023). Componente puro — recebe os errors já calculados e devolve a entrada por callback.
 */

export interface NoticeFormModalProps {
  visible: boolean;
  errors: FormErrors;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (input: NewNotice) => void;
  onCancel: () => void;
}

export const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.screenBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    maxHeight: "90%",
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  field: { marginBottom: 18 },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  // O corpo é o primeiro campo longo do projeto: precisa de altura e de crescer para cima.
  bodyInput: { minHeight: 140, textAlignVertical: "top" },
  counter: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: "right" },
  error: { fontSize: 13, color: Colors.danger, marginTop: 6 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancel: { backgroundColor: Colors.chipBackground },
  submit: { backgroundColor: Colors.accent },
  disabled: { opacity: 0.5 },
  cancelLabel: { fontWeight: "600", color: Colors.textPrimary },
  submitLabel: { fontWeight: "bold", color: Colors.textOnAccent },
});

export default function NoticeFormModal({
  visible,
  errors,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: NoticeFormModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const insets = useSafeAreaInsets();

  // Limpa os campos ao reabrir, para não vazar o rascunho de uma tentativa anterior.
  useEffect(() => {
    if (visible) {
      setTitle("");
      setBody("");
      setDate("");
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
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={submitting ? undefined : onCancel}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.heading}>New notice</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What is this about"
                  placeholderTextColor={Colors.textSecondary}
                  maxLength={TITLE_MAX_LENGTH}
                />
                {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Content</Text>
                <TextInput
                  style={[styles.input, styles.bodyInput]}
                  value={body}
                  onChangeText={setBody}
                  placeholder="Leave a blank line between paragraphs"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  maxLength={BODY_MAX_LENGTH}
                />
                <Text style={styles.counter}>
                  {body.length} / {BODY_MAX_LENGTH}
                </Text>
                {errors.body ? <Text style={styles.error}>{errors.body}</Text> : null}
              </View>

              <View style={styles.field}>
                <DateField
                  label="Date"
                  value={date}
                  onChange={setDate}
                  error={errors.date}
                />
              </View>

              {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancel, submitting ? styles.disabled : null]}
                  onPress={onCancel}
                  disabled={submitting}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submit, submitting ? styles.disabled : null]}
                  onPress={() => onSubmit({ title, body, date })}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  <Text style={styles.submitLabel}>
                    {submitting ? "Publishing…" : "Publish"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
