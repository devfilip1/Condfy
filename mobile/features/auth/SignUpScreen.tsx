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
import { PASSWORD_MIN_LENGTH } from "@/features/auth/domain/session";
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

/** Tela de cadastro: apenas composição. A conta nasce sem condomínio (FR-027). */
export default function SignUpScreen() {
  const { submitting, submitError, formErrors, signUp } = useAuth();
  const [name, setName] = useState("");
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Your account starts without a condominium.
          </Text>
        </View>

        <FormField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          editable={!submitting}
          error={formErrors.name}
        />

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
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={() => signUp(name, email, password)}
          editable={!submitting}
          error={formErrors.password}
        />

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

        <PrimaryButton
          label="Create account"
          busyLabel="Creating…"
          busy={submitting}
          onPress={() => signUp(name, email, password)}
        />

        <Text style={styles.footer}>
          Already have an account?{" "}
          <Link href="/sign-in" style={styles.link}>
            Sign in
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
