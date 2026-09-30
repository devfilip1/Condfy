/**
 * Configuração lida do ambiente, num lugar só.
 *
 * Falhar aqui é melhor que falhar na primeira requisição: sem secret de assinatura o servidor
 * não sobe, do mesmo jeito que já acontece sem `DATABASE_URL` (lib/prisma.ts).
 */

const secret = process.env.JWT_SECRET;

if (!secret || secret.length < 32) {
  throw new Error(
    "JWT_SECRET não definida em server/.env, ou menor que 32 caracteres. Veja .env.example."
  );
}

export const JWT_SECRET = secret;

/**
 * Validade da credencial de accessToken, em segundos (15 minutos, FR-007).
 * Um único value alimenta a assinatura e o campo `expiresAt` do contrato, para nunca divergirem.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/**
 * Validade da credencial de renovação. Cada rotação emite uma com prazo novo, então quem usa o
 * aplicativo dentro desse intervalo permanece conectado indefinidamente (ADR 0007).
 */
export const REFRESH_TOKEN_TTL_DAYS = 30;

/** Bloqueio de entrada: 5 falhas em 15 minutos bloqueiam por 15 minutos (FR-005). */
export const MAX_SIGNIN_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MINUTES = 15;
export const LOCKOUT_MINUTES = 15;

