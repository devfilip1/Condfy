import { useEffect, useRef, useState } from "react";
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

import DateField from "@/shared/components/DateField";
import { Colors } from "@/shared/constants/Colors";
import {
  FormErrors,
  NAME_MAX_LENGTH,
  NewVisitor,
  VISIT_TYPES,
  VisitType,
} from "@/features/visitors/domain/visitor";

export interface VisitorFormModalProps {
  visible: boolean;
  errors: FormErrors;
  /** Envio em andamento: o botão de submit fica desativado (FR-010). */
  submitting: boolean;
  /** Falha que não é de um field específico (rede ou servidor). */
  submitError: string | null;
  onSubmit: (input: NewVisitor) => void;
  onCancel: () => void;
}

const TYPE_LABELS: Record<VisitType, string> = {
  visitor: "Visitor",
  entrega: "Delivery",
  prestador: "Service",
};

export const styles = StyleSheet.create({
  avoider: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 25,
    paddingTop: 12,
    // A altura máxima é relativa ao espaço restante acima do teclado, não à tela inteira.
    maxHeight: "92%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    color: Colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  chips: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.chipBackground,
  },
  chipSelected: {
    backgroundColor: Colors.accent,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.danger,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: Colors.chipBackground,
  },
  submitButton: {
    backgroundColor: Colors.accent,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitError: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.danger,
  },
  buttonLabel: {
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});

const DEFAULT_TYPE: VisitType = "visitor";

/**
 * Formulário de cadastro sobreposto à list (FR-004, FR-005).
 *
 * O componente não valida nada: apenas coleta os fields e exibe os errors recebidos por prop.
 * A validação é regra de domínio (`domain/visitor.ts`).
 */
export default function VisitorFormModal({
  visible,
  errors,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: VisitorFormModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<VisitType>(DEFAULT_TYPE);
  const [expectedDate, setExpectedDate] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");

  const insets = useSafeAreaInsets();
  const authorizedByField = useRef<TextInput>(null);

  // Limpa os fields ao reabrir, para não vazar data de uma tentativa anterior.
  useEffect(() => {
    if (visible) {
      setName("");
      setType(DEFAULT_TYPE);
      setExpectedDate("");
      setAuthorizedBy("");
    }
  }, [visible]);

  function submit() {
    onSubmit({ name, type, expectedDate, authorizedBy });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.avoider}
        // Sem isto o teclado do iOS sobe por cima da sheet; no Android o ajuste é de altura.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.overlay}>
          {/* Tocar fora da sheet fecha o formulário, como em qualquer bottom sheet. */}
          <Pressable
            style={styles.backdrop}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Close form"
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 35 + insets.bottom }}
            >
              <Text style={styles.title}>New visitor</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Visitor full name"
                  placeholderTextColor={Colors.textSecondary}
                  maxLength={NAME_MAX_LENGTH}
                  autoCapitalize="words"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => authorizedByField.current?.focus()}
                />
                {errors.name ? (
                  <Text style={styles.error}>{errors.name}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Visit type</Text>
                <View style={styles.chips}>
                  {VISIT_TYPES.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.chip,
                        option === type ? styles.chipSelected : null,
                      ]}
                      onPress={() => setType(option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: option === type }}
                    >
                      <Text style={styles.chipLabel}>{TYPE_LABELS[option]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.type ? (
                  <Text style={styles.error}>{errors.type}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Authorized by</Text>
                <TextInput
                  ref={authorizedByField}
                  style={styles.input}
                  value={authorizedBy}
                  onChangeText={setAuthorizedBy}
                  placeholder="Resident name"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                {errors.authorizedBy ? (
                  <Text style={styles.error}>{errors.authorizedBy}</Text>
                ) : null}
              </View>

              {/* Último field do formulário: o calendário cresce no lugar, sem
                  reposicionar a rolagem — era isso que fazia a sheet saltar. */}
              <View style={styles.field}>
                <DateField
                  label="Expected date"
                  value={expectedDate}
                  onChange={setExpectedDate}
                  error={errors.expectedDate}
                />
              </View>

              {submitError ? (
                <Text style={styles.submitError} accessibilityRole="alert">
                  {submitError}
                </Text>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonLabel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    submitting ? styles.submitButtonDisabled : null,
                  ]}
                  onPress={submit}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  <Text style={styles.buttonLabel}>
                    {submitting ? "Saving…" : "Add visitor"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
