/**
 * Regras puras dos pedidos de entrada, como quem cuida do condomínio os vê.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * Um pedido existe enquanto está pendente e some com qualquer resposta — aprovar, rejeitar, ou a
 * pessoa desistir. Não há situação a guardar nem histórico a mostrar.
 */

/** Um pedido pendente: quem pede, para qual unidade, e desde quando. */
export interface JoinRequest {
  id: string;
  name: string;
  email: string;
  unit: { block: string | null; number: string };
  /** ISO 8601. Um INSTANTE: lido com `toDisplayDateTime`, na hora local. */
  requestedAt: string;
}

/** O que quem cuida do condomínio pode responder. */
export type JoinRequestAnswer = "approve" | "reject";

/** A unidade pedida, no mesmo formato do card de visitante. */
export function apartmentText(unit: JoinRequest["unit"]): string {
  return unit.block === null
    ? `Apt ${unit.number}`
    : `Block ${unit.block} · Apt ${unit.number}`;
}

/**
 * A pergunta do diálogo de confirmação. Rejeitar diz ANTES o que vai junto: a conta da pessoa é
 * removida, e isso não volta.
 */
export function confirmationText(
  request: JoinRequest,
  answer: JoinRequestAnswer
): string {
  const apartment = apartmentText(request.unit);
  return answer === "approve"
    ? `Approve ${request.name} as a resident of ${apartment}?`
    : `Reject ${request.name}'s request for ${apartment}? Their account will be removed.`;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJoinRequest(value: unknown): value is JoinRequest {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    isObject(value.unit) &&
    (value.unit.block === null || typeof value.unit.block === "string") &&
    typeof value.unit.number === "string" &&
    typeof value.requestedAt === "string"
  );
}

export function isJoinRequestList(value: unknown): value is JoinRequest[] {
  return Array.isArray(value) && value.every(isJoinRequest);
}
