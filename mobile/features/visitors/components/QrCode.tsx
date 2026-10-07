import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { qrMatrix } from "@/shared/lib/qr";
import { makeStyles } from "@/shared/theme";

/**
 * Um QR Code desenhado com `View`s.
 *
 * Puro: recebe o texto e o tamanho, não acessa serviço nem hook de estado (Princípio II).
 *
 * Com `View` e não com SVG, de propósito: o app não tem biblioteca de SVG, e trazer uma — com
 * módulo nativo junto — para desenhar quadrados seria uma dependência a mais para o que a `View` já
 * faz (ADR 0016). Cada LINHA é desenhada como uma sequência de trechos escuros, e não um quadrado
 * por vez: são bem menos elementos, e não sobra fresta de um pixel entre quadrados vizinhos.
 *
 * As cores vêm da paleta em uso, como em todo componente. O comprovante desenha este componente
 * dentro de um `ThemeProvider` claro, e é isso que faz o código sair sempre escuro sobre claro.
 */

/** Quadrados de margem em volta. Leitores precisam dela para achar onde o código começa. */
const QUIET_ZONE = 4;

export interface QrCodeProps {
  /** O texto que o código carrega. */
  value: string;
  /** Lado do quadrado inteiro, margem incluída. */
  size: number;
}

/** Um trecho de quadrados escuros seguidos, dentro de uma linha. */
interface Run {
  start: number;
  length: number;
}

function darkRunsOf(row: boolean[]): Run[] {
  const runs: Run[] = [];
  let start = -1;
  for (let column = 0; column <= row.length; column += 1) {
    const dark = column < row.length && row[column];
    if (dark && start === -1) {
      start = column;
    } else if (!dark && start !== -1) {
      runs.push({ start: start, length: column - start });
      start = -1;
    }
  }
  return runs;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    frame: {
      backgroundColor: colors.cardBackground,
    },
    run: {
      position: "absolute",
      backgroundColor: colors.textPrimary,
    },
  })
);

export default function QrCode({ value, size }: QrCodeProps) {
  const styles = useStyles();
  const rows = useMemo(() => qrMatrix(value).map(darkRunsOf), [value]);

  // Lado de um quadrado: o código mais a margem dos dois lados cabem exatamente em `size`.
  const cell = size / (rows.length + QUIET_ZONE * 2);
  const offset = cell * QUIET_ZONE;

  return (
    <View
      style={[styles.frame, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel="Pass code"
    >
      {rows.map((runs, rowIndex) =>
        runs.map((run) => (
          <View
            key={`${rowIndex}-${run.start}`}
            style={[
              styles.run,
              {
                top: offset + rowIndex * cell,
                left: offset + run.start * cell,
                width: run.length * cell,
                // Um fio a mais na altura fecha a fresta que o arredondamento abriria entre linhas.
                height: cell + 0.5,
              },
            ]}
          />
        ))
      )}
    </View>
  );
}
