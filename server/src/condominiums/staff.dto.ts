import {
  EMAIL_FORMAT,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
} from "../auth/auth.dto.ts";

/**
 * Validação do body das rotas de cargos: trazer uma pessoa, mudar o cargo dela e definir outra
 * password provisória.
 *
 * As regras e as mensagens são as MESMAS de `mobile/features/staff/domain/staff.ts` no aplicativo.
 * App e servidor são projetos separados, então a regra existe nos dois lugares de propósito: ao
 * mudar um, mude o outro.
 *
 * Nome, e-mail e password seguem EXATAMENTE as regras do cadastro, com as mesmas mensagens (FR-014
 * da 014) — por isso as constantes vêm de `auth.dto.ts`, em vez de serem repetidas aqui.
 *
 * Só valida a FORMA. Se o e-mail está livre e se o condomínio já tem administrador são perguntas
 * que quem responde é o banco, pelos índices únicos.
 */

/** Os cargos que o síndico atribui. Síndico e morador não saem deste módulo (FR-012). */
export type StaffRole = "admin" | "doorman";

export interface NewStaffMember {
  name: string;
  email: string;
  /** A password provisória, como foi digitada. Nunca é devolvida em resposta nenhuma. */
  password: string;
  role: StaffRole;
}

export type Validation<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

export const MESSAGE_EMAIL_TAKEN = "This e-mail is already in use.";
export const MESSAGE_ADMIN_TAKEN =
  "This condominium already has an administrator.";
const MESSAGE_ROLE_REQUIRED = "Choose a role.";

function asObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function finish<T>(errors: Record<string, string>, data: T): Validation<T> {
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, data };
}

function roleOf(value: unknown): StaffRole | null {
  return value === "admin" || value === "doorman" ? value : null;
}

/** A password NÃO é aparada: espaço no começo ou no fim faz parte dela. */
function passwordOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function passwordError(password: string): string | undefined {
  return password.length < PASSWORD_MIN_LENGTH
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    : undefined;
}

/**
 * Trazer uma pessoa: nome, e-mail, password provisória e cargo. Qualquer outro campo do body —
 * um `id`, um `condominiumId`, um `passwordIsProvisional` — é ignorado.
 */
export function validateNewStaffMember(body: unknown): Validation<NewStaffMember> {
  const data = asObject(body);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = normalizeEmail(typeof data.email === "string" ? data.email : "");
  const password = passwordOf(data.password);
  const role = roleOf(data.role);

  const errors: Record<string, string> = {};

  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    errors.email = "Enter a valid e-mail.";
  }

  const passwordMessage = passwordError(password);
  if (passwordMessage) {
    errors.password = passwordMessage;
  }

  if (role === null) {
    errors.role = MESSAGE_ROLE_REQUIRED;
  }

  // `role ?? "doorman"` só satisfaz o tipo: com `role` nulo há erro, e `data` não é usado.
  return finish(errors, { name, email, password, role: role ?? "doorman" });
}

/** Mudar o cargo: o body só tem como mudar `role`; o resto é ignorado. */
export function validateRoleChange(body: unknown): Validation<{ role: StaffRole }> {
  const role = roleOf(asObject(body).role);

  const errors: Record<string, string> = {};
  if (role === null) {
    errors.role = MESSAGE_ROLE_REQUIRED;
  }

  return finish(errors, { role: role ?? "doorman" });
}

/** Outra password provisória: a mesma regra de qualquer password. */
export function validateProvisionalPassword(
  body: unknown
): Validation<{ password: string }> {
  const password = passwordOf(asObject(body).password);

  const errors: Record<string, string> = {};
  const passwordMessage = passwordError(password);
  if (passwordMessage) {
    errors.password = passwordMessage;
  }

  return finish(errors, { password });
}
