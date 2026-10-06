import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import SupportContactRow from "@/features/settings/components/SupportContactRow";
import { useSupport } from "@/features/settings/hooks/useSupport";
import HeaderModule from "@/shared/components/HeaderModule";
import { makeStyles } from "@/shared/theme";

/**
 * Tela de suporte: apenas composição.
 *
 * Dois contatos, os dois escritos por extenso e os dois abrindo com um toque. Quando o aparelho
 * não consegue abrir, a tela diz — e o contato continua ali para ser copiado (FR-031).
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
    hint: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: 6,
    },
    notice: {
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noticeText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
  })
);

export default function SupportScreen() {
  const styles = useStyles();
  const { contacts, notice, open } = useSupport();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Support" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Something not working? Reach the people who run Condfy through either
          of these.
        </Text>

        {contacts.map((contact) => (
          <SupportContactRow key={contact.kind} contact={contact} onPress={open} />
        ))}

        {notice !== null ? (
          <View style={styles.notice} accessibilityRole="alert">
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
