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

/* -------------------------------------------------------------------------- */
/* Perfil: quem está autenticado e onde pertence (`GET /me`).                  */
/* -------------------------------------------------------------------------- */

/**
 * Cargo de uma pessoa num condomínio. Os mesmos valores do enum do banco.
 *
 * São três: morador, administrador e síndico. O síndico (`manager`) saiu na feature 007 e VOLTOU
 * na 013, como um cargo próprio — é quem criou o condomínio —, e não como outro nome do
 * administrador. Um condomínio pode ter os dois.
 */
export type Role = "resident" | "admin" | "manager";

/**
 * Quem cuida de um condomínio: o administrador ou o síndico.
 *
 * É o ÚNICO lugar do app que responde a essa pergunta — nunca compare um cargo com `"admin"` para
 * oferecer ou esconder uma ação. Os dois cargos são mantidos separados para poderem divergir, e no
 * dia em que algo for só do síndico, é aqui que isso passa a aparecer. O servidor tem a mesma função
 * em `server/src/lib/roles.ts`, e é ele quem recusa de verdade (ADR 0017).
 */
export function managesCondominium(role: Role): boolean {
  return role === "admin" || role === "manager";
}

/** Unidade onde a pessoa mora. `block` é `null` em condomínio sem blocos. */
export interface ProfileUnit {
  id: string;
  block: string | null;
  number: string;
}

/**
 * Vínculo com um condomínio.
 *
 * É uma LISTA no perfil, e `units` é lista dentro dela, porque a mesma pessoa pode pertencer a mais
 * de um condomínio com cargo diferente em cada, e morar em mais de uma unidade do mesmo condomínio.
 * É o motivo de o token não carregar condomínio nem unidade (RN-AUT-05).
 */
export interface ProfileMembership {
  condominium: ProfileCondominium;
  role: Role;
  /** Vazia para quem tem vínculo sem morar em unidade alguma: o administrador e o síndico. */
  units: ProfileUnit[];
}

/**
 * O condomínio de um vínculo. A foto tem duas origens possíveis, e no máximo uma vem preenchida:
 * `imageUrl`, um endereço https, nos condomínios de exemplo; e `photoPath`, um caminho relativo ao
 * endereço da API e assinado, quando o síndico enviou uma. Quem exibe NÃO escolhe entre os dois na
 * mão: usa `condominiumPhotoUri`.
 */
export interface ProfileCondominium {
  id: string;
  name: string;
  imageUrl: string | null;
  photoPath: string | null;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  memberships: ProfileMembership[];
}

/**
 * A unidade como a pessoa a lê: `A-101`, ou só `101` em condomínio sem blocos.
 *
 * Mora aqui, ao lado de `ProfileUnit`, desde o segundo uso — o cabeçalho da home e o card da
 * escolha de condomínio (feature 009).
 */
export function unitLabel(unit: ProfileUnit): string {
  return unit.block === null ? unit.number : `${unit.block}-${unit.number}`;
}

const ROLES: readonly string[] = ["resident", "admin", "manager"];

function isProfileUnit(value: unknown): value is ProfileUnit {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    (value.block === null || typeof value.block === "string") &&
    typeof value.number === "string"
  );
}

/** Exportado porque a criação de um condomínio responde com um vínculo neste mesmo formato. */
export function isProfileMembership(value: unknown): value is ProfileMembership {
  if (!isObject(value)) {
    return false;
  }
  const condominium = value.condominium;
  return (
    isObject(condominium) &&
    typeof condominium.id === "string" &&
    typeof condominium.name === "string" &&
    (condominium.imageUrl === null || typeof condominium.imageUrl === "string") &&
    (condominium.photoPath === null || typeof condominium.photoPath === "string") &&
    typeof value.role === "string" &&
    ROLES.includes(value.role) &&
    Array.isArray(value.units) &&
    value.units.every(isProfileUnit)
  );
}

export function isProfile(value: unknown): value is Profile {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    Array.isArray(value.memberships) &&
    value.memberships.every(isProfileMembership)
  );
}
