import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { ACCESS_TOKEN_TTL_SECONDS } from "../lib/config.ts";
import { authenticate } from "./authenticate.ts";
import { validateSignIn, validateSignUp } from "./auth.dto.ts";
import {
  AuthError,
  SignUpError,
  getProfile,
  refresh,
  signIn,
  signOut,
  signUp,
  type SignAccessToken,
} from "./auth.service.ts";

/**
 * Controller de conta e sessão: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê o body, valida, chama o service e escolhe o status code.
 * A regra fica no service (constituição, seção Backend). Registrado sem prefixo em `server.ts`,
 * porque declara `/accounts` e `/sessions` por extenso.
 */

const MESSAGE_BAD_CREDENTIALS = "E-mail or password is incorrect.";
const MESSAGE_LOCKED_OUT = "Too many attempts. Try again in a few minutes.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

/**
 * Traduz a falha do service em resposta HTTP.
 *
 * `credentials` e `session` nunca detalham o reason: a mesma resposta para e-mail inexistente e
 * password errada é o que impede descobrir quais contas existem (FR-003).
 */
function replyWithFailure(error: AuthError, reply: FastifyReply): FastifyReply {
  if (error.reason === "bloqueado") {
    if (error.retryAfterSeconds !== undefined) {
      reply.header("Retry-After", String(error.retryAfterSeconds));
    }
    return reply.code(429).send({ message: MESSAGE_LOCKED_OUT });
  }
  if (error.reason === "session") {
    return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
  }
  return reply.code(401).send({ message: MESSAGE_BAD_CREDENTIALS });
}

function refreshTokenFromBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const value = (body as Record<string, unknown>).refreshToken;
  return typeof value === "string" && value.length > 0 ? value : null;
}

const authController: FastifyPluginAsync = async (app) => {
  /** O service não conhece o Fastify: recebe daqui a função que assina o accessToken. */
  const signAccessToken: SignAccessToken = (userId) =>
    app.jwt.sign({ sub: userId }, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });

  app.post("/accounts", async (request, reply) => {
    const result = validateSignUp(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    try {
      return reply
        .code(201)
        .send(await signUp(result.data, request.ip, signAccessToken));
    } catch (error) {
      if (error instanceof SignUpError) {
        return reply.code(400).send({ errors: error.errors });
      }
      if (error instanceof AuthError) {
        return replyWithFailure(error, reply);
      }
      throw error;
    }
  });

  app.post("/sessions", async (request, reply) => {
    const data = validateSignIn(request.body);
    if (!data) {
      // Campo em branco recebe a mesma recusa de password errada, pelo mesmo reason do FR-003.
      return reply.code(401).send({ message: MESSAGE_BAD_CREDENTIALS });
    }

    try {
      return reply.send(
        await signIn(data.email, data.password, request.ip, signAccessToken)
      );
    } catch (error) {
      if (error instanceof AuthError) {
        return replyWithFailure(error, reply);
      }
      throw error;
    }
  });

  app.delete("/sessions", async (request, reply) => {
    const refreshToken = refreshTokenFromBody(request.body);
    if (refreshToken) {
      await signOut(refreshToken);
    }
    // Sempre 204: signOut de uma sessão que já não existe é o mesmo result (FR-017).
    return reply.code(204).send();
  });

  /**
   * Quem está autenticado, e onde pertence.
   *
   * O `preHandler` está na rota, e não num escopo em `server.ts` como acontece com `/visitors`,
   * porque as outras três rotas deste controller são públicas: um escopo cobriria todas.
   */
  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const userId = request.authUser?.id;
    if (!userId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    try {
      return reply.send(await getProfile(userId));
    } catch (error) {
      if (error instanceof AuthError) {
        return replyWithFailure(error, reply);
      }
      throw error;
    }
  });

  app.post("/sessions/refresh", async (request, reply) => {
    const refreshToken = refreshTokenFromBody(request.body);
    if (!refreshToken) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    try {
      return reply.send(await refresh(refreshToken, signAccessToken));
    } catch (error) {
      if (error instanceof AuthError) {
        return replyWithFailure(error, reply);
      }
      throw error;
    }
  });
};

export default authController;
