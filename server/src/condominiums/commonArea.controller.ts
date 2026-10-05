import type { FastifyPluginAsync } from "fastify";

import { CommonAreaError, listCommonAreas } from "./commonArea.service.ts";

/**
 * Controller de áreas comuns: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê parâmetros, chama o service e escolhe o status code. A regra
 * fica no service (constituição, seção Backend). Registrado em `server.ts` com o prefixo
 * `/condominiums`, dentro do escopo que exige sessão.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

const commonAreaController: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/common-areas",
    async (request, reply) => {
      // Quem está pedindo vem do token, nunca do caminho nem do body (FR-022 da 004). O
      // `authenticate` do escopo já garantiu; a checagem é para o compilador.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listCommonAreas(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        // Condomínio inexistente e condomínio alheio recebem a MESMA resposta, de propósito.
        if (error instanceof CommonAreaError) {
          return reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );
};

export default commonAreaController;
