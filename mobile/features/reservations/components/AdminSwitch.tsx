import { StyleSheet, Switch, Text, View } from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";

/**
 * Um interruptor do administrador, com o nome do que ele controla e uma frase dizendo o que faz.
 *
 * Puro: recebe o valor e o callback, não acessa serviço nem hook de estado (Princípio II). Mora na
 * feature porque só ela o usa — duas vezes, na tela de reserva.
 *
 * **O valor mostrado é sempre o que está SALVO.** Quem usa não vira o interruptor antes de o
 * servidor responder: enquanto o pedido está em voo ele fica desabilitado onde estava, e só muda
 * quando a tela é recarregada. É isso que faz uma falha "voltar" o interruptor sem código nenhum
 * para voltá-lo — ele nunca saiu do lugar.
 */

export interface AdminSwitchProps {
  title: string;
  /** O que ligar ou desligar faz, numa frase. Obrigatória: é o que a spec pede que esteja escrito. */
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** Desabilitado e esmaecido; o valor mostrado continua sendo o salvo. */
  disabled?: boolean;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginHorizontal: 20,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    disabled: {
      opacity: 0.6,
    },
    texts: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    description: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
  })
);

export default function AdminSwitch({
  title,
  description,
  value,
  onChange,
  disabled = false,
}: AdminSwitchProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        // Claro nas duas paletas: o polegar precisa aparecer sobre o trilho escuro do tema escuro.
        thumbColor={colors.textOnOverlay}
        ios_backgroundColor={colors.border}
        // Só a web lê isto. Sem ele o `react-native-web` pinta o polegar LIGADO com um verde
        // próprio, que não vem da paleta — e o `tsc` não avisa, porque a prop não é do tipo nativo.
        {...({ activeThumbColor: colors.textOnOverlay } as object)}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityHint={description}
        accessibilityState={{ checked: value, disabled: disabled }}
      />
    </View>
  );
}
