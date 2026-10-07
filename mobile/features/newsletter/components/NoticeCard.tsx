import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Notice, previewOf } from "@/features/newsletter/domain/notice";
import { makeStyles } from "@/shared/theme";
import { toDisplayDate } from "@/shared/lib/calendar";

/**
 * Card de um aviso: título, as primeiras duas linhas do conteúdo, a data e quem publicou.
 *
 * Componente puro: recebe dados e callback por props (constituição, Princípio II).
 *
 * O corte de duas linhas é de RENDERIZAÇÃO, não contagem de caracteres. Quanto cabe depende da
 * largura da tela e da fonte, então um limite por caractere cortaria no meio de uma palavra num
 * aparelho e no meio de uma frase em outro. `numberOfLines` quebra na palavra e põe reticências,
 * e um corpo que cabe em uma linha ocupa uma linha, sem reservar espaço para a segunda (FR-009).
 */

export interface NoticeCardProps {
  notice: Notice;
  onPress: (notice: Notice) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    date: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    preview: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    publishedBy: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
  })
);

export default function NoticeCard({ notice, onPress }: NoticeCardProps) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(notice)}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}, ${toDisplayDate(notice.date)}, published by ${notice.publishedBy.name}`}
    >
      <View style={styles.header}>
        {/* Título em até duas linhas: um título longo quebra em vez de empurrar a data para fora. */}
        <Text style={styles.title} numberOfLines={2}>
          {notice.title}
        </Text>
        <Text style={styles.date}>{toDisplayDate(notice.date)}</Text>
      </View>

      {/*
        As duas linhas do enunciado. `numberOfLines={2}` quebra na palavra e trunca com reticências;
        uma URL comprida é tratada pelo mesmo mecanismo, dentro da linha, sem alargar o card.
      */}
      <Text style={styles.preview} numberOfLines={2} ellipsizeMode="tail">
        {previewOf(notice.body)}
      </Text>

      <Text style={styles.publishedBy} numberOfLines={1} ellipsizeMode="tail">
        Published by {notice.publishedBy.name}
      </Text>
    </TouchableOpacity>
  );
}
