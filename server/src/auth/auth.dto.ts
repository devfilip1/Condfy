/**
 * Validação do body das rotas de conta e sessão.
 *
 * As regras e as mensagens são as MESMAS de `mobile/features/auth/domain/session.ts` no
 * aplicativo. App e servidor são projetos separados, então a regra existe nos dois lugares de
 * propósito (research R-006 da feature 002): ao mudar um, mude o outro.
 */

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

export type SignUpValidation =
  | { ok: true; data: SignUpInput }
  | { ok: false; errors: FormErrors };

const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;

/** Mesmo formato exigido pela CHECK `users_email_check` no banco (feature 003). */
export const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function asObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

/** Campo ausente ou de type errado conta como text vazio. */
function text(body: Record<string, unknown>, campo: string): string {
  const value = body[campo];
  return typeof value === "string" ? value.trim() : "";
}

/** E-mail é guardado e comparado em minúsculas, sem espaços (FR-002). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Entrada: devolve `null` quando falta campo.
 *
 * Não existe error por campo aqui de propósito. Responder "e-mail obrigatório" e
 * "password incorreta" de formas diferentes daria pistas sobre o que existe; o contrato manda uma
 * resposta única para toda recusa de entrada (FR-003).
 */
export function validateSignIn(body: unknown): SignInInput | null {
  const data = asObject(body);
  const email = normalizeEmail(text(data, "email"));
  const password = typeof data.password === "string" ? data.password : "";

  if (email.length === 0 || password.length === 0) {
    return null;
  }
  return { email, password };
}

/**
 * Cadastro: devolve error por campo, que o formulário exibe sob cada um (FR-028).
 * A password NÃO é aparada: espaços podem fazer parte dela.
 */
export function validateSignUp(body: unknown): SignUpValidation {
  const data = asObject(body);
  const name = text(data, "name");
  const email = normalizeEmail(text(data, "email"));
  const password = typeof data.password === "string" ? data.password : "";

  const errors: FormErrors = {};

  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    errors.email = "Enter a valid e-mail.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: { name, email, password } };
}
