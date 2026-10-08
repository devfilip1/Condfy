import type { FastifyPluginAsync, FastifyReply } from "fastify";

import {
  JoinRequestError,
  approveJoinRequest,
  listJoinRequests,
  rejectJoinRequest,
} from "./joinRequest.service.ts";

/**
 * Controller dos pedidos de entrada: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê os parâmetros, chama o service e escolhe o status code. A
 * regra — inclusive "só quem cuida do condomínio" — fica no service (constituição, seção Backend).
 * Registrado em `server.ts` com o prefixo `/condominiums`, dentro do escopo que exige sessão.
 *
 * Quem responde vem do token e o condomínio vem do caminho; nenhuma das rotas lê body.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_UNKNOWN_REQUEST = "This request no longer exists.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_ONLY_IN_CHARGE =
  "Only whoever runs the condominium can answer requests.";

function replyWithFailure(error: unknown, reply: FastifyReply): FastifyReply {
  if (!(error instanceof JoinRequestError)) {
    throw error;
  }
  switch (error.reason) {
    case "notFound":
      return reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
    case "forbidden":
      return reply.code(403).send({ message: MESSAGE_ONLY_IN_CHARGE });
    case "requestNotFound":
      return reply.code(404).send({ message: MESSAGE_UNKNOWN_REQUEST });
  }
}

const joinRequestController: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/join-requests",
    async (request, reply) => {
      // O `authenticate` do escopo já garantiu; a checagem é para o compilador.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listJoinRequests(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );

  // Aprovar é criar uma coisa — a aprovação —, e por isso é `POST` num sub-recurso do pedido.
  app.post<{ Params: { condominiumId: string; requestId: string } }>(
    "/:condominiumId/join-requests/:requestId/approval",
    async (request, reply) => {
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await approveJoinRequest(
          request.params.condominiumId,
          requesterId,
          request.params.requestId
        );
        return reply.code(204).send();
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );

  // Rejeitar apaga o pedido — e a conta que foi criada para fazê-lo.
  app.delete<{ Params: { condominiumId: string; requestId: string } }>(
    "/:condominiumId/join-requests/:requestId",
    async (request, reply) => {
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await rejectJoinRequest(
          request.params.condominiumId,
          requesterId,
          request.params.requestId
        );
        return reply.code(204).send();
      } catch (error) {
        return replyWithFailure(error, reply);
      }
    }
  );
};

export default joinRequestController;
