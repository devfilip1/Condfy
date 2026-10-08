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

import DateField from "@/shared/components/DateField";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";
import {
  FormErrors,
  NAME_MAX_LENGTH,
  NewVisitor,
  VISIT_TYPES,
  VisitType,
  VisitorUnit,
} from "@/features/visitors/domain/visitor";

export interface VisitorFormModalProps {
  visible: boolean;
  errors: FormErrors;
  /**
   * As unidades entre as quais escolher: onde a pessoa mora ou, para o administrador, todas as do
   * condomínio. Vazia impede registrar visitante.
   */
  units: VisitorUnit[];
  /** O que dizer com `units` vazia. Vem de quem sabe o motivo — o formulário não conhece cargo. */
  unitsHint: string;
  /** Envio em andamento: o botão de submit fica desativado (FR-010). */
  submitting: boolean;
  /** Falha que não é de um field específico (rede ou servidor). */
  submitError: string | null;
  onSubmit: (input: NewVisitor) => void;
  onCancel: () => void;
}

/** `A101`, ou só `101` em condomínio sem blocos. */
function unitLabel(unit: VisitorUnit): string {
  return unit.block === null ? unit.number : `${unit.block}${unit.number}`;
}

const TYPE_LABELS: Record<VisitType, string> = {
  visitor: "Visitor",
  delivery: "Delivery",
  service_provider: "Service",
};

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    avoider: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
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
      backgroundColor: colors.border,
      marginBottom: 16,
    },
    title: {
      fontSize: fontSizes.title,
      fontFamily: fonts.display,
      textTransform: "uppercase",
      color: colors.textPrimary,
      marginBottom: 20,
    },
    field: {
      marginBottom: 18,
    },
    label: {
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radius.control,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    chips: {
      flexDirection: "row",
      gap: 10,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: radius.control,
      backgroundColor: colors.chipBackground,
    },
    chipSelected: {
      backgroundColor: colors.accent,
    },
    chipLabel: {
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    error: {
      marginTop: 6,
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
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
      borderRadius: radius.control,
    },
    cancelButton: {
      backgroundColor: colors.chipBackground,
    },
    submitButton: {
      backgroundColor: colors.accent,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitError: {
      marginTop: 4,
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      color: colors.danger,
    },
    buttonLabel: {
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
  })
);

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
  units,
  unitsHint,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: VisitorFormModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [type, setType] = useState<VisitType>(DEFAULT_TYPE);
  const [expectedDate, setExpectedDate] = useState("");
  const [unitId, setUnitId] = useState("");

  const insets = useSafeAreaInsets();

  // Limpa os fields ao reabrir, para não vazar data de uma tentativa anterior. Com uma unidade
  // só, ela já vem escolhida: não há o que decidir.
  useEffect(() => {
    if (visible) {
      setName("");
      setType(DEFAULT_TYPE);
      setExpectedDate("");
      setUnitId(units.length === 1 ? units[0].id : "");
    }
  }, [visible, units]);

  function submit() {
    onSubmit({ name, type, expectedDate, unitId });
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
                  placeholderTextColor={colors.textSecondary}
                  maxLength={NAME_MAX_LENGTH}
                  autoCapitalize="words"
                  // Era "next", saltando para o campo de texto do autorizador. Esse campo virou
                  // seletor de unidade, e não há mais nenhum input de texto depois deste.
                  returnKeyType="done"
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

              {/*
                Era um campo de texto com o nome do morador. Virou seletor porque a visita agora
                aponta para uma unidade de verdade, e quem autoriza sai do token — o formulário
                não escolhe mais nenhum dos dois (ADR 0009).
              */}
              <View style={styles.field}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.chips}>
                  {units.map((unit) => {
                    const selected = unit.id === unitId;
                    return (
                      <TouchableOpacity
                        key={unit.id}
                        style={[styles.chip, selected ? styles.chipSelected : null]}
                        onPress={() => setUnitId(unit.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={styles.chipLabel}>{unitLabel(unit)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {units.length === 0 ? (
                  <Text style={styles.error}>{unitsHint}</Text>
                ) : null}
                {errors.unitId ? (
                  <Text style={styles.error}>{errors.unitId}</Text>
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
