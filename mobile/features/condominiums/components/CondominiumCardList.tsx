import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import CondominiumCard from "@/features/condominiums/components/CondominiumCard";
import { ChoiceState } from "@/features/condominiums/hooks/useCondominiumChoice";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";

/**
 * Os condomínios da pessoa, com um state visível para cada situação.
 *
 * Componente puro: recebe o state já derivado pelo hook e callbacks. Os três caminhos do `switch`
 * são exaustivos — é o que garante que nenhuma situação renderize tela em branco (FR-015).
 *
 * Não há state "vazio": quem não tem condomínio nenhum nunca chega a esta tela.
 *
 * A falha é escrita aqui em vez de usar `LoadErrorState`, que tem uma ação só. Esta tela pode ser a
 * única que a pessoa alcança, então "tentar de novo" não basta: sem "sair" ela ficaria presa numa
 * conta cujo perfil não carrega.
 */

export interface CondominiumCardListProps {
  state: ChoiceState;
  onChoose: (condominiumId: string) => void;
  onRetry: () => void;
  onSignOut: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 14,
    },
    failed: {
      paddingHorizontal: 40,
      paddingVertical: 60,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textSecondary,
    },
    retry: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    retryText: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.textOnAccent,
    },
    footer: {
      gap: 4,
    },
    signOut: {
      alignSelf: "center",
      paddingVertical: 12,
    },
    signOutText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },
  })
);

export default function CondominiumCardList({
  state,
  onChoose,
  onRetry,
  onSignOut,
}: CondominiumCardListProps) {
  const styles = useStyles();
  switch (state.status) {
    case "loading":
      return <LoadingState />;

    case "failed":
      return (
        <View style={styles.failed}>
          <Text style={styles.message}>{state.message}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSignOut} accessibilityRole="button">
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      );

    case "ready":
      return (
        <FlatList
          data={state.memberships}
          keyExtractor={(membership) => membership.condominium.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CondominiumCard
              membership={item}
              current={item.condominium.id === state.currentId}
              onPress={onChoose}
            />
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              {/*
                Aqui havia um "Create a condominium". Saiu: só cria um condomínio quem ainda não
                pertence a nenhum, e quem chega a esta tela pertence a dois ou mais.
              */}
              <TouchableOpacity
                onPress={onSignOut}
                accessibilityRole="button"
                style={styles.signOut}
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          }
        />
      );
  }
}
