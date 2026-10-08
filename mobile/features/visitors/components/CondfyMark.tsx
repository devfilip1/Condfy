import { StyleSheet, Text, View } from "react-native";

import CondfySymbol from "@/shared/components/CondfySymbol";
import { fontSizes, fonts, makeStyles } from "@/shared/theme";

/**
 * A marca do Condfy no rodapé do comprovante: o símbolo, o nome e a frase.
 *
 * Puro e sem props: é sempre a mesma coisa. O símbolo é o de `shared/components/CondfySymbol`, o
 * mesmo da tela de entrada.
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    tagline: {
      fontSize: fontSizes.caption,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
  })
);

export default function CondfyMark() {
  const styles = useStyles();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel="Condfy, app for condominiums"
    >
      <CondfySymbol size={34} />
      <View>
        <Text style={styles.name}>Condfy</Text>
        <Text style={styles.tagline}>App for condominiums</Text>
      </View>
    </View>
  );
}
