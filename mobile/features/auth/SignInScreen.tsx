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

import FormField from "@/features/auth/components/FormField";
import PrimaryButton from "@/features/auth/components/PrimaryButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Colors } from "@/shared/constants/Colors";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  notice: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
    backgroundColor: Colors.accentSoft,
    borderRadius: 12,
    padding: 12,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.danger,
  },
  footer: {
    marginTop: 4,
    fontSize: 14,
    textAlign: "center",
    color: Colors.textSecondary,
  },
  link: {
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});

/** Tela de input: apenas composição. Todo o state vem de `useAuth`. */
export default function SignInScreen() {
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
        <View>
          <Text style={styles.title}>condfy</Text>
          <Text style={styles.subtitle}>Sign in to your condominium.</Text>
        </View>

        {sessionNotice ? <Text style={styles.notice}>{sessionNotice}</Text> : null}

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
