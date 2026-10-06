import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SupportContact } from "@/features/settings/data/support";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * Um contato do suporte: o canal, e o número ou endereço escrito por extenso.
 *
 * Componente puro: recebe o contato e o callback por props.
 *
 * O contato fica ESCRITO na tela, e selecionável, de propósito: num aparelho sem WhatsApp ou sem
 * aplicativo de e-mail o toque não abre nada, e o que sobra é poder copiar (FR-031).
 */

export interface SupportContactRowProps {
  contact: SupportContact;
  onPress: (contact: SupportContact) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    texts: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      fontSize: 13,
      color: colors.textMuted,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  })
);

export default function SupportContactRow({
  contact,
  onPress,
}: SupportContactRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(contact)}
      accessibilityRole="link"
      accessibilityLabel={`${contact.title}: ${contact.label}`}
    >
      <Ionicons
        name={contact.kind === "whatsapp" ? "logo-whatsapp" : "mail-outline"}
        size={24}
        color={colors.textPrimary}
      />
      <View style={styles.texts}>
        <Text style={styles.title}>{contact.title}</Text>
        <Text style={styles.label} selectable>
          {contact.label}
        </Text>
      </View>
      <Ionicons name="open-outline" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
