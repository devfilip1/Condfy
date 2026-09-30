import type { VisitType } from "../../generated/prisma/enums.ts";

/**
 * Validação do body de `POST /visitors`.
 *
 * As regras e as mensagens são as MESMAS de `features/visitors/domain/visitor.ts` no app
 * (`validateNewVisitor`). App e API são projetos separados, então a regra existe nos dois
 * lugares de propósito (research R-006): ao mudar um, mude o outro.
 */

export type { VisitType };

/** Os três valores aceitos, na mesma ordem do enum do banco. */
export const VISIT_TYPES: readonly VisitType[] = [
  "visitor",
  "delivery",
  "service_provider",
];

export interface NewVisitor {
  name: string;
  type: VisitType;
  expectedDate: string;
  authorizedBy: string;
}

/** Erros por field, no mesmo formato que o formulário do app exibe. */
export interface FormErrors {
  name?: string;
  type?: string;
  expectedDate?: string;
  authorizedBy?: string;
}

export type ResultadoValidacao =
  | { ok: true; data: NewVisitor }
  | { ok: false; errors: FormErrors };

const NAME_MAX_LENGTH = 60;

/** Cópia de `isValidISODate` do app (`shared/lib/calendario.ts`): data de calendário real. */
function isValidISODate(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) {
    return false;
  }
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  // Dia 0 do mês seguinte é o último day do mês corrente (em UTC, sem depender do fuso).
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDayOfMonth;
}

function isVisitType(value: string): value is VisitType {
  return (VISIT_TYPES as readonly string[]).includes(value);
}

/** Campo ausente ou de type errado conta como text vazio. */
function text(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Valida o body recebido como `unknown` (Constituição, Princípio IV).
 * Campos extras e um eventual `id` são ignorados: o id é sempre gerado pelo banco (FR-014).
 */
export function validateNewVisitor(body: unknown): ResultadoValidacao {
  const asObject: Record<string, unknown> =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const name = text(asObject, "name");
  const type = text(asObject, "type");
  const expectedDate = text(asObject, "expectedDate");
  const authorizedBy = text(asObject, "authorizedBy");

  const errors: FormErrors = {};

  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (!isVisitType(type)) {
    errors.type = "Select a visit type.";
  }

  if (expectedDate.length === 0) {
    errors.expectedDate = "Expected date is required.";
  } else if (!isValidISODate(expectedDate)) {
    errors.expectedDate = "Enter a real date as DD/MM/YYYY.";
  }

  if (authorizedBy.length === 0) {
    errors.authorizedBy = "Authorizing resident is required.";
  }

  if (Object.keys(errors).length > 0 || !isVisitType(type)) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, type, expectedDate, authorizedBy } };
}
