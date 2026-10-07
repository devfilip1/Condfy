import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useNotices } from "@/features/newsletter/hooks/useNotices";
import EmptyState from "@/shared/components/EmptyState";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";
import { toDisplayDate } from "@/shared/lib/calendar";

/**
 * Tela de detalhe de um aviso: o conteúdo inteiro, sem corte.
 *
 * Lê o aviso da lista que o hook já carregou, em vez de buscar de novo: a lista traz o corpo
 * completo de propósito (research R-004), então abrir um aviso não custa requisição nenhuma.
 */

const MESSAGE_NOT_FOUND = "This notice is no longer available.";

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
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.textPrimary,
    },
  })
);

export default function NoticeScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useNotices();

  if (state.status === "loading") {
    return <LoadingState />;
  }

  const notice =
    state.status === "ready"
      ? state.notices.find((candidate) => candidate.id === id)
      : undefined;

  return (
    <View style={styles.screen}>
      <HeaderModule name="Notice" onBack={() => router.back()} />
      {notice ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.date}>
            {toDisplayDate(notice.date)} · Published by {notice.publishedBy.name}
          </Text>
          {/*
            Sem `numberOfLines`: aqui o texto vai inteiro. As quebras de linha do corpo são
            renderizadas como quebras, que é o que preserva os parágrafos (FR-002).
          */}
          <Text style={styles.body}>{notice.body}</Text>
        </ScrollView>
      ) : (
        <EmptyState message={MESSAGE_NOT_FOUND} />
      )}
    </View>
  );
}
