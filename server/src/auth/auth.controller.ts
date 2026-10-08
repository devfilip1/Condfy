import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { ACCESS_TOKEN_TTL_SECONDS } from "../lib/config.ts";
import {
  authenticate,
  authenticateAllowingProvisional,
} from "./authenticate.ts";
import { validateSignIn, validateSignUp } from "./auth.dto.ts";
import {
  validateAccountDeletion,
  validateEmailChange,
  validatePasswordChange,
} from "./account.dto.ts";
import {
  AccountError,
  AuthError,
  SignUpError,
  changeEmail,
  changePassword,
  deleteAccount,
  getProfile,
  refresh,
  signIn,
  signOut,
  signUp,
  withdrawJoinRequest,
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

const MESSAGE_WRONG_CURRENT_PASSWORD = "Current password is incorrect.";
const MESSAGE_IS_ADMINISTRATOR =
  "An administrator's account cannot be deleted while they administer a condominium.";
const MESSAGE_NO_REQUEST = "This request no longer exists.";
const MESSAGE_HAS_RECORDS =
  "This account cannot be deleted because a condominium still keeps notices or found items it published.";

/**
 * Traduz a recusa de uma mudança na própria conta.
 *
 * **Password atual errada é `400` no campo, NUNCA `401`.** Neste projeto `401` quer dizer "sua
 * sessão não vale mais": o aplicativo reage renovando a sessão e repetindo o pedido, o que enviaria
 * a password errada uma segunda vez — contando duas vezes para o bloqueio — e ainda poderia ser
 * lido como sessão vencida. A pessoa ESTÁ autenticada; o que falhou foi um campo de um formulário
 * (ADR 0015).
 *
 * O `409` é para o que a conta, no estado em que está, não permite: o pedido estava certo e a
 * pessoa provou ser dona da conta.
 */
function replyWithAccountFailure(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof AuthError) {
    return replyWithFailure(error, reply);
  }
  if (!(error instanceof AccountError)) {
    throw error;
  }

  switch (error.reason) {
    case "currentPassword":
      return reply
        .code(400)
        .send({ errors: { currentPassword: MESSAGE_WRONG_CURRENT_PASSWORD } });
    case "sameEmail":
      return reply
        .code(400)
        .send({ errors: { email: "This is already your e-mail." } });
    // Não diz POR QUE não pode: "já é de outra conta" contaria a quem perguntou quais existem.
    case "emailTaken":
      return reply
        .code(400)
        .send({ errors: { email: "This e-mail cannot be used." } });
    case "samePassword":
      return reply.code(400).send({
        errors: {
          newPassword: "Choose a password different from the current one.",
        },
      });
    case "administrator":
      return reply.code(409).send({ message: MESSAGE_IS_ADMINISTRATOR });
    case "hasRecords":
      return reply.code(409).send({ message: MESSAGE_HAS_RECORDS });
    case "noRequest":
      return reply.code(404).send({ message: MESSAGE_NO_REQUEST });
  }
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
  //
  // `prov` só entra no token da conta de password provisória: o de todas as outras continua sendo
  // exatamente o que era, identidade e mais nada (ADR 0018).
  const signAccessToken: SignAccessToken = (userId, provisional) =>
    app.jwt.sign(
      provisional ? { sub: userId, prov: true } : { sub: userId },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );

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
  //
  // Aceita a conta de password provisória: é por aqui que o aplicativo descobre que precisa pedir
  // a password. Esta e `PATCH /me/password` são as DUAS únicas rotas que aceitam.
  app.get("/me", { preHandler: authenticateAllowingProvisional }, async (request, reply) => {
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

  /* ------------------------------------------------------------------------ */
  /* Mudar a própria conta (feature 010)                                      */
  /* ------------------------------------------------------------------------ */
  //
  // As três rotas abaixo agem sobre a conta de QUEM PEDIU. Nenhuma tem id no caminho nem no body:
  // de quem é a conta vem do token, então não há id para adulterar (FR-022). E as três pedem a
  // password atual de novo, no BODY — nunca na URL, que vai para o log.

  app.patch("/me/email", { preHandler: authenticate }, async (request, reply) => {
    const userId = request.authUser?.id;
    if (!userId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    const result = validateEmailChange(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    try {
      return reply.send(await changeEmail(userId, result.data, request.ip));
    } catch (error) {
      return replyWithAccountFailure(error, reply);
    }
  });

  // Aceita a conta de password provisória: é assim que ela deixa de ser provisória (feature 014).
  // Trocar e-mail e apagar a conta NÃO aceitam.
  app.patch("/me/password", { preHandler: authenticateAllowingProvisional }, async (request, reply) => {
    const userId = request.authUser?.id;
    if (!userId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    const result = validatePasswordChange(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    try {
      // Devolve um par NOVO de credenciais: todas as sessões da conta foram encerradas, e esta é a
      // de quem pediu. O aplicativo precisa guardar este par no lugar do antigo.
      return reply.send(
        await changePassword(userId, result.data, request.ip, signAccessToken)
      );
    } catch (error) {
      return replyWithAccountFailure(error, reply);
    }
  });

  // `DELETE` com body é incomum, e é de propósito: a password não pode viajar na URL.
  app.delete("/me", { preHandler: authenticate }, async (request, reply) => {
    const userId = request.authUser?.id;
    if (!userId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    const result = validateAccountDeletion(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    try {
      await deleteAccount(userId, result.data, request.ip);
      return reply.code(204).send();
    } catch (error) {
      return replyWithAccountFailure(error, reply);
    }
  });

  // A pessoa desiste do próprio pedido de entrada: o pedido e a conta deixam de existir. Sem body
  // e SEM password — exceção ao que as três rotas acima fazem, explicada no service (ADR 0021).
  app.delete("/me/join-request", { preHandler: authenticate }, async (request, reply) => {
    const userId = request.authUser?.id;
    if (!userId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    try {
      await withdrawJoinRequest(userId);
      return reply.code(204).send();
    } catch (error) {
      return replyWithAccountFailure(error, reply);
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
