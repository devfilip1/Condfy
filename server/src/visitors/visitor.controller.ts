import type { FastifyPluginAsync } from "fastify";

import { validateNewVisitor } from "./visitor.dto.ts";
import {
  VisitorError,
  createVisitor,
  listVisitors,
  removeVisitor,
} from "./visitor.service.ts";

/**
 * Controller de visitors: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê body e parâmetros, valida a entrada, chama o service e
 * escolhe o status code. A regra de negócio fica no service (constituição, seção Backend).
 * Registrado em `server.ts` com o prefixo `/visitors`, dentro do escopo que exige sessão.
 */

/** Mesma recusa para unidade inexistente e para unidade de condomínio alheio. */
const MESSAGE_UNKNOWN_UNIT = "Select a unit.";

const MESSAGE_DOORMAN_CANNOT_REGISTER = "A doorman cannot register visitors.";

const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

const visitorController: FastifyPluginAsync = async (app) => {
  // De quem são as visitas vem do token: o que cada cargo alcança é decidido no service.
  app.get("/", async (request, reply) => {
    const requesterId = request.authUser?.id;
    if (!requesterId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }
    return listVisitors(requesterId);
  });

  app.post("/", async (request, reply) => {
    const result = validateNewVisitor(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    // Quem autorizou vem do token, nunca do body (FR-022). O `authenticate` do escopo já garantiu
    // que `authUser` existe; a checagem é só para o compilador.
    const authorizedById = request.authUser?.id;
    if (!authorizedById) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    try {
      return reply
        .code(201)
        .send(await createVisitor(result.data, authorizedById));
    } catch (error) {
      if (error instanceof VisitorError) {
        // O porteiro pertence ao condomínio: ouve que não pode, em vez de um erro de campo.
        if (error.reason === "forbidden") {
          return reply.code(403).send({ message: MESSAGE_DOORMAN_CANNOT_REGISTER });
        }
        return reply.code(400).send({ errors: { unitId: MESSAGE_UNKNOWN_UNIT } });
      }
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const requesterId = request.authUser?.id;
    if (!requesterId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    // 204 também para a visita que esta pessoa não alcança: nada é apagado, e a resposta não
    // revela que ela existe.
    await removeVisitor(request.params.id, requesterId);
    return reply.code(204).send();
  });
};

export default visitorController;
