import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import StaffCard from "@/features/staff/components/StaffCard";
import { useStaff } from "@/features/staff/hooks/useStaff";
import AddButton from "@/shared/components/AddButton";
import EmptyState from "@/shared/components/EmptyState";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";

/**
 * Tela do módulo de cargos: apenas composição.
 * Todo o state vem do hook `useStaff` (constituição, Princípio I).
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    list: {
      paddingHorizontal: 20,
      paddingTop: 8,
      // Espaço para o último card não ficar atrás do botão de adicionar.
      paddingBottom: 200,
      gap: 12,
    },
  })
);

export default function StaffScreen() {
  const styles = useStyles();
  const { state, canManage, reload } = useStaff();

  // Cortesia: o módulo é só do síndico. Quem chega aqui por um link direto volta para a home — e
  // a API recusaria de qualquer jeito.
  if (!canManage) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.screen}>
      <HeaderModule name="Roles" onBack={() => router.back()} />

      {state.status === "loading" ? <LoadingState /> : null}

      {state.status === "failed" ? (
        <LoadErrorState message={state.message} onRetry={reload} />
      ) : null}

      {state.status === "ready" && state.staff.length === 0 ? (
        <EmptyState message="Nobody holds a role yet." />
      ) : null}

      {state.status === "ready" && state.staff.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {state.staff.map((member) => (
            <StaffCard
              key={member.userId}
              member={member}
              onPress={(selected) =>
                router.push({
                  pathname: "/staff/[userId]",
                  params: { userId: selected.userId },
                })
              }
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Fora da lista de propósito: continua ao alcance com dezenas de porteiros na tela. */}
      {state.status === "ready" ? (
        <AddButton
          onPress={() => router.push("/staff/new")}
          accessibilityLabel="Add person"
        />
      ) : null}
    </View>
  );
}
