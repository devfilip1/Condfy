import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import MembershipSummary from "@/features/settings/components/MembershipSummary";
import { usePersonalData } from "@/features/settings/hooks/usePersonalData";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";

/**
 * Tela de dados pessoais: apenas composição. Só leitura.
 *
 * Mostra o nome, o e-mail e cada condomínio da pessoa com o cargo e as unidades. O nome não é
 * editável aqui, e a password não aparece de forma nenhuma — nem mascarada (FR-009, FR-010).
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
      gap: 12,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    field: {
      gap: 2,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.textMuted,
    },
    value: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    section: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.textMuted,
    },
    hint: {
      fontSize: 14,
      color: colors.textMuted,
    },
  })
);

export default function PersonalDataScreen() {
  const styles = useStyles();
  const { state, retry } = usePersonalData();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Personal data" onBack={() => router.back()} />

      {state.status === "loading" ? <LoadingState /> : null}

      {state.status === "failed" ? (
        <LoadErrorState message={state.message} onRetry={retry} />
      ) : null}

      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value} selectable>
                {state.name}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value} selectable>
                {state.email}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>Condominiums</Text>
          {state.memberships.length === 0 ? (
            <Text style={styles.hint}>
              You are not linked to any condominium yet.
            </Text>
          ) : (
            state.memberships.map((membership) => (
              <MembershipSummary
                key={membership.condominium.id}
                membership={membership}
              />
            ))
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}
