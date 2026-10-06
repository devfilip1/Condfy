/**
 * Validação dos formulários que mexem na própria conta: trocar e-mail, trocar password e apagar.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * ESTE ARQUIVO TEM UM ESPELHO: as regras e as mensagens são as MESMAS de
 * `server/src/auth/account.dto.ts`. App e servidor são projetos separados, então a regra existe
 * nos dois lugares de propósito: a daqui para a pessoa saber na hora, a de lá para o dado não entrar
 * errado. Ao mudar um, mude o outro.
 *
 * Duas mensagens só o servidor consegue dar, e não aparecem aqui: "Current password is incorrect."
 * e "This e-mail cannot be used." — o app não conhece a password nem as contas dos outros.
 */

export type FieldErrors = Record<string, string>;

export const PASSWORD_MIN_LENGTH = 8;
const EMAIL_MAX_LENGTH = 254;

/** O mesmo formato do cadastro e da CHECK `users_email_check` no banco. */
const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const MESSAGE_CURRENT_PASSWORD_REQUIRED = "Enter your current password.";

/** E-mail é comparado em minúsculas, sem espaços em volta — como no cadastro. */
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmailChange(input: {
  email: string;
  currentPassword: string;
  /** O e-mail que a conta tem hoje, para recusar a troca pelo mesmo. */
  currentEmail: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const email = normalizeEmail(input.email);

  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    errors.email = "Enter a valid e-mail.";
  } else if (email === normalizeEmail(input.currentEmail)) {
    errors.email = "This is already your e-mail.";
  }

  if (input.currentPassword.length === 0) {
    errors.currentPassword = MESSAGE_CURRENT_PASSWORD_REQUIRED;
  }

  return errors;
}

export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (input.currentPassword.length === 0) {
    errors.currentPassword = MESSAGE_CURRENT_PASSWORD_REQUIRED;
  }

  if (input.newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (
    input.currentPassword.length > 0 &&
    input.newPassword === input.currentPassword
  ) {
    errors.newPassword = "Choose a password different from the current one.";
  }

  return errors;
}

export function validateAccountDeletion(input: {
  currentPassword: string;
}): FieldErrors {
  return input.currentPassword.length === 0
    ? { currentPassword: MESSAGE_CURRENT_PASSWORD_REQUIRED }
    : {};
}

export function hasNoErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}
