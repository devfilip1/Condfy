/**
 * As duas paletas do aplicativo: clara e escura.
 *
 * Até a feature 010 havia uma paleta só, fixa de propósito. Agora a pessoa escolhe a aparência em
 * Configurações, e por isso **cor nenhuma é lida daqui direto por um componente**: quem desenha
 * recebe a paleta em uso por `makeStyles` e `useTheme`, de `@/shared/theme` (ADR 0014). Este
 * arquivo só define os valores.
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
  screenBackground: "#F7F7F7",
  cardBackground: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.45)",

  textPrimary: "#1A1A1A",
  textSecondary: "#B7B7B7",
  textOnAccent: "#1A1A1A",
  textOnOverlay: "#FFFFFF",
  textMuted: "#767676",

  border: "#E2E2E2",
  accent: "#FFB133",
  accentSoft: "#FFF1DA",
  danger: "#D64545",
  textOnStrong: "#FFFFFF",
  success: "#2E9E5B",
  successStrong: "#00832D",

  inputBackground: "#FFFFFF",
  inputBorder: "#E2E2E2",
  chipBackground: "#F0F0F0",
  iconSurface: "#E2E2E2",
};

export const DarkColors: Palette = {
  screenBackground: "#121212",
  cardBackground: "#1E1E1E",
  overlay: "rgba(0, 0, 0, 0.65)",

  textPrimary: "#F2F2F2",
  // Mais claro que o equivalente da paleta clara em relação ao fundo: o cinza de lá, sobre preto,
  // sumiria.
  textSecondary: "#8C8C8C",
  textOnAccent: "#1A1A1A",
  textOnOverlay: "#FFFFFF",
  textMuted: "#ABABAB",

  border: "#333333",
  accent: "#FFB133",
  accentSoft: "#4A391A",
  // Vermelho e verde mais claros: os da paleta clara, sobre fundo escuro, não têm contraste de
  // texto.
  danger: "#F27C7C",
  textOnStrong: "#121212",
  success: "#3DBB72",
  successStrong: "#52C985",

  inputBackground: "#1E1E1E",
  inputBorder: "#3A3A3A",
  chipBackground: "#2A2A2A",
  iconSurface: "#2A2A2A",
};
