import type { FastifyPluginAsync } from "fastify";

import {
  MESSAGE_NAME_TAKEN,
  validateAvailabilityChange,
  validateNewCommonArea,
} from "./commonArea.dto.ts";
import {
  CommonAreaError,
  createCommonArea,
  listCommonAreas,
  setCommonAreaAvailability,
} from "./commonArea.service.ts";

/**
 * Controller de áreas comuns: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê parâmetros, chama o service e escolhe o status code. A regra
 * fica no service (constituição, seção Backend). Registrado em `server.ts` com o prefixo
 * `/condominiums`, dentro do escopo que exige sessão.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_UNKNOWN_COMMON_AREA = "Common area not found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_ONLY_ADMIN =
  "Only the condominium administrator can change a place.";
const MESSAGE_ONLY_MANAGER = "Only the condominium manager can create a place.";

/**
 * Teto do body da criação: a foto viaja em base64 dentro do JSON. 8 MB fica ACIMA do que uma foto
 * de 5 MB precisa, de propósito — assim uma foto um pouco acima do limite chega na validação e é
 * recusada com a mensagem do campo, em vez de morrer no transporte com um `413`.
 */
const POST_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

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

  // Cria um local de reserva. Só o síndico; o condomínio vem do caminho e quem cria, do token.
  app.post<{ Params: { condominiumId: string } }>(
    "/:condominiumId/common-areas",
    { bodyLimit: POST_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const result = validateNewCommonArea(request.body);
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
            await createCommonArea(
              request.params.condominiumId,
              requesterId,
              result.data
            )
          );
      } catch (error) {
        if (error instanceof CommonAreaError) {
          switch (error.reason) {
            // Nome repetido é erro do CAMPO, não conflito: a pessoa corrige digitando outro.
            case "nameTaken":
              return reply
                .code(400)
                .send({ errors: { name: MESSAGE_NAME_TAKEN } });
            case "forbidden":
              return reply.code(403).send({ message: MESSAGE_ONLY_MANAGER });
            default:
              return reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
          }
        }
        throw error;
      }
    }
  );

  // Liga ou desliga um local. `PATCH` porque muda um campo só do recurso, e o body não tem como
  // mudar outro: o DTO lê `isAvailable` e ignora o resto.
  app.patch<{ Params: { condominiumId: string; commonAreaId: string } }>(
    "/:condominiumId/common-areas/:commonAreaId",
    async (request, reply) => {
      const result = validateAvailabilityChange(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await setCommonAreaAvailability(
            request.params.condominiumId,
            request.params.commonAreaId,
            requesterId,
            result.data.isAvailable
          )
        );
      } catch (error) {
        if (error instanceof CommonAreaError) {
          // Quem pertence ao condomínio e não é administrador ouve que não pode; quem é de fora
          // recebe o mesmo 404 de um local que não existe (ADR 0010).
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_ONLY_ADMIN })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_COMMON_AREA });
        }
        throw error;
      }
    }
  );
};

export default commonAreaController;
