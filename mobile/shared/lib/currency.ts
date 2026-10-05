/**
 * Formatação de dinheiro em reais.
 *
 * Função pura, sem React e sem domínio de feature: mora em `shared/lib/` pela mesma regra que
 * `calendar.ts` (constituição, Princípio III).
 *
 * O contrato entrega dinheiro como TEXTO (`"0.00"`, `"150.00"`), nunca como número: um `number` de
 * JavaScript não representa todo decimal com exatidão, e isto é dinheiro. A conversão para exibição
 * acontece aqui, uma vez, em vez de em cada tela.
 *
 * Escrito à mão em vez de `Intl.NumberFormat` porque o alvo é um único formato conhecido e o
 * `Intl` completo não está garantido em todo runtime do React Native (research R-010).
 */

const THOUSANDS_SEPARATOR = ".";
const DECIMAL_SEPARATOR = ",";

/** Mesmo formato que o servidor entrega: inteiro, ponto, exatamente duas casas. */
const CONTRACT_AMOUNT = /^(\d+)\.(\d{2})$/;

/** Agrupa de três em três a partir da direita: `1234567` → `1.234.567`. */
function groupThousands(digits: string): string {
  let grouped = "";
  for (let index = 0; index < digits.length; index += 1) {
    const fromRight = digits.length - index;
    grouped += digits[index];
    if (fromRight > 1 && fromRight % 3 === 1) {
      grouped += THOUSANDS_SEPARATOR;
    }
  }
  return grouped;
}

/**
 * Converte o value do contrato para exibição: `"0.00"` → `R$ 0,00`, `"1500.5"` → `R$ 1.500,50`.
 *
 * Zero é formatado como qualquer outro value — nunca vira text vazio nem traço, porque taxa zero
 * significa "de graça", e não "não informado" (FR-003).
 *
 * Um value fora do formato esperado devolve `R$ 0,00` em vez de lançar: a tela precisa renderizar
 * mesmo quando a API muda sem avisar, e um card sem preço é pior que um preço conservador.
 */
export function formatCurrency(amount: string): string {
  const normalized = normalize(amount);
  if (!normalized) {
    return `R$ 0${DECIMAL_SEPARATOR}00`;
  }

  const [, whole, cents] = normalized;
  return `R$ ${groupThousands(whole)}${DECIMAL_SEPARATOR}${cents}`;
}

/** Aceita o formato do contrato e também `"10"` ou `"10.5"`, que viram `10.00` e `10.50`. */
function normalize(amount: string): RegExpExecArray | null {
  if (typeof amount !== "string") {
    return null;
  }

  const trimmed = amount.trim();
  const exact = CONTRACT_AMOUNT.exec(trimmed);
  if (exact) {
    return exact;
  }

  const loose = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!loose) {
    return null;
  }
  return CONTRACT_AMOUNT.exec(`${loose[1]}.${(loose[2] ?? "").padEnd(2, "0")}`);
}
