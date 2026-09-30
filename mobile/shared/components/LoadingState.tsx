import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

/** Indicador de carregamento em tela cheia: list de visitors, restauro de sessão. */
export default function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={Colors.accent}
        accessibilityLabel="Loading"
      />
    </View>
  );
}
