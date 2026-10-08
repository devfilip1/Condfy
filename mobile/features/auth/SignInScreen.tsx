import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import CondfySymbol from "@/shared/components/CondfySymbol";
import FormField from "@/shared/components/FormField";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
      gap: 24,
    },
    header: {
      alignItems: "center",
      gap: 10,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    title: {
      fontSize: fontSizes.display,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textSecondary,
    },
    card: {
      gap: 18,
      padding: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.card,
    },
    notice: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      color: colors.textMuted,
      backgroundColor: colors.accentSoft,
      borderRadius: radius.control,
      padding: 12,
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      color: colors.danger,
    },
    footer: {
      marginTop: 4,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      textAlign: "center",
      color: colors.textSecondary,
    },
    link: {
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
  })
);

/** Tela de input: apenas composição. Todo o state vem de `useAuth`. */
export default function SignInScreen() {
  const styles = useStyles();
  const { submitting, submitError, formErrors, sessionNotice, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.brand} accessible accessibilityLabel="Condfy">
            <CondfySymbol size={44} />
            <Text style={styles.title}>Condfy</Text>
          </View>
          <Text style={styles.subtitle}>Sign in to your condominium.</Text>
        </View>

        {sessionNotice ? <Text style={styles.notice}>{sessionNotice}</Text> : null}

        <View style={styles.card}>
          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            editable={!submitting}
            error={formErrors.email}
          />

          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => signIn(email, password)}
            editable={!submitting}
            error={formErrors.password}
          />

          {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

          <PrimaryButton
            label="Sign in"
            busyLabel="Signing in…"
            busy={submitting}
            onPress={() => signIn(email, password)}
          />
        </View>

        <Text style={styles.footer}>
          No account yet?{" "}
          <Link href="/sign-up" style={styles.link}>
            Create one
          </Link>
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
