/**
 * Entidade de domínio CommonArea — o local do condomínio que dá para reservar.
 *
 * Esta camada não importa React nem React Native.
 *
 * Não há funções de validação aqui, e isso é de propósito: esta feature não tem formulário. A regra
 * de validação duplicada entre app e servidor (research R-006 da 002) não se aplica porque não há
 * nada digitado a validar — a única coisa que o app muda num local é ligá-lo ou desligá-lo, e isso
 * é a posição de um interruptor.
 */

export interface CommonArea {
  id: string;
  name: string;
  /**
   * Dinheiro como TEXTO, com duas casas: `"0.00"`, `"150.00"`.
   * Um `number` não representa todo decimal com exatidão, e isto é dinheiro. Quem exibe usa
   * `formatCurrency` de `@/shared/lib/currency`.
   */
  usageFee: string;
  /** Endereço https da foto, ou `null` — a tela mostra o placeholder nos dois casos de falha. */
  imageUrl: string | null;
  /**
   * Caminho relativo e assinado da foto ENVIADA ao criar o local, ou `null`. Os locais de exemplo
   * usam `imageUrl`; no máximo um dos dois vem. Quem exibe não escolhe na mão: o hook entrega o
   * endereço pronto.
   */
  photoPath: string | null;
  /**
   * `false` — o local continua no catálogo, mas não aceita reserva de ninguém. O card aparece
   * apagado e é a tela que decide o que o toque faz.
   */
  isAvailable: boolean;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `true` quando o value tem exatamente a forma de uma `CommonArea` válida. */
export function isCommonArea(value: unknown): value is CommonArea {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.usageFee === "string" &&
    (value.imageUrl === null || typeof value.imageUrl === "string") &&
    (value.photoPath === null || typeof value.photoPath === "string") &&
    typeof value.isAvailable === "boolean"
  );
}

/** `true` quando o value é uma list em que todo item é uma `CommonArea`. */
export function isCommonAreaList(value: unknown): value is CommonArea[] {
  return Array.isArray(value) && value.every(isCommonArea);
}
