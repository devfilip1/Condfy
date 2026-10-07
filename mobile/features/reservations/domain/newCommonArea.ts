/**
 * O formulário de criação de um local de reserva: o que ele carrega e as regras dele.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * ESTE ARQUIVO TEM UM ESPELHO: as regras e as mensagens de `validateNewCommonArea` são as MESMAS de
 * `server/src/condominiums/commonArea.dto.ts`. App e API são projetos separados, então a regra
 * existe nos dois lugares de propósito. Ao mudar um, mude o outro.
 *
 * Uma diferença é da natureza dos dois lados, não descuido: aqui se confere que HÁ uma foto e o
 * tamanho dela; só o servidor confere que os bytes são mesmo uma imagem.
 */

export const NAME_MAX_LENGTH = 60;
/** 5 MB. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const USAGE_FEE_FORMAT = /^\d{1,8}(\.\d{1,2})?$/;

/** O que o formulário entrega. Os TRÊS campos são obrigatórios. */
export interface NewCommonArea {
  name: string;
  /** Como foi DIGITADO: `150`, `150,50` ou `150.50`. */
  usageFee: string;
  /** `null` enquanto nenhuma foi escolhida. O tamanho é o dos bytes que vão ser enviados. */
  photo: { base64: string; byteSize: number } | null;
}

export interface FormErrors {
  name?: string;
  usageFee?: string;
  photo?: string;
}

/**
 * A taxa como o servidor a espera: com PONTO. Quem digita no Brasil usa vírgula, e recusar "150,50"
 * seria recusar o jeito certo de escrever. Só a vírgula é trocada — o resto é com a validação.
 */
export function normalizeUsageFee(typed: string): string {
  return typed.trim().replace(",", ".");
}

export function validateNewCommonArea(input: NewCommonArea): FormErrors {
  const errors: FormErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  // Zero é uma taxa válida — "de graça" —, mas vazio não é zero: o campo precisa ser preenchido.
  const usageFee = normalizeUsageFee(input.usageFee);
  if (usageFee.length === 0) {
    errors.usageFee = "Usage fee is required. Enter 0 if the place is free.";
  } else if (!USAGE_FEE_FORMAT.test(usageFee)) {
    errors.usageFee = "Enter an amount like 150 or 150.50.";
  }

  if (input.photo === null || input.photo.base64.length === 0) {
    errors.photo = "Add a photo of the place.";
  } else if (input.photo.byteSize > PHOTO_MAX_BYTES) {
    errors.photo = "The photo must be 5 MB or smaller.";
  }

  return errors;
}

export function hasNoErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}

/** Os errors de field de um `400`, quando o body veio no formato do contrato. */
export function isFormErrors(value: unknown): value is FormErrors {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([field, message]) =>
      (field === "name" || field === "usageFee" || field === "photo") &&
      typeof message === "string"
  );
}
