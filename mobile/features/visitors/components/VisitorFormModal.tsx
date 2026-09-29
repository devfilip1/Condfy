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
  ErrosFormulario,
  LIMITE_NOME,
  NovoVisitante,
  TIPOS_VISITA,
  TipoVisita,
} from "@/features/visitors/domain/visitante";

export interface VisitorFormModalProps {
  visible: boolean;
  erros: ErrosFormulario;
  /** Envio em andamento: o botão de confirmar fica desativado (FR-010). */
  enviando: boolean;
  /** Falha que não é de um campo específico (rede ou servidor). */
  erroEnvio: string | null;
  onSubmit: (entrada: NovoVisitante) => void;
  onCancel: () => void;
}

const ROTULOS_TIPO: Record<TipoVisita, string> = {
  visitante: "Visitor",
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

const TIPO_PADRAO: TipoVisita = "visitante";

/**
 * Formulário de cadastro sobreposto à lista (FR-004, FR-005).
 *
 * O componente não valida nada: apenas coleta os campos e exibe os erros recebidos por prop.
 * A validação é regra de domínio (`domain/visitante.ts`).
 */
export default function VisitorFormModal({
  visible,
  erros,
  enviando,
  erroEnvio,
  onSubmit,
  onCancel,
}: VisitorFormModalProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoVisita>(TIPO_PADRAO);
  const [dataPrevista, setDataPrevista] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");

  const insets = useSafeAreaInsets();
  const campoAutorizadoPor = useRef<TextInput>(null);

  // Limpa os campos ao reabrir, para não vazar dados de uma tentativa anterior.
  useEffect(() => {
    if (visible) {
      setNome("");
      setTipo(TIPO_PADRAO);
      setDataPrevista("");
      setAutorizadoPor("");
    }
  }, [visible]);

  function confirmar() {
    onSubmit({ nome, tipo, dataPrevista, autorizadoPor });
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
        // Sem isto o teclado do iOS sobe por cima da folha; no Android o ajuste é de altura.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.overlay}>
          {/* Tocar fora da folha fecha o formulário, como em qualquer bottom sheet. */}
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
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Visitor full name"
                  placeholderTextColor={Colors.textSecondary}
                  maxLength={LIMITE_NOME}
                  autoCapitalize="words"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => campoAutorizadoPor.current?.focus()}
                />
                {erros.nome ? (
                  <Text style={styles.error}>{erros.nome}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Visit type</Text>
                <View style={styles.chips}>
                  {TIPOS_VISITA.map((opcao) => (
                    <TouchableOpacity
                      key={opcao}
                      style={[
                        styles.chip,
                        opcao === tipo ? styles.chipSelected : null,
                      ]}
                      onPress={() => setTipo(opcao)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: opcao === tipo }}
                    >
                      <Text style={styles.chipLabel}>{ROTULOS_TIPO[opcao]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {erros.tipo ? (
                  <Text style={styles.error}>{erros.tipo}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Authorized by</Text>
                <TextInput
                  ref={campoAutorizadoPor}
                  style={styles.input}
                  value={autorizadoPor}
                  onChangeText={setAutorizadoPor}
                  placeholder="Resident name"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
                {erros.autorizadoPor ? (
                  <Text style={styles.error}>{erros.autorizadoPor}</Text>
                ) : null}
              </View>

              {/* Último campo do formulário: o calendário cresce no lugar, sem
                  reposicionar a rolagem — era isso que fazia a folha saltar. */}
              <View style={styles.field}>
                <DateField
                  label="Expected date"
                  valor={dataPrevista}
                  onChange={setDataPrevista}
                  erro={erros.dataPrevista}
                />
              </View>

              {erroEnvio ? (
                <Text style={styles.submitError} accessibilityRole="alert">
                  {erroEnvio}
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
                    enviando ? styles.submitButtonDisabled : null,
                  ]}
                  onPress={confirmar}
                  disabled={enviando}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: enviando, busy: enviando }}
                >
                  <Text style={styles.buttonLabel}>
                    {enviando ? "Saving…" : "Add visitor"}
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
