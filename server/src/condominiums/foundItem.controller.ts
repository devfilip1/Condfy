import type { FastifyPluginAsync } from "fastify";

import { validateNewFoundItem, validateStatusChange } from "./foundItem.dto.ts";
import {
  FoundItemError,
  changeFoundItemStatus,
  listFoundItems,
  postFoundItem,
} from "./foundItem.service.ts";

/**
 * Controller de achados e perdidos: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. A regra de quem pode postar e trocar o status fica no service;
 * aqui ela só vira status code. Registrado em `server.ts` com o prefixo `/condominiums`, dentro do
 * escopo que exige sessão.
 *
 * A rota da FOTO não está aqui: ela é registrada fora do escopo de sessão, e um plugin não fica
 * metade dentro e metade fora. Veja `foundItemPhoto.controller.ts`.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_UNKNOWN_ITEM = "Found item not found.";
const MESSAGE_CANNOT_POST =
  "Only the condominium administrator can post found items.";
const MESSAGE_CANNOT_CHANGE_STATUS =
  "Only the condominium administrator can change the status of a found item.";
const MESSAGE_NO_ACCESS = "A doorman has no access to lost & found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

/**
 * Teto do body da rota de postar. O padrão do Fastify é 1 MB, e a foto viaja em base64 dentro do
 * JSON (research R-002).
 *
 * 8 MB fica ACIMA do que uma foto de 5 MB precisa (uns 6,7 MB codificada), de propósito: assim uma
 * foto um pouco acima do limite chega na validação e é recusada com a mensagem do campo, em vez de
 * morrer no transporte com um `413` sem explicação.
 */
const POST_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

const foundItemController: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/found-items",
    async (request, reply) => {
      // Quem está pedindo vem do token, nunca do caminho nem do body. O `authenticate` do escopo já
      // garantiu que `authUser` existe; a checagem é para o compilador.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listFoundItems(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        // Condomínio inexistente e condomínio alheio recebem a MESMA resposta, de propósito. Quem
        // pertence ao condomínio e não lê a prateleira — o porteiro — ouve que não pode.
        if (error instanceof FoundItemError) {
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_NO_ACCESS })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );

  app.post<{ Params: { condominiumId: string } }>(
    "/:condominiumId/found-items",
    { bodyLimit: POST_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const result = validateNewFoundItem(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      // Quem posta vem do token, nunca do body (FR-024).
      const postedById = request.authUser?.id;
      if (!postedById) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply
          .code(201)
          .send(
            await postFoundItem(
              request.params.condominiumId,
              postedById,
              result.data
            )
          );
      } catch (error) {
        if (error instanceof FoundItemError) {
          // As duas recusas são diferentes de propósito: quem não é membro não descobre que o
          // condomínio existe; quem é membro e não pode postar ouve que não pode (ADR 0010).
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_CANNOT_POST })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );

  // O primeiro `PATCH` do projeto: atualização parcial de um campo só de um registro que existe.
  app.patch<{ Params: { condominiumId: string; itemId: string } }>(
    "/:condominiumId/found-items/:itemId",
    async (request, reply) => {
      const result = validateStatusChange(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await changeFoundItemStatus(
            request.params.condominiumId,
            request.params.itemId,
            requesterId,
            result.data.status
          )
        );
      } catch (error) {
        if (error instanceof FoundItemError) {
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_CANNOT_CHANGE_STATUS })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_ITEM });
        }
        throw error;
      }
    }
  );
};

export default foundItemController;
