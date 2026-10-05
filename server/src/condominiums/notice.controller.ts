import type { FastifyPluginAsync } from "fastify";

import { validateNewNotice } from "./notice.dto.ts";
import { NoticeError, listNotices, publishNotice } from "./notice.service.ts";

/**
 * Controller de avisos: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. A regra de quem pode publicar fica no service; aqui ela só vira
 * status code. Registrado em `server.ts` com o prefixo `/condominiums`, dentro do escopo que exige
 * sessão.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_FORBIDDEN =
  "Only the condominium administrator can publish notices.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

const noticeController: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/notices",
    async (request, reply) => {
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listNotices(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        if (error instanceof NoticeError) {
          return reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );

  app.post<{ Params: { condominiumId: string } }>(
    "/:condominiumId/notices",
    async (request, reply) => {
      const result = validateNewNotice(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      // Quem publica vem do token, nunca do body (FR-022).
      const publisherId = request.authUser?.id;
      if (!publisherId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply
          .code(201)
          .send(
            await publishNotice(
              request.params.condominiumId,
              publisherId,
              result.data
            )
          );
      } catch (error) {
        if (error instanceof NoticeError) {
          // As duas recusas são diferentes de propósito: quem não é membro não descobre que o
          // condomínio existe; quem é membro e não pode publicar ouve que não pode (research R-002).
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_FORBIDDEN })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );
};

export default noticeController;
