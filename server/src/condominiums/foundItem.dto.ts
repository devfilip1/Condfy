import type { FoundItemStatus } from "../../generated/prisma/enums.ts";
import { detectImageType, type ImageContentType } from "../lib/imageType.ts";

/**
 * Validação da entrada das rotas de achados e perdidos.
 *
 * Só valida: não escolhe status code, não lê banco e não aplica regra de permissão.
 *
 * As regras e as mensagens de `validateNewFoundItem` são as MESMAS de
 * `mobile/features/lostAndFound/domain/foundItem.ts` no app. App e API são projetos separados,
 * então a regra existe nos dois lugares de propósito: a do app para a pessoa saber na hora, a da
 * API para o dado não entrar errado. Ao mudar um, mude o outro.
 *
 * Há uma diferença que é da natureza dos dois lados, não descuido: o app confere o TAMANHO da foto
 * e se existe uma; só aqui se confere que os bytes são mesmo uma imagem. O app não tem os bytes
 * decodificados na mão, e a conferência que importa é a de quem grava.
 */

export const DESCRIPTION_MAX_LENGTH = 200;
export const PLACE_MAX_LENGTH = 120;
/** 5 MB. O mesmo número da CHECK `found_items_photo_size_check`. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export interface FormErrors {
  description?: string;
  place?: string;
  photo?: string;
}

/** O item já validado, com a foto decodificada e o tipo DETECTADO — nunca informado. */
export interface NewFoundItem {
  description: string;
  place: string;
  photo: Uint8Array<ArrayBuffer>;
  photoContentType: ImageContentType;
}

export type FoundItemValidation =
  | { ok: true; data: NewFoundItem }
  | { ok: false; errors: FormErrors };

export type StatusChangeValidation =
  | { ok: true; data: { status: FoundItemStatus } }
  | { ok: false; errors: { status: string } };

const MESSAGE_PHOTO_REQUIRED = "Add a photo of the item.";
const MESSAGE_PHOTO_NOT_IMAGE = "The photo must be a JPEG, PNG or WebP image.";
const MESSAGE_PHOTO_TOO_LARGE = "The photo must be 5 MB or smaller.";

function asObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function text(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

/**
 * A foto decodificada, ou a mensagem do que há de errado com ela.
 *
 * O formato é conferido ANTES de decodificar: `Buffer.from(…, "base64")` nunca falha — ele ignora
 * calado o que não entende e devolve o que sobrou, então "decodificou" não quer dizer "era base64".
 */
function decodePhoto(
  encoded: string
): { photo: Uint8Array<ArrayBuffer>; photoContentType: ImageContentType } | string {
  if (encoded.length === 0) {
    return MESSAGE_PHOTO_REQUIRED;
  }
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return MESSAGE_PHOTO_NOT_IMAGE;
  }

  // Cópia para um `Uint8Array` de buffer próprio, que é o que a coluna `Bytes` do Prisma aceita.
  const photo = new Uint8Array(Buffer.from(encoded, "base64"));

  const photoContentType = detectImageType(photo);
  if (!photoContentType) {
    return MESSAGE_PHOTO_NOT_IMAGE;
  }
  // Depois do tipo, de propósito: um arquivo grande que nem imagem é ouve que não é imagem, que é
  // a correção que resolve.
  if (photo.length > PHOTO_MAX_BYTES) {
    return MESSAGE_PHOTO_TOO_LARGE;
  }

  return { photo, photoContentType };
}

/**
 * Valida o body de `POST /condominiums/:condominiumId/found-items`, recebido como `unknown`
 * (Constituição, Princípio IV).
 *
 * Só três campos são lidos. `status`, `postedAt`, `postedById` e qualquer tipo de mídia que o body
 * traga são ignorados: os dois primeiros são do banco, o terceiro é do token, e o tipo é detectado.
 *
 * Descrição e local são APARADOS antes de gravar — são rótulos de uma linha, então não há linha em
 * branco a preservar, ao contrário do corpo de um aviso.
 */
export function validateNewFoundItem(body: unknown): FoundItemValidation {
  const data = asObject(body);
  const description = text(data, "description").trim();
  const place = text(data, "place").trim();

  const errors: FormErrors = {};

  if (description.length === 0) {
    errors.description = "Describe the item.";
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Use up to ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (place.length === 0) {
    errors.place = "Say where it was found.";
  } else if (place.length > PLACE_MAX_LENGTH) {
    errors.place = `Use up to ${PLACE_MAX_LENGTH} characters.`;
  }

  const decoded = decodePhoto(text(data, "photo"));
  if (typeof decoded === "string") {
    errors.photo = decoded;
  }

  if (typeof decoded === "string" || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      description,
      place,
      photo: decoded.photo,
      photoContentType: decoded.photoContentType,
    },
  };
}

/**
 * Valida o body de `PATCH /condominiums/:condominiumId/found-items/:itemId`.
 *
 * Devolve SÓ o status. Qualquer outro campo que o body traga some aqui, e é isso que faz a troca de
 * status não conseguir mudar descrição, local ou foto: não há por onde eles passarem (FR-030).
 */
export function validateStatusChange(body: unknown): StatusChangeValidation {
  const status = asObject(body).status;

  if (status === "found" || status === "returned") {
    return { ok: true, data: { status: status } };
  }
  return { ok: false, errors: { status: "Choose found or returned." } };
}
