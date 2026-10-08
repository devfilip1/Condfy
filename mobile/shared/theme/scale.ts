/**
 * As medidas da identidade visual: os tamanhos de letra e os cantos (ADR 0023).
 *
 * Até aqui cada estilo escrevia o próprio número — treze tamanhos de letra e dez cantos diferentes,
 * para dizer as mesmas seis e três coisas. Um estilo agora escolhe um papel daqui.
 *
 * O que NÃO mora aqui: o canto de um círculo (metade do lado, ou `999`) e o de um desenho, como o
 * símbolo da marca. Esses são geometria da peça, e não uma medida do aplicativo.
 */

/** Tamanhos de letra. O peso vem de `fonts`, e não daqui. */
export const fontSizes = {
  /** O título de uma tela e a resposta de uma conferência. */
  display: 28,
  /** O título de um diálogo ou de uma folha. */
  title: 20,
  /** O título de um cartão. */
  heading: 17,
  /** Texto corrido, campos e botões. */
  body: 15,
  /** Rótulos, datas, texto de apoio. */
  label: 13,
  /** O menor texto: legendas em maiúsculas. */
  caption: 11,
} as const;

export const radius = {
  /** Cartões, linhas, diálogos, calendários e fotos. */
  card: 22,
  /** Botões, campos, avisos e o quadrado atrás de um ícone. */
  control: 14,
  /** Etiquetas: a pílula. */
  tag: 999,
  /** Os dois cantos de cima de uma folha que sobe do rodapé. */
  sheet: 28,
} as const;
