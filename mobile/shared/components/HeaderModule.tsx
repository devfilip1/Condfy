import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";

export interface HeaderModuleProps {
  name: string;
  /** Quando ausente, o cabeçalho não mostra o botão de voltar. A navegação é de quem consome. */
  onBack?: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      height: 100,
      justifyContent: "center",
      paddingHorizontal: 20,
      alignItems: "center",
      paddingTop: 50,
    },
    backButton: {
      // Fora do fluxo para o título continuar centralizado na tela, e não no espaço restante.
      position: "absolute",
      left: 12,
      top: 50,
      bottom: 0,
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    title: {
      fontSize: 25,
      fontWeight: "bold",
      textTransform: "uppercase",
      // Sem cor o texto é preto, e preto some na aparência escura (ADR 0014).
      color: colors.textPrimary,
    },
  })
);

export default function HeaderModule({ name, onBack }: HeaderModuleProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : null}
      <Text style={styles.title}>{name}</Text>
    </View>
  );
}
