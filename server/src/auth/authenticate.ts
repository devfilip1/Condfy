import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Exige uma credencial de accessToken válida (FR-019, FR-023).
 *
 * Registrado como `preHandler` nas rotas que precisam de sessão, sem que elas saibam disso. A
 * identidade fica em `request.authUser` e é a ÚNICA fonte de quem está agindo (FR-022): nenhum
 * campo do body pode dizer quem é o usuário.
 */

declare module "fastify" {
  interface FastifyRequest {
    /** Quem está agindo, vindo SEMPRE do token (FR-022). `user` já é do @fastify/jwt. */
    authUser?: { id: string };
  }
}

const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Lê o cabeçalho Authorization, confere assinatura e expiração.
    const payload = await request.jwtVerify<{ sub?: string }>();
    if (!payload.sub) {
      throw new Error("token sem sub");
    }
    request.authUser = { id: payload.sub };
  } catch {
    // Ausente, malformado, assinatura inválida ou expirado: a mesma resposta para todos.
    await reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
  }
}
