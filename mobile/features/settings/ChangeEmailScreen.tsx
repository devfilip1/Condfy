import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useChangeEmail } from "@/features/settings/hooks/useAccountForms";
import FormField from "@/shared/components/FormField";
import HeaderModule from "@/shared/components/HeaderModule";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { fontSizes, fonts, makeStyles } from "@/shared/theme";

/**
 * Tela de troca de e-mail: apenas composição.
 * Todo o state vem do hook `useChangeEmail` (constituição, Princípio I).
 *
 * Pede a password atual: uma sessão aberta num aparelho desbloqueado não basta para trocar o
 * endereço que dá acesso à conta (FR-020).
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
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 20,
      color: colors.textMuted,
    },
    current: {
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
  })
);

export default function ChangeEmailScreen() {
  const styles = useStyles();
  const {
    currentEmail,
    email,
    currentPassword,
    setEmail,
    setCurrentPassword,
    errors,
    submitError,
    submitting,
    submit,
  } = useChangeEmail();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Change e-mail" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Your e-mail is what you sign in with. Today it is{" "}
          <Text style={styles.current}>{currentEmail}</Text>.
        </Text>

        <FormField
          label="New e-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={!submitting}
          error={errors.email}
        />
        <FormField
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Your password"
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          editable={!submitting}
          returnKeyType="done"
          onSubmitEditing={submit}
          error={errors.currentPassword}
        />

        {submitError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}

        <PrimaryButton
          label="Save e-mail"
          busyLabel="Saving…"
          busy={submitting}
          onPress={submit}
        />
      </ScrollView>
    </View>
  );
}
