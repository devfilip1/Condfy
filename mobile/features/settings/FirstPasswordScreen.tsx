import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/features/auth";
import { PASSWORD_MIN_LENGTH } from "@/features/settings/domain/account";
import { useChangePassword } from "@/features/settings/hooks/useAccountForms";
import FormField from "@/shared/components/FormField";
import HeaderModule from "@/shared/components/HeaderModule";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { makeStyles } from "@/shared/theme";

/**
 * A primeira password de uma conta criada pelo síndico: apenas composição.
 *
 * É a ÚNICA tela que essa conta alcança até a pessoa escolher a própria password — o layout raiz
 * manda para cá de qualquer outra rota, e o servidor recusa todo o resto (feature 014, ADR 0018).
 *
 * É o mesmo formulário de trocar a password, com o mesmo hook e a mesma rota: a pessoa digita a
 * provisória de novo como "password atual". Isso mantém a regra de que toda mudança na conta pede
 * a password (ADR 0015) e dispensa uma rota que aceitasse só a nova.
 *
 * Não tem botão de voltar — não há para onde. Tem o de sair, para ninguém ficar preso aqui.
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
    hint: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    error: {
      fontSize: 13,
      color: colors.danger,
    },
    signOut: {
      paddingVertical: 12,
      alignItems: "center",
    },
    signOutLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
    },
  })
);

export default function FirstPasswordScreen() {
  const styles = useStyles();
  const { signOut } = useAuth();
  const {
    currentPassword,
    newPassword,
    setCurrentPassword,
    setNewPassword,
    errors,
    submitError,
    submitting,
    submit,
  } = useChangePassword({ stayOnSuccess: true });

  return (
    <View style={styles.screen}>
      <HeaderModule name="Choose your password" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Your account was created with a provisional password. Choose your own
          to continue.
        </Text>

        <FormField
          label="Provisional password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="The password you were given"
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          editable={!submitting}
          error={errors.currentPassword}
        />
        <FormField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          editable={!submitting}
          returnKeyType="done"
          onSubmitEditing={submit}
          error={errors.newPassword}
        />

        {submitError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}

        <PrimaryButton
          label="Save password"
          busyLabel="Saving…"
          busy={submitting}
          onPress={submit}
        />

        <TouchableOpacity
          style={styles.signOut}
          onPress={signOut}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
