import { ActivityIndicator, StyleSheet, View } from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  })
);

/** Indicador de carregamento em tela cheia: list de visitors, restauro de sessão. */
export default function LoadingState() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={colors.accent}
        accessibilityLabel="Loading"
      />
    </View>
  );
}
