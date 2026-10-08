import { Octicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Module } from "@/features/home/data/modules";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

/**
 * Um módulo de ADMINISTRAÇÃO na home: uma linha baixa, de ponta a ponta.
 *
 * Componente puro: recebe o módulo por props (constituição, Princípio II). Abre a mesma rota que o
 * card da grade abriria e diz a mesma coisa ao leitor de tela — o que muda é só o desenho.
 *
 * É outro desenho de propósito: gerenciar cargos e aprovar moradores são ferramentas de quem cuida
 * do prédio, usadas de vez em quando, e não um quinto e um sexto módulo do dia a dia. Baixa e
 * larga, a linha se lê como um item de lista; a grade, acima, continua sendo o que se usa todo dia
 * (feature 017). Qual módulo vira linha é o `kind` dele, em `modules.ts` — este componente não
 * conhece nome de módulo nenhum.
 */

export interface ModuleRowProps {
  modul: Module;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: radius.control,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.iconSurface,
    },
    texts: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    desc: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
  })
);

export default function ModuleRow({ modul }: ModuleRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        if (modul.route) {
          router.push(modul.route);
        }
      }}
      disabled={modul.route === null}
      accessibilityRole="button"
      accessibilityLabel={`${modul.name}. ${modul.description}`}
      accessibilityState={{ disabled: modul.route === null }}
    >
      <View style={styles.iconContainer}>
        {/* Sem cor o ícone é preto, e preto some na aparência escura (ADR 0014). */}
        <Octicons name={modul.icon} size={26} color={colors.textPrimary} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {modul.name}
        </Text>
        <Text style={styles.desc} numberOfLines={1} ellipsizeMode="tail">
          {modul.description}
        </Text>
      </View>
      <Octicons name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
