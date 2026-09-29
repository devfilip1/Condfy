import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

/** Indicador exibido enquanto a lista de visitantes é buscada no servidor (FR-004). */
export default function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={Colors.accent}
        accessibilityLabel="Loading visitors"
      />
    </View>
  );
}
