import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useDeleteAccount } from "@/features/settings/hooks/useAccountForms";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import FormField from "@/shared/components/FormField";
import HeaderModule from "@/shared/components/HeaderModule";
import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

/**
 * Tela de apagar a conta: apenas composição.
 * Todo o state vem do hook `useDeleteAccount` (constituição, Princípio I).
 *
 * É a única ação do aplicativo sem volta, então passa por três coisas antes de acontecer: o aviso
 * do que vai embora, a password, e uma confirmação.
 *
 * **Quem administra um condomínio vê a explicação e nenhum campo.** Pedir a password para depois
 * recusar por um motivo que não tem nada a ver com ela leria como password errada (FR-038a). Isto
 * é cortesia — quem recusa de verdade é o servidor.
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 60,
      gap: 18,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    heading: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    text: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 20,
      color: colors.textMuted,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
    deleteButton: {
      borderRadius: radius.control,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.danger,
    },
    deleteButtonDisabled: {
      opacity: 0.6,
    },
    deleteLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.bold,
      color: colors.textOnStrong,
    },
  })
);

export default function DeleteAccountScreen() {
  const styles = useStyles();
  const {
    isAdministrator,
    currentPassword,
    setCurrentPassword,
    errors,
    submitError,
    submitting,
    confirming,
    askConfirmation,
    cancel,
    confirm,
  } = useDeleteAccount();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Delete account" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {isAdministrator ? (
          <View style={styles.card}>
            <Text style={styles.heading}>
              Your account can&apos;t be deleted right now
            </Text>
            <Text style={styles.text}>
              You administer a condominium. The notices and found items it
              published are kept under your account, so an administrator&apos;s
              account can&apos;t be deleted while they administer a condominium.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>This cannot be undone</Text>
              <Text style={styles.text}>
                Deleting your account removes it permanently, along with:
              </Text>
              <Text style={styles.text}>
                {"•  your link to every condominium and unit\n"}
                {"•  the visitors you authorized\n"}
                {"•  the reservations you made"}
              </Text>
              <Text style={styles.text}>
                You will be signed out on every device.
              </Text>
            </View>

            <FormField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Your password"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              editable={!submitting}
              error={errors.currentPassword}
            />

            {submitError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {submitError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.deleteButton,
                submitting && styles.deleteButtonDisabled,
              ]}
              onPress={askConfirmation}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              <Text style={styles.deleteLabel}>Delete my account</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        message={"Delete your account permanently?\n\nThis cannot be undone."}
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={submitting}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </View>
  );
}
