import { Octicons } from "@expo/vector-icons";
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
  DESCRIPTION_MAX_LENGTH,
  FormErrors,
  PLACE_MAX_LENGTH,
  SelectedPhoto,
} from "@/features/lostAndFound/domain/foundItem";
import Photo from "@/shared/components/Photo";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * Formulário de um item encontrado: a foto, o que é e onde foi achado.
 *
 * Só é montado para quem pode postar, mas esconder não é a permissão: quem recusa de verdade é a
 * API (FR-025). Componente puro — recebe a foto já escolhida e os errors já calculados, e devolve
 * o texto por callback.
 *
 * **Este componente não abre câmera nem galeria.** Ele avisa que a pessoa quer uma das duas; quem
 * abre é o serviço, chamado pelo hook. É por isso que a foto chega por prop em vez de ser state
 * daqui, ao contrário dos dois campos de texto.
 */

export interface FoundItemFormModalProps {
  visible: boolean;
  /** A foto escolhida, ou `null` enquanto não há nenhuma. */
  photo: SelectedPhoto | null;
  errors: FormErrors;
  submitting: boolean;
  submitError: string | null;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  onSubmit: (input: { description: string; place: string }) => void;
  onCancel: () => void;
}

const PHOTO_HEIGHT = 180;

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.screenBackground,
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
    // Mesma altura com e sem foto: escolher uma não empurra os campos de baixo.
    photo: {
      width: "100%",
      height: PHOTO_HEIGHT,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    photoActions: { flexDirection: "row", gap: 12, marginTop: 10 },
    photoButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground,
      paddingVertical: 12,
    },
    photoButtonLabel: { fontWeight: "600", color: colors.textPrimary },
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
    descriptionInput: { minHeight: 80, textAlignVertical: "top" },
    counter: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: "right",
    },
    error: { fontSize: 13, color: colors.danger, marginTop: 6 },
    actions: { flexDirection: "row", gap: 12, marginTop: 8 },
    button: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    cancel: { backgroundColor: colors.chipBackground },
    submit: { backgroundColor: colors.accent },
    disabled: { opacity: 0.5 },
    cancelLabel: { fontWeight: "600", color: colors.textPrimary },
    submitLabel: { fontWeight: "bold", color: colors.textOnAccent },
  })
);

export default function FoundItemFormModal({
  visible,
  photo,
  errors,
  submitting,
  submitError,
  onTakePhoto,
  onChoosePhoto,
  onSubmit,
  onCancel,
}: FoundItemFormModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const insets = useSafeAreaInsets();

  // Limpa os campos ao REABRIR, para não vazar o rascunho de uma tentativa anterior. Um envio que
  // falha não fecha o formulário, então nada do que foi digitado se perde (FR-027).
  useEffect(() => {
    if (visible) {
      setDescription("");
      setPlace("");
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
        <Pressable
          style={styles.backdrop}
          onPress={submitting ? undefined : onCancel}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.heading}>New found item</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Photo</Text>
                <Photo
                  uri={photo?.previewUri ?? null}
                  style={styles.photo}
                  iconSize={40}
                  accessibilityLabel="Photo of the found item"
                />
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[styles.photoButton, submitting ? styles.disabled : null]}
                    onPress={onTakePhoto}
                    disabled={submitting}
                    accessibilityRole="button"
                  >
                    <Octicons
                      name="device-camera"
                      size={16}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.photoButtonLabel}>Take photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, submitting ? styles.disabled : null]}
                    onPress={onChoosePhoto}
                    disabled={submitting}
                    accessibilityRole="button"
                  >
                    <Octicons name="image" size={16} color={colors.textPrimary} />
                    <Text style={styles.photoButtonLabel}>Choose from gallery</Text>
                  </TouchableOpacity>
                </View>
                {errors.photo ? (
                  <Text style={styles.error}>{errors.photo}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What the item is"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />
                <Text style={styles.counter}>
                  {description.length} / {DESCRIPTION_MAX_LENGTH}
                </Text>
                {errors.description ? (
                  <Text style={styles.error}>{errors.description}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Where it was found</Text>
                <TextInput
                  style={styles.input}
                  value={place}
                  onChangeText={setPlace}
                  placeholder="Pool, lift, garage…"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={PLACE_MAX_LENGTH}
                />
                {errors.place ? (
                  <Text style={styles.error}>{errors.place}</Text>
                ) : null}
              </View>

              {submitError ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {submitError}
                </Text>
              ) : null}

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
                  onPress={() => onSubmit({ description, place })}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, busy: submitting }}
                >
                  <Text style={styles.submitLabel}>
                    {submitting ? "Posting…" : "Post item"}
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
