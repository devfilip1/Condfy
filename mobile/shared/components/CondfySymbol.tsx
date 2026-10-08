import { StyleSheet, View } from "react-native";

import { makeStyles } from "@/shared/theme";

/**
 * O símbolo do Condfy: o portal da identidade visual (ADR 0023).
 *
 * Dois arcos, um dentro do outro — a entrada do prédio e a porta de casa — em grafite sobre o
 * âmbar. É o mesmo desenho de `assets/images/icon.png`.
 *
 * **Ele é desenhado com `View`, e não lido do arquivo**, porque o comprovante de visita vira imagem
 * no aparelho e o desenho em código sai nítido em qualquer tamanho; e porque dois arcos não
 * justificam uma biblioteca de SVG. O arco de fora é uma borda sem o lado de baixo; a porta é um
 * retângulo cheio.
 *
 * **As medidas são proporções do lado**, tiradas da grade de 64 unidades de
 * `scripts/make-icons.js`, e por isso não são papéis de `radius`. Mudou o símbolo? Mude aqui e no
 * script, e gere os arquivos de novo (`docs/development.md`).
 */

export interface CondfySymbolProps {
  /** O lado do quadrado, em pontos. */
  size: number;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    symbol: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    arch: {
      alignItems: "center",
      justifyContent: "flex-end",
      borderBottomWidth: 0,
      borderColor: colors.textOnAccent,
    },
    door: {
      backgroundColor: colors.textOnAccent,
    },
  })
);

export default function CondfySymbol({ size }: CondfySymbolProps) {
  const styles = useStyles();
  // As medidas nasceram num quadrado de 34 pontos; tudo acompanha o lado.
  const unit = size / 34;
  const archWidth = 21 * unit;
  const doorWidth = 7.5 * unit;

  return (
    <View
      style={[
        styles.symbol,
        { width: size, height: size, borderRadius: 10 * unit },
      ]}
    >
      <View
        style={[
          styles.arch,
          {
            width: archWidth,
            height: 23 * unit,
            borderWidth: 2.5 * unit,
            borderBottomWidth: 0,
            borderTopLeftRadius: archWidth / 2,
            borderTopRightRadius: archWidth / 2,
          },
        ]}
      >
        <View
          style={[
            styles.door,
            {
              width: doorWidth,
              height: 14 * unit,
              borderTopLeftRadius: doorWidth / 2,
              borderTopRightRadius: doorWidth / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}
