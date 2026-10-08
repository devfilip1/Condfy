import { RedHatDisplay_700Bold } from "@expo-google-fonts/red-hat-display/700Bold";
import { RedHatText_400Regular } from "@expo-google-fonts/red-hat-text/400Regular";
import { RedHatText_500Medium } from "@expo-google-fonts/red-hat-text/500Medium";
import { RedHatText_600SemiBold } from "@expo-google-fonts/red-hat-text/600SemiBold";
import { RedHatText_700Bold } from "@expo-google-fonts/red-hat-text/700Bold";

/**
 * A letra do aplicativo: Red Hat Display nos títulos, Red Hat Text em todo o resto (ADR 0023).
 *
 * **O peso é a família, e não `fontWeight`.** Cada arquivo de fonte tem um peso só; pedir
 * `fontWeight: "bold"` sobre uma família carregada faz o Android engrossar a letra por conta
 * própria, ou ignorar o pedido. Por isso um estilo de texto escolhe uma destas chaves em
 * `fontFamily` e não declara `fontWeight`.
 *
 * Um texto sem `fontFamily` sai na letra do sistema — o typecheck não pega isso, do mesmo jeito que
 * não pega texto sem cor.
 *
 * Cada peso é importado do próprio caminho, e não do índice do pacote: o índice puxa todos os pesos
 * e os itálicos para dentro do aplicativo.
 */
export const fonts = {
  /** Títulos: de tela, de cartão, de diálogo. Negrito de 16 para cima. */
  display: "RedHatDisplay_700Bold",
  regular: "RedHatText_400Regular",
  medium: "RedHatText_500Medium",
  semibold: "RedHatText_600SemiBold",
  /** Negrito em texto pequeno: rótulos e botões abaixo de 16. */
  bold: "RedHatText_700Bold",
} as const;

/** O que `useFonts` carrega. As chaves são os nomes que `fonts` usa: mudou um, mude o outro. */
export const fontFiles = {
  RedHatDisplay_700Bold,
  RedHatText_400Regular,
  RedHatText_500Medium,
  RedHatText_600SemiBold,
  RedHatText_700Bold,
};
