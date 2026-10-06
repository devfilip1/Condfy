import {
  EMAIL_FORMAT,
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
} from "./auth.dto.ts";

/**
 * Validação do body das três rotas que mexem na PRÓPRIA conta: trocar e-mail, trocar password e
 * apagar a conta.
 *
 * As regras e as mensagens são as MESMAS de `mobile/features/settings/domain/account.ts` no
 * aplicativo. App e servidor são projetos separados, então a regra existe nos dois lugares de
 * propósito: ao mudar um, mude o outro.
 *
 * Só valida a FORMA. Se a password atual confere, se o e-mail está livre e se a conta pode ser
 * apagada são perguntas do service — e duas delas quem responde é o banco.
 *
 * De quem é a conta não aparece em body nenhum: vem do token (FR-022).
 */

export interface EmailChange {
  email: string;
  currentPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface AccountDeletion {
  currentPassword: string;
}

export type Validation<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string> };

const MESSAGE_CURRENT_PASSWORD_REQUIRED = "Enter your current password.";

function asObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

/** Password NÃO é aparada: espaço no começo ou no fim faz parte dela. */
function password(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

function finish<T>(errors: Record<string, string>, data: T): Validation<T> {
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, data };
}

/** O e-mail passa pela MESMA regra do cadastro, normalização incluída (FR-012). */
export function validateEmailChange(body: unknown): Validation<EmailChange> {
  const data = asObject(body);
  const rawEmail = typeof data.email === "string" ? data.email : "";
  const email = normalizeEmail(rawEmail.trim());
  const currentPassword = password(data, "currentPassword");

  const errors: Record<string, string> = {};

  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    errors.email = "Enter a valid e-mail.";
  }
  if (currentPassword.length === 0) {
    errors.currentPassword = MESSAGE_CURRENT_PASSWORD_REQUIRED;
  }

  return finish(errors, { email, currentPassword });
}

/** A password nova passa pela MESMA regra do cadastro (FR-017). */
export function validatePasswordChange(body: unknown): Validation<PasswordChange> {
  const data = asObject(body);
  const currentPassword = password(data, "currentPassword");
  const newPassword = password(data, "newPassword");

  const errors: Record<string, string> = {};

  if (currentPassword.length === 0) {
    errors.currentPassword = MESSAGE_CURRENT_PASSWORD_REQUIRED;
  }
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  return finish(errors, { currentPassword, newPassword });
}

export function validateAccountDeletion(body: unknown): Validation<AccountDeletion> {
  const currentPassword = password(asObject(body), "currentPassword");

  const errors: Record<string, string> = {};
  if (currentPassword.length === 0) {
    errors.currentPassword = MESSAGE_CURRENT_PASSWORD_REQUIRED;
  }

  return finish(errors, { currentPassword });
}
