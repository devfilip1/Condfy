import { PASSWORD_MIN_LENGTH, validateSignUp } from "@/features/auth";

/**
 * Regras puras dos cargos de um condomínio: quem o síndico trouxe para trabalhar nele.
 *
 * As regras e as mensagens são as MESMAS de `server/src/condominiums/staff.dto.ts`. App e servidor
 * são projetos separados, então a regra existe nos dois lugares de propósito: ao mudar um, mude o
 * outro.
 *
 * Nome, e-mail e password seguem EXATAMENTE as regras do cadastro, com as mesmas mensagens — por
 * isso passam por `validateSignUp`, em vez de serem reescritas aqui.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 */

/** Os cargos que o síndico atribui. Síndico e morador não saem deste módulo. */
export type StaffRole = "admin" | "doorman";

/** Uma pessoa com cargo, como o servidor a devolve. Nunca traz password. */
export interface StaffMember {
  userId: string;
  /** O nome DA PESSOA, e não "Administrator": é como o síndico distingue dois porteiros. */
  name: string;
  email: string;
  role: StaffRole;
  /** A pessoa ainda não trocou a password que o síndico definiu. */
  passwordIsProvisional: boolean;
}

/** O formulário de trazer uma pessoa. `role` é `null` enquanto nenhum cargo foi escolhido. */
export interface NewStaffMember {
  name: string;
  email: string;
  password: string;
  role: StaffRole | null;
}

export interface StaffFormErrors {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrator",
  doorman: "Doorman",
};

/** A mesma frase que o servidor devolve no campo `role` quando o lugar está ocupado. */
export const MESSAGE_ADMIN_TAKEN =
  "This condominium already has an administrator.";

export function validateNewStaffMember(input: NewStaffMember): StaffFormErrors {
  const errors: StaffFormErrors = validateSignUp(
    input.name,
    input.email,
    input.password
  );
  if (input.role === null) {
    errors.role = "Choose a role.";
  }
  return errors;
}

/** Outra password provisória: a mesma regra de qualquer password. Não é aparada. */
export function validateProvisionalPassword(password: string): string | null {
  return password.length < PASSWORD_MIN_LENGTH
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    : null;
}

export function hasNoErrors(errors: StaffFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * O condomínio já tem administrador — ou, com `exceptUserId`, tem um que NÃO é aquela pessoa.
 *
 * É o que deixa a opção "Administrator" indisponível no formulário ANTES de enviar. Isso é
 * cortesia: quem decide de verdade é o índice único do banco.
 */
export function hasAdministrator(
  staff: readonly StaffMember[],
  exceptUserId?: string
): boolean {
  return staff.some(
    (member) => member.role === "admin" && member.userId !== exceptUserId
  );
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStaffMember(value: unknown): value is StaffMember {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.userId === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    (value.role === "admin" || value.role === "doorman") &&
    typeof value.passwordIsProvisional === "boolean"
  );
}

export function isStaffList(value: unknown): value is StaffMember[] {
  return Array.isArray(value) && value.every(isStaffMember);
}

/** Os erros por campo de um `400`, quando o corpo tem essa forma. */
export function fieldErrorsOf(body: unknown): StaffFormErrors | null {
  if (!isObject(body) || !isObject(body.errors)) {
    return null;
  }
  const errors: StaffFormErrors = {};
  for (const field of ["name", "email", "password", "role"] as const) {
    const message = body.errors[field];
    if (typeof message === "string") {
      errors[field] = message;
    }
  }
  return errors;
}
