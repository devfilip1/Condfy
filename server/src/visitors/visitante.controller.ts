import type { FastifyPluginAsync } from "fastify";

import { validarNovoVisitante } from "./visitante.dto.ts";
import {
  criarVisitante,
  listarVisitantes,
  removerVisitante,
} from "./visitante.service.ts";

/**
 * Controller de visitantes: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê body e parâmetros, valida a entrada, chama o service e
 * escolhe o status code. A regra de negócio fica no service (constituição, seção Backend).
 * Registrado em `server.ts` com o prefixo `/visitantes`.
 */
const visitanteController: FastifyPluginAsync = async (app) => {
  app.get("/", async () => listarVisitantes());

  app.post("/", async (request, reply) => {
    const resultado = validarNovoVisitante(request.body);
    if (!resultado.ok) {
      return reply.code(400).send({ erros: resultado.erros });
    }
    return reply.code(201).send(await criarVisitante(resultado.dados));
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await removerVisitante(request.params.id);
    return reply.code(204).send();
  });
};

export default visitanteController;
