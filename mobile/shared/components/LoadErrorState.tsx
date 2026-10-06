import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { makeStyles } from "@/shared/theme";

export interface LoadErrorStateProps {
  message: string;
  onRetry: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 40,
      paddingVertical: 60,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textSecondary,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.textOnAccent,
    },
  })
);

/**
 * Falha ao load uma list, com a ação de tentar novamente.
 *
 * Promovido de `features/visitors/` para `shared/` no segundo uso, como manda o Princípio II:
 * visitors e reservations usam o mesmo componente.
 * Ocupa o lugar da list: o state empty nunca aparece quando a busca falhou.
 */
export default function LoadErrorState({ message, onRetry }: LoadErrorStateProps) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onRetry}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}
