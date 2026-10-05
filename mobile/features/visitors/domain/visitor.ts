/**
 * Entidade de domínio Visitor e suas regras puras.
 *
 * Esta camada não importa React nem React Native.
 */

import { isValidISODate } from "@/shared/lib/calendar";

/** Os mesmos três valores do enum do banco e do contrato. Em inglês (ADR 0008). */
export type VisitType = "visitor" | "delivery" | "service_provider";

export const VISIT_TYPES: readonly VisitType[] = [
  "visitor",
  "delivery",
  "service_provider",
];

/** Unidade visitada. `block` é `null` em condomínio sem blocos. */
export interface VisitorUnit {
  id: string;
  block: string | null;
  number: string;
}

/** Quem autorizou a visita — vem do token no servidor, nunca do formulário. */
export interface VisitorAuthorizer {
  id: string;
  name: string;
}

export interface Visitor {
  id: string;
  name: string;
  type: VisitType;
  /** Dia previsto da visita no formato ISO `YYYY-MM-DD`, sem horário. */
  expectedDate: string;
  condominiumId: string;
  unit: VisitorUnit;
  authorizedBy: VisitorAuthorizer;
}

/**
 * O que o formulário envia. NÃO é `Omit<Visitor, "id">`: o corpo manda só a unidade, e o
 * condomínio sai dela enquanto quem autorizou sai do token (ADR 0009). O formulário não escolhe
 * nenhum dos dois.
 */
export interface NewVisitor {
  name: string;
  type: VisitType;
  expectedDate: string;
  unitId: string;
}

export interface FormErrors {
  name?: string;
  type?: string;
  expectedDate?: string;
  unitId?: string;
}

export const NAME_MAX_LENGTH = 60;

/** Os ids do banco são uuid v4. Mesmo teste de `server/src/visitors/visitor.dto.ts`. */
const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Só a forma é conferida aqui. Se a unidade existe, e se quem autoriza pertence àquele
  // condomínio, quem confere é o servidor — depende do banco e da identidade do token.
  // Mesma mensagem de `visitor.dto.ts`, que o formulário exibe sem traduzir.
  if (!UUID_FORMAT.test(input.unitId.trim())) {
    errors.unitId = "Select a unit.";
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

function isVisitorUnit(value: unknown): value is VisitorUnit {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    (value.block === null || typeof value.block === "string") &&
    typeof value.number === "string"
  );
}

function isVisitorAuthorizer(value: unknown): value is VisitorAuthorizer {
  if (!isObject(value)) {
    return false;
  }
  return typeof value.id === "string" && typeof value.name === "string";
}

/** `true` quando o value tem exatamente a forma de um `Visitor` válido. */
export function isVisitor(value: unknown): value is Visitor {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.condominiumId === "string" &&
    isVisitorUnit(value.unit) &&
    isVisitorAuthorizer(value.authorizedBy) &&
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

const FORM_FIELDS: readonly (keyof FormErrors)[] = [
  "name",
  "type",
  "expectedDate",
  "unitId",
];

/** `true` quando o value é um objeto de errors por field, no formato do formulário. */
export function isFormErrors(value: unknown): value is FormErrors {
  if (!isObject(value)) {
    return false;
  }
  return FORM_FIELDS.every(
    (field) => value[field] === undefined || typeof value[field] === "string"
  );
}
