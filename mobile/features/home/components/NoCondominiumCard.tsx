import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

/**
 * O que a home diz a uma conta que ainda não pertence a condomínio nenhum — e a oferta de criar um.
 *
 * Puro: recebe o callback por props e não navega sozinho (constituição, Princípio II).
 *
 * São duas saídas, e só uma é um botão: quem vai MORAR num condomínio espera ser adicionado por
 * quem cuida dele; quem CUIDA de um cria o dele aqui e passa a ser o síndico.
 */

export interface NoCondominiumCardProps {
  onCreate: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      marginTop: 20,
      padding: 18,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: 12,
    },
    title: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    text: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 20,
      color: colors.textMuted,
    },
    button: {
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.control,
      backgroundColor: colors.accent,
    },
    buttonLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.bold,
      color: colors.textOnAccent,
    },
  })
);

export default function NoCondominiumCard({ onCreate }: NoCondominiumCardProps) {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>You are not linked to a condominium yet</Text>
      <Text style={styles.text}>
        If you live in one, ask whoever manages it to add you. If you manage
        one, create it here.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onCreate}
        accessibilityRole="button"
      >
        <Text style={styles.buttonLabel}>Create a condominium</Text>
      </TouchableOpacity>
    </View>
  );
}
