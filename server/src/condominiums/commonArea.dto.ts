import {
  MESSAGE_PHOTO_NOT_IMAGE,
  decodeUploadedPhoto,
  type UploadedPhoto,
} from "../lib/uploadedPhoto.ts";

/**
 * Validações de uma área comum: a troca de disponibilidade e a criação.
 *
 * **A da disponibilidade NÃO TEM ESPELHO NO APP**, e não é descuido: o app manda a posição de um
 * interruptor, não um campo digitado.
 *
 * **A da criação TEM**: as regras e as mensagens de `validateNewCommonArea` são as MESMAS de
 * `mobile/features/reservations/domain/newCommonArea.ts`. Ao mudar um, mude o outro. A única
 * diferença é da natureza dos dois lados: só o servidor olha os BYTES da foto.
 */

/* -------------------------------------------------------------------------- */
/* Novo local                                                                 */
/* -------------------------------------------------------------------------- */

export const NAME_MAX_LENGTH = 60;
/** Até oito dígitos e duas casas: o que cabe na coluna `DECIMAL(10,2)`, sempre com ponto. */
const USAGE_FEE_FORMAT = /^\d{1,8}(\.\d{1,2})?$/;

/** Dados já validados de um novo local. O condomínio vem do caminho; quem cria, do token. */
export interface NewCommonArea {
  name: string;
  /** Dinheiro como TEXTO — `"0"`, `"150.00"` —, para nunca passar por um float. */
  usageFee: string;
  photo: UploadedPhoto;
}

export interface NewCommonAreaErrors {
  name?: string;
  usageFee?: string;
  photo?: string;
}

export type NewCommonAreaValidation =
  | { ok: true; data: NewCommonArea }
  | { ok: false; errors: NewCommonAreaErrors };

export const MESSAGE_NAME_TAKEN =
  "This condominium already has a place with this name.";

/**
 * Valida o body recebido como `unknown` (Constituição, Princípio IV).
 *
 * Os TRÊS campos são obrigatórios, a foto inclusive — diferente do condomínio, onde ela é opcional.
 * A taxa aceita zero (`"0"` é "de graça"), mas precisa vir preenchida: vazio não é zero.
 * `isAvailable`, `imageUrl` e qualquer outro campo são ignorados — o local nasce disponível.
 */
export function validateNewCommonArea(body: unknown): NewCommonAreaValidation {
  const data: Record<string, unknown> =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const errors: NewCommonAreaErrors = {};

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  // Só texto: um número JSON já chegou como float, e isto é dinheiro.
  const usageFee = typeof data.usageFee === "string" ? data.usageFee.trim() : "";
  if (usageFee.length === 0) {
    errors.usageFee = "Usage fee is required. Enter 0 if the place is free.";
  } else if (!USAGE_FEE_FORMAT.test(usageFee)) {
    errors.usageFee = "Enter an amount like 150 or 150.50.";
  }

  let photo: UploadedPhoto | null = null;
  if (typeof data.photo !== "string" || data.photo.length === 0) {
    errors.photo =
      data.photo === undefined || data.photo === null || data.photo === ""
        ? "Add a photo of the place."
        : MESSAGE_PHOTO_NOT_IMAGE;
  } else {
    const decoded = decodeUploadedPhoto(data.photo);
    if (typeof decoded === "string") {
      errors.photo = decoded;
    } else {
      photo = decoded;
    }
  }

  if (Object.keys(errors).length > 0 || photo === null) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, usageFee, photo } };
}

/* -------------------------------------------------------------------------- */
/* Disponibilidade                                                            */
/* -------------------------------------------------------------------------- */

export interface AvailabilityChange {
  isAvailable: boolean;
}

export type AvailabilityChangeValidation =
  | { ok: true; data: AvailabilityChange }
  | { ok: false; errors: { isAvailable: string } };

const MESSAGE_BAD_AVAILABILITY = "Say whether the place is available.";

/**
 * Valida o body recebido como `unknown` (Princípio IV).
 *
 * Só `isAvailable` é lido, e só um booleano de verdade passa: `"false"` e `0` são recusados em vez
 * de adivinhados. O resto do body é ignorado — esta rota não renomeia o local nem muda a taxa.
 */
export function validateAvailabilityChange(
  body: unknown
): AvailabilityChangeValidation {
  const isAvailable =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).isAvailable
      : undefined;

  if (typeof isAvailable !== "boolean") {
    return { ok: false, errors: { isAvailable: MESSAGE_BAD_AVAILABILITY } };
  }

  return { ok: true, data: { isAvailable: isAvailable } };
}
