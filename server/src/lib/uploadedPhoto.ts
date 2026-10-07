import { detectImageType, type ImageContentType } from "./imageType.ts";

/**
 * Decodifica uma foto enviada em base64 dentro de um JSON e diz o que há de errado com ela.
 *
 * Veio para cá no terceiro uso — a foto de um condomínio e a de um local de reserva; a de um item
 * encontrado nasceu antes e continua com a cópia dela em `foundItem.dto.ts`.
 *
 * Quem decide o tipo é este módulo, olhando os primeiros bytes — nunca o que quem enviou disse.
 */

/** 5 MB. A mesma regra está numa CHECK de cada tabela que guarda foto. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const MESSAGE_PHOTO_TOO_LARGE = "The photo must be 5 MB or smaller.";
export const MESSAGE_PHOTO_NOT_IMAGE =
  "The photo must be a JPEG, PNG or WebP image.";

export interface UploadedPhoto {
  bytes: Uint8Array<ArrayBuffer>;
  contentType: ImageContentType;
}

/**
 * A foto decodificada, ou a MENSAGEM do que há de errado com ela.
 *
 * O formato é conferido ANTES de decodificar: `Buffer.from(…, "base64")` nunca falha — ele ignora
 * calado o que não entende, então "decodificou" não quer dizer "era base64".
 */
export function decodeUploadedPhoto(encoded: string): UploadedPhoto | string {
  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    return MESSAGE_PHOTO_NOT_IMAGE;
  }

  // Cópia para um `Uint8Array` de buffer próprio, que é o que a coluna `Bytes` do Prisma aceita.
  const bytes = new Uint8Array(Buffer.from(encoded, "base64"));

  const contentType = detectImageType(bytes);
  if (!contentType) {
    return MESSAGE_PHOTO_NOT_IMAGE;
  }
  // Depois do tipo, de propósito: um arquivo grande que nem imagem é ouve que não é imagem, que é
  // a correção que resolve.
  if (bytes.length > PHOTO_MAX_BYTES) {
    return MESSAGE_PHOTO_TOO_LARGE;
  }

  return { bytes, contentType };
}
