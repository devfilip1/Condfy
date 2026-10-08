import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PASSWORD_MIN_LENGTH } from "@/features/settings/domain/account";
import { useChangePassword } from "@/features/settings/hooks/useAccountForms";
import FormField from "@/shared/components/FormField";
import HeaderModule from "@/shared/components/HeaderModule";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { fontSizes, fonts, makeStyles } from "@/shared/theme";

/**
 * Tela de troca de password: apenas composição.
 * Todo o state vem do hook `useChangePassword` (constituição, Princípio I).
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
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
    },
  })
);

export default function ChangePasswordScreen() {
  const styles = useStyles();
  const {
    currentPassword,
    newPassword,
    setCurrentPassword,
    setNewPassword,
    errors,
    submitError,
    submitting,
    submit,
  } = useChangePassword();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Change password" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dito antes, e não descoberto depois: os outros aparelhos saem (FR-019). */}
        <Text style={styles.hint}>
          Changing your password signs you out on your other devices. You stay
          signed in here.
        </Text>

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
      </ScrollView>
    </View>
  );
}
