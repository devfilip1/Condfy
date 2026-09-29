import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Proteção de senha com scrypt (research R-006).
 *
 * scrypt vem no próprio Node; argon2, a primeira escolha da OWASP, exigiria uma dependência com
 * binário nativo. Os parâmetros seguem a recomendação da OWASP para scrypt.
 *
 * O valor guardado descreve os próprios parâmetros (`scrypt$N$r$p$salt$hash`), então dá para
 * endurecê-los depois sem invalidar as senhas já guardadas.
 */

const LOG_N = 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// N = 2^17 com r = 8 usa 128 MiB; o padrão do Node (32 MiB) recusaria.
const MAX_MEM = 256 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer, logN: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: 2 ** logN, r, p, maxmem: MAX_MEM }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Gera o valor a ser guardado no lugar da senha. Cada chamada usa um sal novo. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, LOG_N, R, P);
  return `scrypt$${LOG_N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Confere uma senha digitada contra o valor guardado. Formato inválido nunca confere. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, logN, r, p, saltBase64, keyBase64] = parts;
  const params = [Number(logN), Number(r), Number(p)];
  if (!params.every((value) => Number.isInteger(value) && value > 0)) return false;

  const expected = Buffer.from(keyBase64, "base64url");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, Buffer.from(saltBase64, "base64url"), params[0], params[1], params[2]);
  return timingSafeEqual(actual, expected);
}
