import { createHmac, timingSafeEqual } from "node:crypto";

import { JWT_SECRET } from "./config.ts";

/**
 * Caminhos assinados com prazo: a permissão vai na própria URL.
 *
 * Existe porque uma imagem na web é uma tag `<img>`, e uma tag `<img>` não envia o cabeçalho
 * `Authorization`. Uma rota de foto atrás do token funcionaria no celular e falharia calada no
 * navegador (feature 008, research R-005, ADR 0012). Com a assinatura, quem recebeu o caminho —
 * dentro de uma resposta que só um membro recebe — consegue buscar aquele recurso, por um tempo.
 *
 * Funções puras sobre texto: não conhecem HTTP nem Prisma.
 *
 * **O que é assinado é o CAMINHO inteiro mais o prazo.** É isso que torna a assinatura de um item
 * inútil no id de outro, e um prazo vencido impossível de esticar.
 */

/**
 * Chave própria, derivada do segredo que o servidor já exige para subir. Não é o segredo em si:
 * assim uma assinatura de caminho nunca tem a forma de nada que o JWT assine.
 */
const KEY = createHmac("sha256", JWT_SECRET).update("signed-path").digest();

function signatureOf(path: string, expires: number): string {
  return createHmac("sha256", KEY).update(`${path}\n${expires}`).digest("hex");
}

/** O caminho com `?expires=<segundos unix>&signature=<hex>`, válido por `ttlSeconds`. */
export function signPath(path: string, ttlSeconds: number): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${path}?expires=${expires}&signature=${signatureOf(path, expires)}`;
}

/**
 * `true` quando a assinatura é a deste caminho e o prazo não venceu.
 *
 * Recebe `unknown` porque os dois valores vêm da query string, que pode trazer qualquer coisa —
 * inclusive nada, ou o mesmo parâmetro repetido.
 */
export function verifyPath(path: string, expires: unknown, signature: unknown): boolean {
  if (typeof expires !== "string" || typeof signature !== "string") {
    return false;
  }
  if (!/^\d{1,12}$/.test(expires)) {
    return false;
  }

  const expiresAt = Number(expires);
  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = Buffer.from(signatureOf(path, expiresAt), "hex");
  // Só hexadecimal do tamanho certo chega à comparação: `timingSafeEqual` lança com tamanhos
  // diferentes, e `Buffer.from(…, "hex")` trunca calado no primeiro caractere inválido.
  if (!/^[0-9a-f]+$/.test(signature) || signature.length !== expected.length * 2) {
    return false;
  }

  // Tempo constante: comparar com `===` vazaria, pelo tempo de resposta, quantos caracteres do
  // começo da assinatura estavam certos.
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
