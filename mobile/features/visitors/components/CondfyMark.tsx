import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";

/**
 * A marca do Condfy no rodapé do comprovante: o símbolo, o nome e a frase.
 *
 * Puro e sem props: é sempre a mesma coisa.
 *
 * **O símbolo é desenhado em código porque o repositório não tem arquivo de logo** — o `app.json`
 * aponta para `assets/images/`, que não existe, e a tela de entrada mostra "condfy" como texto.
 * Quando houver um arquivo, ele entra em `mobile/assets/images/` e substitui o quadrado com o ícone
 * aqui dentro. É o único lugar a mudar (research R-009 da 012).
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    symbol: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    name: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    tagline: {
      fontSize: 11,
      color: colors.textMuted,
    },
  })
);

export default function CondfyMark() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Condfy, app for condominiums"
    >
      <View style={styles.symbol}>
        <Ionicons name="business" size={20} color={colors.textOnAccent} />
      </View>
      <View>
        <Text style={styles.name}>Condfy</Text>
        <Text style={styles.tagline}>App for condominiums</Text>
      </View>
    </View>
  );
}
