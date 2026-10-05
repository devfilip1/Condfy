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

const visitorController: FastifyPluginAsync = async (app) => {
  app.get("/", async () => listVisitors());

  app.post("/", async (request, reply) => {
    const result = validateNewVisitor(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    // Quem autorizou vem do token, nunca do body (FR-022). O `authenticate` do escopo já garantiu
    // que `authUser` existe; a checagem é só para o compilador.
    const authorizedById = request.authUser?.id;
    if (!authorizedById) {
      return reply.code(401).send({ message: "Your session has expired. Sign in again." });
    }

    try {
      return reply
        .code(201)
        .send(await createVisitor(result.data, authorizedById));
    } catch (error) {
      if (error instanceof VisitorError) {
        return reply.code(400).send({ errors: { unitId: MESSAGE_UNKNOWN_UNIT } });
      }
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await removeVisitor(request.params.id);
    return reply.code(204).send();
  });
};

export default visitorController;
