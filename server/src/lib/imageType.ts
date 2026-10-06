/**
 * Que tipo de imagem são estes bytes — pela assinatura do arquivo, não pelo que quem enviou disse.
 *
 * Função pura: não conhece HTTP nem Prisma. Um tipo informado pelo cliente é uma alegação; os
 * primeiros bytes são um fato, e conferi-los custa uma dúzia de linhas sem biblioteca nenhuma
 * (feature 008, research R-004). O tipo devolvido aqui é o que fica gravado e o que é servido
 * depois.
 *
 * Isto NÃO prova que a imagem inteira é válida — só que ela começa como uma. Decodificar de
 * verdade exigiria uma biblioteca de imagem; junto do teto de tamanho, a assinatura é proporcional
 * ao risco de "a foto de um guarda-chuva".
 */

/** Os três formatos aceitos. São os mesmos da CHECK `found_items_photo_content_type_check`. */
export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }
  return signature.every((value, index) => bytes[offset + index] === value);
}

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// "RIFF" nos bytes 0-3 e "WEBP" nos 8-11; os quatro do meio são o tamanho do arquivo.
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

/** O tipo da imagem, ou `null` quando os bytes não começam como nenhum dos três. */
export function detectImageType(bytes: Uint8Array): ImageContentType | null {
  if (startsWith(bytes, JPEG)) {
    return "image/jpeg";
  }
  if (startsWith(bytes, PNG)) {
    return "image/png";
  }
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
    return "image/webp";
  }
  return null;
}
