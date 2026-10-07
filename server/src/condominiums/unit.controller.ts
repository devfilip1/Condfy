import type { FastifyPluginAsync } from "fastify";

import { UnitError, listUnits } from "./unit.service.ts";

/**
 * Controller de unidades: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê parâmetros, chama o service e escolhe o status code. A regra
 * fica no service (constituição, seção Backend). Registrado em `server.ts` com o prefixo
 * `/condominiums`, dentro do escopo que exige sessão.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_ONLY_ADMIN =
  "Only the condominium administrator can list its units.";

const unitController: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/units",
    async (request, reply) => {
      // Quem está pedindo vem do token, nunca do caminho nem do body.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listUnits(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        if (error instanceof UnitError) {
          // Quem pertence ao condomínio e não é administrador ouve que não pode; quem é de fora
          // recebe o mesmo 404 de um condomínio que não existe (ADR 0010).
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_ONLY_ADMIN })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );
};

export default unitController;
