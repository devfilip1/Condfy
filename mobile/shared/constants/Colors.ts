/**
 * Tokens de cor do módulo de Visitantes (FR-016).
 *
 * A paleta é explícita e não herda cor do sistema: nenhum fundo ou text fica indefinido,
 * então o conteúdo permanece legível tanto com o dispositivo em tema claro quanto escuro.
 * Isso mantém o módulo visualmente consistente com as telas já existentes do aplicativo,
 * que também usam cores fixas.
 */
export const Colors = {
  screenBackground: "#F7F7F7",
  cardBackground: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.45)",

  textPrimary: "#1A1A1A",
  textSecondary: "#B7B7B7",
  textOnAccent: "#1A1A1A",

  border: "#E2E2E2",
  accent: "#FFB133",
  danger: "#D64545",

  inputBackground: "#FFFFFF",
  inputBorder: "#E2E2E2",
  chipBackground: "#F0F0F0",

  /** Realce suave do day de hoje e do state pressionado no calendário. */
  accentSoft: "#FFF1DA",
  /** Texto legível sobre fundo claro, mais escuro que `textSecondary`. */
  textMuted: "#767676",
} as const;

export default Colors;
