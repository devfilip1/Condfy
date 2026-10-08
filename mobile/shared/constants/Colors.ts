/**
 * As duas paletas do aplicativo: clara e escura.
 *
 * Até a feature 010 havia uma paleta só, fixa de propósito. Agora a pessoa escolhe a aparência em
 * Configurações, e por isso **cor nenhuma é lida daqui direto por um componente**: quem desenha
 * recebe a paleta em uso por `makeStyles` e `useTheme`, de `@/shared/theme` (ADR 0014). Este
 * arquivo só define os valores.
 *
 * Os valores são os da identidade visual: âmbar e grafite sobre neutros quentes (ADR 0023). Cada
 * par texto/fundo daqui foi conferido contra o contraste mínimo de leitura, 4,5:1 — mudou uma cor,
 * confira o par de novo.
 *
 * As duas paletas têm exatamente as mesmas chaves — o tipo `Palette` garante: um token que falte
 * numa delas é erro de compilação, não um texto invisível descoberto na tela.
 */
export interface Palette {
  screenBackground: string;
  cardBackground: string;
  /** Véu atrás de um diálogo, e faixa atrás de texto posto sobre uma foto. */
  overlay: string;

  textPrimary: string;
  textSecondary: string;
  /** Texto sobre o âmbar do `accent`. Escuro nas DUAS paletas: o âmbar é o mesmo nas duas. */
  textOnAccent: string;
  /** Texto sobre `overlay` ou sobre uma foto. Claro nas DUAS paletas: o fundo é sempre escuro. */
  textOnOverlay: string;
  /** Texto legível sobre o fundo, mais forte que `textSecondary`. */
  textMuted: string;

  border: string;
  accent: string;
  /**
   * O âmbar quando ele é TEXTO ou ícone sobre o fundo. Na paleta clara é um âmbar escuro: o do
   * `accent`, sobre claro, não tem contraste de leitura. Na escura é o próprio `accent`.
   */
  accentText: string;
  /** Realce suave do day de hoje, de um aviso e de um rótulo. */
  accentSoft: string;
  danger: string;
  /** Texto sobre um botão de fundo `danger` ou `successStrong`. */
  textOnStrong: string;
  /** Verde de "tem vaga": a bolinha do calendário. */
  success: string;
  /** Verde das pílulas de horário: fundo de texto e cor de texto, então precisa de contraste. */
  successStrong: string;

  inputBackground: string;
  inputBorder: string;
  chipBackground: string;
  /** O quadrado atrás do ícone de um módulo na home. */
  iconSurface: string;
}

export const LightColors: Palette = {
  screenBackground: "#F6F4F0",
  cardBackground: "#FFFFFF",
  overlay: "rgba(18, 17, 16, 0.55)",

  textPrimary: "#1D1B18",
  textSecondary: "#6B655C",
  textOnAccent: "#1D1B18",
  textOnOverlay: "#FFFFFF",
  textMuted: "#4D4841",

  border: "#E4E0D8",
  accent: "#F2A93B",
  accentText: "#8A5A0B",
  accentSoft: "#FBEFD9",
  danger: "#B3362B",
  textOnStrong: "#FFFFFF",
  success: "#3F8F5A",
  successStrong: "#1F6B3C",

  inputBackground: "#FFFFFF",
  inputBorder: "#D5D0C6",
  chipBackground: "#EFEBE4",
  iconSurface: "#EFEBE4",
};

export const DarkColors: Palette = {
  screenBackground: "#121110",
  cardBackground: "#1C1A18",
  overlay: "rgba(0, 0, 0, 0.65)",

  textPrimary: "#F3F0EA",
  // Mais claro que o equivalente da paleta clara em relação ao fundo: o cinza de lá, sobre preto,
  // sumiria.
  textSecondary: "#978F84",
  textOnAccent: "#1D1B18",
  textOnOverlay: "#FFFFFF",
  textMuted: "#B5AEA3",

  border: "#2E2B27",
  accent: "#F2A93B",
  accentText: "#F2A93B",
  accentSoft: "#3D3018",
  // Vermelho e verde mais claros: os da paleta clara, sobre fundo escuro, não têm contraste de
  // texto.
  danger: "#F0867A",
  textOnStrong: "#121110",
  success: "#5DBB7E",
  successStrong: "#6FCB8F",

  inputBackground: "#1C1A18",
  inputBorder: "#3D3934",
  chipBackground: "#292622",
  iconSurface: "#292622",
};
