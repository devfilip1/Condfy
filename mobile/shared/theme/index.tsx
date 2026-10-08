import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  DarkColors,
  LightColors,
  Palette,
} from "@/shared/constants/Colors";

/**
 * A camada de tema: de onde todo componente tira as cores.
 *
 * **Por que isto mora em `shared/`, numa pasta própria.** Componentes de `shared/` precisam da
 * paleta em uso, e `shared/` não pode importar uma feature — então o contexto que a carrega tem de
 * estar aqui. E ele não é componente de apresentação, nem função pura, nem token: por isso não cabe
 * em `components/`, `lib/` nem `constants/` (ADR 0014; constituição 4.1.0).
 *
 * **O que NÃO mora aqui: I/O nenhum.** Ler a preferência guardada no aparelho e a aparência do
 * sistema é de `features/settings`, que decide o esquema e o entrega a `ThemeProvider` por prop.
 *
 * O único jeito de um componente se estilizar:
 *
 * ```ts
 * const useStyles = makeStyles((colors) =>
 *   StyleSheet.create({ card: { backgroundColor: colors.cardBackground } })
 * );
 *
 * export default function Card() {
 *   const styles = useStyles();
 *   const { colors } = useTheme(); // só quando precisa de cor fora de um estilo: ícones
 * }
 * ```
 *
 * Um `StyleSheet.create` solto no módulo, lendo uma constante de cor, captura o valor quando o
 * arquivo carrega e nunca mais muda — é exatamente o que impedia o aplicativo de ter tema escuro.
 */

export type Scheme = "light" | "dark";

export type { Palette } from "@/shared/constants/Colors";

export { fontFiles, fonts } from "@/shared/theme/fonts";
export { fontSizes, radius } from "@/shared/theme/scale";

export interface Theme {
  scheme: Scheme;
  colors: Palette;
}

const PALETTES: Record<Scheme, Palette> = {
  light: LightColors,
  dark: DarkColors,
};

// O padrão é a paleta clara: um componente desenhado fora do provider continua legível.
const ThemeContext = createContext<Theme>({
  scheme: "light",
  colors: LightColors,
});

export interface ThemeProviderProps {
  /** Qual aparência mostrar. Quem decide é quem monta o provider. */
  scheme: Scheme;
  children: ReactNode;
}

export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const theme = useMemo<Theme>(
    () => ({ scheme: scheme, colors: PALETTES[scheme] }),
    [scheme]
  );
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** A aparência em uso e a paleta dela. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Transforma uma fábrica de estilos num hook.
 *
 * A fábrica roda UMA vez por paleta, e não a cada render: o resultado fica guardado por objeto de
 * paleta. São duas paletas, então cada componente tem no máximo duas folhas de estilo na vida.
 */
export function makeStyles<T>(factory: (colors: Palette) => T): () => T {
  const cache = new WeakMap<Palette, T>();

  return function useStyles(): T {
    const { colors } = useTheme();
    let styles = cache.get(colors);
    if (styles === undefined) {
      styles = factory(colors);
      cache.set(colors, styles);
    }
    return styles;
  };
}
