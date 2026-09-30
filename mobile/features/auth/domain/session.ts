/**
 * Regras puras de conta e sessão.
 *
 * As mensagens são idênticas às de `server/src/auth/auth.dto.ts`: o formulário exibe tanto o error
 * detectado aqui quanto o devolvido pelo servidor, sob o mesmo field, sem traduzir nada.
 * Esta camada não importa React nem React Native.
 */

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Credentials {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601: quando `accessToken` expira. */
  expiresAt: string;
  /** ISO 8601: prazo da credencial de renovação, renovado a cada rotação. */
  refreshExpiresAt: string;
}

export interface Session {
  user: User;
  credentials: Credentials;
}

export interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

export const PASSWORD_MIN_LENGTH = 8;
export const NAME_MAX_LENGTH = 100;

const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** E-mail viaja e é comparado em minúsculas, sem espaços (FR-002). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Entrada: só confere se os fields foram preenchidos (FR-004). */
export function validateSignIn(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (normalizeEmail(email).length === 0) {
    errors.email = "E-mail is required.";
  }
  if (password.length === 0) {
    errors.password = "Password is required.";
  }
  return errors;
}

/** Cadastro: as mesmas regras que o servidor aplica de novo (FR-028, FR-029). */
export function validateSignUp(
  name: string,
  email: string,
  password: string
): FormErrors {
  const errors: FormErrors = {};

  const nomeLimpo = name.trim();
  if (nomeLimpo.length === 0) {
    errors.name = "Name is required.";
  } else if (nomeLimpo.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  const emailLimpo = normalizeEmail(email);
  if (emailLimpo.length === 0 || !EMAIL_FORMAT.test(emailLimpo)) {
    errors.email = "Enter a valid e-mail.";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
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

export function isUser(value: unknown): value is User {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string"
  );
}

export function isCredentials(value: unknown): value is Credentials {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === "string" &&
    value.refreshToken.length > 0 &&
    typeof value.expiresAt === "string" &&
    typeof value.refreshExpiresAt === "string"
  );
}

export function isSession(value: unknown): value is Session {
  return (
    isObject(value) && isUser(value.user) && isCredentials(value.credentials)
  );
}

export function isFormErrors(value: unknown): value is FormErrors {
  if (!isObject(value)) {
    return false;
  }
  return (["name", "email", "password"] as const).every(
    (field) => value[field] === undefined || typeof value[field] === "string"
  );
}
