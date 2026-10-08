import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { PASSWORD_MIN_LENGTH } from "@/features/auth";
import RoleChoice from "@/features/staff/components/RoleChoice";
import { STAFF_ROLE_LABELS } from "@/features/staff/domain/staff";
import { useStaffMember } from "@/features/staff/hooks/useStaffMember";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import EmptyState from "@/shared/components/EmptyState";
import FormField from "@/shared/components/FormField";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

/**
 * Tela de uma pessoa com cargo: apenas composição.
 * Todo o state vem do hook `useStaffMember` (constituição, Princípio I).
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
    person: {
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 4,
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    detail: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    section: {
      gap: 12,
    },
    hint: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 20,
      color: colors.textMuted,
    },
    note: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.success,
    },
    removeButton: {
      borderRadius: radius.control,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.danger,
    },
    removeLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.bold,
      color: colors.textOnStrong,
    },
  })
);

export default function StaffMemberScreen() {
  const styles = useStyles();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const {
    state,
    canManage,
    reload,
    administratorTaken,
    changingRole,
    roleError,
    changeRole,
    password,
    setPassword,
    settingPassword,
    passwordError,
    passwordNote,
    submitPassword,
    confirmingRemoval,
    removing,
    removeError,
    askRemoval,
    cancelRemoval,
    confirmRemoval,
  } = useStaffMember(userId);

  if (!canManage) {
    return <Redirect href="/" />;
  }

  const member = state.status === "ready" ? state.member : null;

  return (
    <View style={styles.screen}>
      <HeaderModule name="Role" onBack={() => router.back()} />

      {state.status === "loading" ? <LoadingState /> : null}

      {state.status === "failed" ? (
        <LoadErrorState message={state.message} onRetry={reload} />
      ) : null}

      {state.status === "missing" ? (
        <EmptyState message="This person no longer holds a role here." />
      ) : null}

      {member ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.person}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.detail}>{member.email}</Text>
            {member.passwordIsProvisional ? (
              <Text style={styles.detail}>Has not signed in yet</Text>
            ) : null}
          </View>

          {/* Mudar o cargo salva ao tocar: são duas opções, não há o que confirmar. */}
          <RoleChoice
            label="Role"
            value={member.role}
            onChange={changeRole}
            administratorTaken={administratorTaken}
            disabled={changingRole}
            error={roleError}
          />

          {/*
            O campo só existe enquanto a pessoa não escolheu a própria password. Depois disso não
            sobra controle NENHUM de password nesta tela: o síndico não a vê, não a define e não a
            troca (FR-025).
          */}
          {member.passwordIsProvisional ? (
            <View style={styles.section}>
              <Text style={styles.hint}>
                They have not chosen their own password yet. If they lost the
                provisional one, set another and tell them.
              </Text>
              <FormField
                label="New provisional password"
                value={password}
                onChangeText={setPassword}
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                autoCapitalize="none"
                autoComplete="off"
                secureTextEntry
                editable={!settingPassword}
                error={passwordError ?? undefined}
              />
              {passwordNote ? (
                <Text style={styles.note} accessibilityRole="alert">
                  {passwordNote}
                </Text>
              ) : null}
              <PrimaryButton
                label="Set a new provisional password"
                busyLabel="Setting…"
                busy={settingPassword}
                onPress={submitPassword}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.removeButton}
            onPress={askRemoval}
            accessibilityRole="button"
            accessibilityLabel="Remove from condominium"
          >
            <Text style={styles.removeLabel}>Remove from condominium</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {member ? (
        <ConfirmDialog
          visible={confirmingRemoval}
          // Dito antes de confirmar: a conta criada para a pessoa é apagada junto, e isso não volta.
          message={`Remove ${member.name} as ${STAFF_ROLE_LABELS[member.role]}? Their account will be deleted and they will no longer be able to sign in.`}
          confirmLabel="Remove"
          busyLabel="Removing…"
          busy={removing}
          errorMessage={removeError}
          onConfirm={confirmRemoval}
          onCancel={cancelRemoval}
        />
      ) : null}
    </View>
  );
}
