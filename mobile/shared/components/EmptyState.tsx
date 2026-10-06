import { StyleSheet, Text, View } from "react-native";

import { makeStyles } from "@/shared/theme";

export interface EmptyStateProps {
  message: string;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
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
      color: colors.textSecondary,
    },
  })
);

/** Mensagem de list blank, reutilizável por qualquer módulo (FR-013). */
export default function EmptyState({ message }: EmptyStateProps) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
