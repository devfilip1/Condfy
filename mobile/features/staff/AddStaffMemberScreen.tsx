import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PASSWORD_MIN_LENGTH } from "@/features/auth";
import RoleChoice from "@/features/staff/components/RoleChoice";
import { useAddStaffMember } from "@/features/staff/hooks/useAddStaffMember";
import FormField from "@/shared/components/FormField";
import HeaderModule from "@/shared/components/HeaderModule";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { fontSizes, fonts, makeStyles } from "@/shared/theme";

/**
 * Tela de trazer uma pessoa com cargo: apenas composição.
 * Todo o state vem do hook `useAddStaffMember` (constituição, Princípio I).
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

export default function AddStaffMemberScreen() {
  const styles = useStyles();
  const {
    name,
    email,
    password,
    role,
    setName,
    setEmail,
    setPassword,
    setRole,
    administratorTaken,
    canManage,
    errors,
    submitError,
    submitting,
    submit,
  } = useAddStaffMember();

  if (!canManage) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.screen}>
      <HeaderModule name="Add person" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FormField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          autoCapitalize="words"
          editable={!submitting}
          error={errors.name}
        />
        <FormField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!submitting}
          error={errors.email}
        />
        {/*
          `autoComplete="off"`: esta password é de OUTRA pessoa. O gerenciador de senhas do
          aparelho do síndico não deve oferecer a dele, nem se oferecer para guardar esta.
        */}
        <FormField
          label="Provisional password"
          value={password}
          onChangeText={setPassword}
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          autoCapitalize="none"
          autoComplete="off"
          secureTextEntry
          editable={!submitting}
          error={errors.password}
        />
        {/* Dito antes, e não descoberto depois: o que acontece com esta password. */}
        <Text style={styles.hint}>
          Tell them this password yourself. They will be asked to choose their
          own the first time they sign in.
        </Text>

        <RoleChoice
          label="Role"
          value={role}
          onChange={setRole}
          administratorTaken={administratorTaken}
          disabled={submitting}
          error={errors.role}
        />

        {submitError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}

        <PrimaryButton
          label="Add person"
          busyLabel="Adding…"
          busy={submitting}
          onPress={submit}
        />
      </ScrollView>
    </View>
  );
}
