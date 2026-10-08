import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Exige uma credencial de accessToken válida (FR-019, FR-023).
 *
 * Registrado como `preHandler` nas rotas que precisam de sessão, sem que elas saibam disso. A
 * identidade fica em `request.authUser` e é a ÚNICA fonte de quem está agindo (FR-022): nenhum
 * campo do body pode dizer quem é o usuário.
 *
 * **A password provisória (feature 014, ADR 0018).** Uma conta criada pelo síndico tem uma
 * password que outra pessoa conhece, e não pode fazer NADA até o dono escolher a dele. O token
 * dessa conta carrega `prov: true`, e é aqui — o único lugar por onde toda rota protegida passa —
 * que ele é recusado, sem consultar o banco.
 *
 * - A recusa é `403`, **NUNCA `401`**. Um `401` faz o aplicativo renovar a sessão e repetir o
 *   pedido, e o token renovado carrega a mesma marca: seria um laço (a mesma armadilha do ADR
 *   0015).
 * - `authenticateAllowingProvisional` existe para DUAS rotas e nenhuma terceira: `GET /me`, para o
 *   aplicativo saber que precisa pedir a password, e `PATCH /me/password`, que é como a conta
 *   deixa de ser provisória. Cada rota acrescentada a essa lista é algo que uma pessoa passa a
 *   poder fazer com uma password que outra conhece.
 */

declare module "fastify" {
  interface FastifyRequest {
    /** Quem está agindo, vindo SEMPRE do token (FR-022). `user` já é do @fastify/jwt. */
    authUser?: { id: string };
  }
}

const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_PASSWORD_CHANGE_REQUIRED = "Choose a new password to continue.";

/**
 * Confere o token e grava a identidade. Devolve se a conta é provisória, ou `null` quando já
 * respondeu `401`.
 */
async function verify(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ provisional: boolean } | null> {
  try {
    // Lê o cabeçalho Authorization, confere assinatura e expiração.
    const payload = await request.jwtVerify<{ sub?: string; prov?: boolean }>();
    if (!payload.sub) {
      throw new Error("token sem sub");
    }
    request.authUser = { id: payload.sub };
    return { provisional: payload.prov === true };
  } catch {
    // Ausente, malformado, assinatura inválida ou expirado: a mesma resposta para todos.
    await reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    return null;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const result = await verify(request, reply);
  if (result?.provisional) {
    await reply.code(403).send({
      message: MESSAGE_PASSWORD_CHANGE_REQUIRED,
      code: "passwordChangeRequired",
    });
  }
}

/** Como `authenticate`, mas aceita a conta de password provisória. Só para as duas rotas acima. */
export async function authenticateAllowingProvisional(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await verify(request, reply);
}
