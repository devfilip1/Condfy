import { StyleSheet, View } from "react-native";

import { makeStyles } from "@/shared/theme";

/**
 * A bolinha embaixo de um day do calendário.
 *
 * Pequeno o bastante para parecer desnecessário, e vale pelo `"none"`: os três states num lugar só é
 * o que impede "sem bolinha" de virar elemento ausente num ramo e círculo transparente noutro — e
 * aí as linhas do calendário mudam de altura ao trocar de mês.
 *
 * `"none"` não é "não sei": é dia que não dá para reservar, por ser passado ou por estar além da
 * janela de 60 dias (FR-007, FR-021a). Os dois casos chegam aqui iguais de propósito.
 */

export interface DayDotProps {
  /** `green` tem horário livre, `red` está cheio, `none` não é reservável. */
  state: "green" | "red" | "none";
}

const DOT_SIZE = 6;

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      marginTop: 3,
    },
    green: {
      backgroundColor: colors.success,
    },
    red: {
      backgroundColor: colors.danger,
    },
    // Mesma altura, sem cor: reserva o espaço para a linha não subir.
    none: {
      backgroundColor: "transparent",
    },
  })
);

export default function DayDot({ state }: DayDotProps) {
  const styles = useStyles();
  return <View style={[styles.dot, styles[state]]} />;
}
