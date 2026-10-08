import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import SelectField from "@/features/auth/components/SelectField";
import { condominiumLabel } from "@/features/auth/domain/directory";
import {
  MESSAGE_CONDOMINIUMS_FAILED,
  MESSAGE_UNITS_FAILED,
  useSignUpForm,
} from "@/features/auth/hooks/useSignUpForm";

import FormField from "@/shared/components/FormField";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/domain/session";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { makeStyles } from "@/shared/theme";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 28,
      // O formulário ficou mais alto que a tela: sem isto o primeiro e o último campo encostam.
      paddingVertical: 48,
      gap: 18,
    },
    hint: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      color: colors.textSecondary,
    },
    blocked: {
      opacity: 0.5,
    },
    retry: {
      alignSelf: "flex-start",
      paddingVertical: 4,
    },
    retryLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    error: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.danger,
    },
    footer: {
      marginTop: 4,
      fontSize: 14,
      textAlign: "center",
      color: colors.textSecondary,
    },
    link: {
      fontWeight: "600",
      color: colors.textPrimary,
    },
  })
);

/**
 * Tela de cadastro: apenas composição.
 *
 * Desde a feature 016 **cadastrar-se é pedir para entrar num condomínio**: além de nome, e-mail e
 * password, a pessoa escolhe em listas o condomínio, o bloco e o apartamento. A conta nasce com um
 * pedido, e quem cuida do condomínio confirma que ela mora ali. As três escolhas e as listas por
 * trás delas vêm de `useSignUpForm`.
 */
export default function SignUpScreen() {
  const styles = useStyles();
  const { submitting, submitError, formErrors, signUp } = useAuth();
  const form = useSignUpForm();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = () =>
    signUp(name, email, password, form.condominiumId, form.unitId);

  const condominiumOptions =
    form.condominiums.status === "ready"
      ? form.condominiums.condominiums.map((condominium) => ({
          value: condominium.id,
          label: condominiumLabel(condominium),
        }))
      : [];

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
            Tell us where you live. Your condominium confirms it before you can
            use the app.
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
          editable={!submitting}
          error={formErrors.password}
        />

        {/*
          As três são ESCOLHIDAS, nunca digitadas: a pessoa só pode pedir para entrar num lugar que
          existe. Cada uma depende da de cima, e fica travada até ela ser escolhida.
        */}
        <SelectField
          label="Condominium"
          placeholder={
            form.condominiums.status === "loading"
              ? "Loading…"
              : "Choose your condominium"
          }
          value={form.condominiumId}
          options={condominiumOptions}
          onChange={form.chooseCondominium}
          disabled={submitting || form.condominiums.status !== "ready"}
          error={formErrors.condominiumId}
          emptyText="No condominium is registered yet."
        />
        {form.condominiums.status === "failed" ? (
          <View>
            <Text style={styles.error} accessibilityRole="alert">
              {MESSAGE_CONDOMINIUMS_FAILED}
            </Text>
            <TouchableOpacity
              style={styles.retry}
              onPress={form.reloadCondominiums}
              accessibilityRole="button"
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Só para condomínio que tem blocos; num sem blocos o apartamento vem direto. */}
        {form.needsBlock ? (
          <SelectField
            label="Block"
            placeholder="Choose your block"
            value={form.block}
            options={form.blocks.map((block) => ({ value: block, label: block }))}
            onChange={form.chooseBlock}
            disabled={submitting}
          />
        ) : null}

        <SelectField
          label="Apartment"
          placeholder={
            form.units.status === "loading" ? "Loading…" : "Choose your apartment"
          }
          value={form.unitId}
          options={form.apartments.map((unit) => ({
            value: unit.id,
            label: unit.number,
          }))}
          onChange={form.chooseUnit}
          disabled={
            submitting ||
            form.units.status !== "ready" ||
            (form.needsBlock && form.block === null)
          }
          error={formErrors.unitId}
          emptyText="This condominium has no apartments registered."
        />
        {form.units.status === "failed" ? (
          <View>
            <Text style={styles.error} accessibilityRole="alert">
              {MESSAGE_UNITS_FAILED}
            </Text>
            <TouchableOpacity
              style={styles.retry}
              onPress={form.reloadUnits}
              accessibilityRole="button"
            >
              <Text style={styles.retryLabel}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}

        {/* Sem a lista de condomínios não há como pedir: o botão só responde com ela carregada. */}
        <View
          pointerEvents={form.canSubmit ? "auto" : "none"}
          style={form.canSubmit ? undefined : styles.blocked}
        >
          <PrimaryButton
            label="Create account"
            busyLabel="Creating…"
            busy={submitting}
            onPress={submit}
          />
        </View>
        <Text style={styles.hint}>
          Your request is sent to the condominium. You will be let in once
          somebody there confirms that you live in that apartment.
        </Text>

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
