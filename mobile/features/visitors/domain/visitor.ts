/**
 * Entidade de domínio Visitor e suas regras puras.
 *
 * Esta camada não importa React nem React Native.
 */

import { isValidISODate } from "@/shared/lib/calendar";

export type VisitType = "visitor" | "entrega" | "prestador";

export const VISIT_TYPES: readonly VisitType[] = [
  "visitor",
  "entrega",
  "prestador",
];

export interface Visitor {
  id: string;
  name: string;
  type: VisitType;
  /** Dia previsto da visita no formato ISO `YYYY-MM-DD`, sem horário. */
  expectedDate: string;
  authorizedBy: string;
}

export type NewVisitor = Omit<Visitor, "id">;

export interface FormErrors {
  name?: string;
  type?: string;
  expectedDate?: string;
  authorizedBy?: string;
}

export const NAME_MAX_LENGTH = 60;

/**
 * Ordena pela data prevista, da mais próxima para a mais distante (FR-017).
 * Estável em caso de empate e sem alterar o array recebido.
 */
export function sortByExpectedDate(list: Visitor[]): Visitor[] {
  return list
    .map((visitor, index) => ({ visitor, index }))
    .sort((a, b) => {
      if (a.visitor.expectedDate === b.visitor.expectedDate) {
        return a.index - b.index;
      }
      return a.visitor.expectedDate < b.visitor.expectedDate ? -1 : 1;
    })
    .map((item) => item.visitor);
}

/**
 * Aplica as regras V-01 a V-06 do data-model e devolve os errors por field.
 * Objeto empty significa input válida.
 */
export function validateNewVisitor(input: NewVisitor): FormErrors {
  const errors: FormErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (!VISIT_TYPES.includes(input.type)) {
    errors.type = "Select a visit type.";
  }

  const expectedDate = input.expectedDate.trim();
  if (expectedDate.length === 0) {
    errors.expectedDate = "Expected date is required.";
  } else if (!isValidISODate(expectedDate)) {
    errors.expectedDate = "Enter a real date as DD/MM/YYYY.";
  }

  if (input.authorizedBy.trim().length === 0) {
    errors.authorizedBy = "Authorizing resident is required.";
  }

  return errors;
}

/** `true` quando a validação não encontrou nenhum error. */
export function hasNoErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `true` quando o value tem exatamente a forma de um `Visitor` válido. */
export function isVisitor(value: unknown): value is Visitor {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.authorizedBy === "string" &&
    typeof value.type === "string" &&
    (VISIT_TYPES as readonly string[]).includes(value.type) &&
    typeof value.expectedDate === "string" &&
    isValidISODate(value.expectedDate)
  );
}

/** `true` quando o value é uma list em que todo item é um `Visitor`. */
export function isVisitorList(value: unknown): value is Visitor[] {
  return Array.isArray(value) && value.every(isVisitor);
}

const CAMPOS_FORMULARIO: readonly (keyof FormErrors)[] = [
  "name",
  "type",
  "expectedDate",
  "authorizedBy",
];

/** `true` quando o value é um objeto de errors por field, no formato do formulário. */
export function isFormErrors(value: unknown): value is FormErrors {
  if (!isObject(value)) {
    return false;
  }
  return CAMPOS_FORMULARIO.every(
    (field) => value[field] === undefined || typeof value[field] === "string"
  );
}
