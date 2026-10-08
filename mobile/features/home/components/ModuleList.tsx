import { Octicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Module } from "@/features/home/data/modules";
import { makeStyles, useTheme } from "@/shared/theme";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    grid: {
      marginTop: 20,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 20,
    },
    container: {
      padding: 25,
      backgroundColor: colors.cardBackground,
      display: "flex",
      borderStyle: "solid",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 35,
      width: 160,
    },
    iconContainer: {
      borderRadius: 15,
      padding: 10,
      marginBottom: 10,
      backgroundColor: colors.iconSurface,
      height: 70,
      width: 70,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontWeight: "bold",
      fontSize: 16,
      color: colors.textPrimary,
    },
    desc: {
      color: colors.textSecondary,
    },
  })
);

export interface ModuleListProps {
  /** Já filtrados por cargo pela tela. O componente não decide quem vê o quê. */
  modules: Module[];
}

export default function ModuleList({ modules }: ModuleListProps) {
  const styles = useStyles();
  // Uma `View` que quebra a linha, e não uma `FlatList`: a home agora rola inteira, e uma lista
  // virtualizada dentro de um `ScrollView` briga com a rolagem dele. São no máximo cinco cards —
  // não há o que virtualizar (feature 017).
  return (
    <View style={styles.grid}>
      {modules.map((modul) => (
        <ModuleItem key={modul.name} modul={modul} />
      ))}
    </View>
  );
}

export function ModuleItem({ modul }: { modul: Module }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      // Cada módulo abre a SUA rota. Antes todos abriam `/visitors`, então tocar em Reservas
      // levava para a tela de Visitantes. `null` = módulo anunciado sem tela: não navega.
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
      <View key={modul.name} style={styles.container}>
        <View style={styles.iconContainer}>
          {/* Sem cor o ícone é preto, e preto some na aparência escura (ADR 0014). */}
          <Octicons name={modul.icon} size={40} color={colors.textPrimary} />
        </View>
        <Text style={styles.title}>{modul.name}</Text>
        <Text style={styles.desc}>{modul.description}</Text>
      </View>
    </TouchableOpacity>
  );
}
