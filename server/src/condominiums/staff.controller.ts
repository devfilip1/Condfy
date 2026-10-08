import type { FastifyPluginAsync, FastifyReply } from "fastify";

import { AuthError } from "../auth/auth.service.ts";
import {
  MESSAGE_ADMIN_TAKEN,
  MESSAGE_EMAIL_TAKEN,
  validateNewStaffMember,
  validateProvisionalPassword,
  validateRoleChange,
} from "./staff.dto.ts";
import {
  StaffError,
  addStaffMember,
  changeStaffRole,
  listStaff,
  removeStaffMember,
  setProvisionalPassword,
} from "./staff.service.ts";

/**
 * Controller de cargos: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê parâmetros e body, valida, chama o service e escolhe o
 * status code. A regra — inclusive "só o síndico" — fica no service (constituição, seção Backend).
 * Registrado em `server.ts` com o prefixo `/condominiums`, dentro do escopo que exige sessão.
 *
 * Em todas as rotas, quem pede vem do token e o condomínio vem do caminho; nada disso é lido do
 * body. Nenhuma resposta traz password, em forma nenhuma.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_UNKNOWN_PERSON = "Person not found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_ONLY_MANAGER = "Only the condominium manager can manage roles.";
const MESSAGE_NOT_PROVISIONAL = "This person already chose their own password.";
const MESSAGE_LOCKED_OUT = "Too many attempts. Try again in a few minutes.";

/** Traduz a recusa do service. Qualquer outro erro sobe, e vira `500` no handler geral. */
function replyWithFailure(error: unknown, reply: FastifyReply): FastifyReply {
  // O limite contra varredura de e-mails é o do cadastro, e responde como ele.
  if (error instanceof AuthError && error.reason === "bloqueado") {
    if (error.retryAfterSeconds !== undefined) {
      reply.header("Retry-After", String(error.retryAfterSeconds));
    }
    return reply.code(429).send({ message: MESSAGE_LOCKED_OUT });
  }
  if (!(error instanceof StaffError)) {
    throw error;
  }

  switch (error.reason) {
    case "notFound":
      return reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
    case "forbidden":
      return reply.code(403).send({ message: MESSAGE_ONLY_MANAGER });
    // As duas são erro do CAMPO, não conflito: o síndico corrige mudando o que digitou.
    case "emailTaken":
      return reply.code(400).send({ errors: { email: MESSAGE_EMAIL_TAKEN } });
    case "adminTaken":
      return reply.code(400).send({ errors: { role: MESSAGE_ADMIN_TAKEN } });
    case "personNotFound":
      return reply.code(404).send({ message: MESSAGE_UNKNOWN_PERSON });
    case "notProvisional":
      return reply.code(409).send({ message: MESSAGE_NOT_PROVISIONAL });
  }
}

const staffController: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/staff",
    async (request, reply) => {
      // O `authenticate` do escopo já garantiu; a checagem é para o compilador.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listStaff(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );

  // Cria a conta e o cargo, juntos. NÃO abre sessão para a conta nova e não devolve credenciais.
  app.post<{ Params: { condominiumId: string } }>(
    "/:condominiumId/staff",
    async (request, reply) => {
      const result = validateNewStaffMember(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply
          .code(201)
          .send(
            await addStaffMember(
              request.params.condominiumId,
              requesterId,
              result.data,
              request.ip
            )
          );
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );

  // `PATCH` porque muda um campo só, e o body não tem como mudar outro: o DTO lê `role` e ignora
  // o resto.
  app.patch<{ Params: { condominiumId: string; userId: string } }>(
    "/:condominiumId/staff/:userId",
    async (request, reply) => {
      const result = validateRoleChange(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await changeStaffRole(
            request.params.condominiumId,
            requesterId,
            request.params.userId,
            result.data.role
          )
        );
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );

  app.delete<{ Params: { condominiumId: string; userId: string } }>(
    "/:condominiumId/staff/:userId",
    async (request, reply) => {
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await removeStaffMember(
          request.params.condominiumId,
          requesterId,
          request.params.userId
        );
        return reply.code(204).send();
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );

  // `PUT` porque substitui uma coisa inteira. A password vai no BODY, nunca na URL, que vai para o
  // log.
  app.put<{ Params: { condominiumId: string; userId: string } }>(
    "/:condominiumId/staff/:userId/password",
    async (request, reply) => {
      const result = validateProvisionalPassword(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await setProvisionalPassword(
          request.params.condominiumId,
          requesterId,
          request.params.userId,
          result.data.password
        );
        return reply.code(204).send();
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );
};

export default staffController;
