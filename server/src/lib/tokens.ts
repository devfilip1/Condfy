import { createHash, randomBytes } from "node:crypto";

/**
 * Credencial de renovação: value opaco e aleatório (research R-003).
 *
 * Não é JWT porque precisa ser invalidável a qualquer momento (FR-009), o que já exige estado no
 * banco. O value entregue ao aplicativo nunca é gravado — só o hash.
 */

const TOKEN_BYTES = 32;

/** Gera o value entregue ao aplicativo. */
export function generateRefreshToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Hash guardado no banco. SHA-256 basta: o value é aleatório de alta entropia, então não existe
 * dicionário para adivinhar — ao contrário de uma password, que usa `scrypt` em `password.ts`.
 */
export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}
