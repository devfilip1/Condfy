import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  Scheme,
  fontSizes,
  fonts,
  makeStyles,
  radius,
  useTheme,
} from "@/shared/theme";

/**
 * A escolha entre aparência clara e escura: duas opções lado a lado, a que está valendo marcada.
 *
 * Componente puro: recebe a aparência em uso e avisa a escolha por callback.
 *
 * A opção marcada é distinguida por borda mais grossa e texto em negrito, além da cor — quem não
 * distingue as cores ainda vê qual das duas está valendo.
 */

export interface AppearanceToggleProps {
  /** A aparência que está na tela agora. */
  scheme: Scheme;
  onChange: (scheme: Scheme) => void;
}

const OPTIONS: { scheme: Scheme; label: string; icon: "sunny-outline" | "moon-outline" }[] = [
  { scheme: "light", label: "Light", icon: "sunny-outline" },
  { scheme: "dark", label: "Dark", icon: "moon-outline" },
];

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    options: {
      flexDirection: "row",
      gap: 12,
    },
    option: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      paddingVertical: 14,
    },
    optionSelected: {
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    label: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    labelSelected: {
      fontFamily: fonts.bold,
    },
  })
);

export default function AppearanceToggle({
  scheme,
  onChange,
}: AppearanceToggleProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.options} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const selected = option.scheme === scheme;
        return (
          <TouchableOpacity
            key={option.scheme}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(option.scheme)}
            accessibilityRole="radio"
            accessibilityLabel={`${option.label} appearance`}
            accessibilityState={{ selected: selected, checked: selected }}
          >
            <Ionicons name={option.icon} size={18} color={colors.textPrimary} />
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
