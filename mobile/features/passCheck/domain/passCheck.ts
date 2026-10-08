import { toDisplayDate, toDisplayDateTime } from "@/shared/lib/calendar";

/**
 * Regras puras da conferência de um comprovante na portaria.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * Aqui não há validação espelhada com o servidor, porque nada é digitado: o que entra é o que a
 * câmera leu. Separar um comprovante do Condfy de qualquer outro QR é de `passCodeOf`, que mora na
 * feature de visitantes, ao lado da função que escreve o QR.
 *
 * **Quem decide se um comprovante vale é o servidor, sempre.** Nada neste arquivo compara a data
 * da visita com a do aparelho.
 */

export type VisitType = "visitor" | "delivery" | "service_provider";

/** A visita, como a resposta da conferência a traz. Nenhum id, e nunca o código. */
export interface CheckedVisit {
  name: string;
  type: VisitType;
  /** Dia de calendário `YYYY-MM-DD`. */
  expectedDate: string;
  unit: { block: string | null; number: string };
  /** O nome com que quem liberou aparece no condomínio: "Administrator", "Manager" ou o dela. */
  authorizedBy: { name: string };
  /** INSTANTE ISO 8601, ou `null` se o visitante ainda não entrou. */
  enteredAt: string | null;
}

/**
 * As quatro respostas de uma conferência. "Não deu para conferir" NÃO é uma delas: é uma falha, e
 * tem o próprio estado no hook — nunca pode parecer com nenhuma destas.
 */
export type PassCheck =
  | { outcome: "valid"; alreadyEntered: boolean; visit: CheckedVisit }
  | { outcome: "notYet" | "expired"; visit: CheckedVisit }
  | { outcome: "notRecognised" };

export type Outcome = PassCheck["outcome"];

/** O que foi lido não é um comprovante: a resposta que o app dá sozinho, sem perguntar a ninguém. */
export const NOT_RECOGNISED: PassCheck = { outcome: "notRecognised" };

export const OUTCOME_TEXT: Record<Outcome, string> = {
  valid: "Valid",
  notYet: "Not valid yet",
  expired: "Expired",
  notRecognised: "Not recognised",
};

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  visitor: "Visitor",
  delivery: "Delivery",
  service_provider: "Service",
};

/** A unidade como o porteiro a lê, no mesmo formato do card de visitante. */
export function unitText(unit: CheckedVisit["unit"]): string {
  return unit.block === null
    ? `Apt ${unit.number}`
    : `Block ${unit.block} · Apt ${unit.number}`;
}

/**
 * A segunda linha da resposta: o que aquele resultado quer dizer para quem está na portaria.
 *
 * A data da visita é um dia de calendário (`toDisplayDate`); a hora de entrada é um instante
 * (`toDisplayDateTime`). São duas funções diferentes de propósito.
 */
export function outcomeDetail(check: PassCheck): string {
  switch (check.outcome) {
    case "valid":
      // Um comprovante não é "gasto": lido de novo, continua válido. O que muda é este aviso, que
      // é o que diz ao porteiro para perguntar quando duas pessoas mostram o mesmo.
      return check.alreadyEntered && check.visit.enteredAt !== null
        ? `Already came in · ${toDisplayDateTime(check.visit.enteredAt)}`
        : "Valid for today.";
    case "notYet":
      return `Valid on ${toDisplayDate(check.visit.expectedDate)}.`;
    case "expired":
      return `Was valid on ${toDisplayDate(check.visit.expectedDate)}.`;
    case "notRecognised":
      return "This is not a pass of this condominium.";
  }
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCheckedVisit(value: unknown): value is CheckedVisit {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.name === "string" &&
    (value.type === "visitor" ||
      value.type === "delivery" ||
      value.type === "service_provider") &&
    typeof value.expectedDate === "string" &&
    isObject(value.unit) &&
    (value.unit.block === null || typeof value.unit.block === "string") &&
    typeof value.unit.number === "string" &&
    isObject(value.authorizedBy) &&
    typeof value.authorizedBy.name === "string" &&
    (value.enteredAt === null || typeof value.enteredAt === "string")
  );
}

/**
 * `true` quando o valor é exatamente uma das quatro respostas.
 *
 * Um corpo que não passa por aqui é uma FALHA, e nunca "não reconhecido": adivinhar um resultado a
 * partir de uma resposta que o app não entende é como um servidor quebrado viraria "válido".
 */
export function isPassCheck(value: unknown): value is PassCheck {
  if (!isObject(value)) {
    return false;
  }
  switch (value.outcome) {
    case "valid":
      return typeof value.alreadyEntered === "boolean" && isCheckedVisit(value.visit);
    case "notYet":
    case "expired":
      return isCheckedVisit(value.visit);
    case "notRecognised":
      return true;
    default:
      return false;
  }
}
