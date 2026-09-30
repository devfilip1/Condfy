import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";

export interface EmptyStateProps {
  message: string;
}

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 40,
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: Colors.textSecondary,
  },
});

/** Mensagem de list blank, reutilizável por qualquer módulo (FR-013). */
export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
