import type { FastifyPluginAsync } from "fastify";

import { verifyPath } from "../lib/signedPath.ts";
import {
  COMMON_AREA_PHOTO_TTL_SECONDS,
  commonAreaPhotoPathOf,
  readCommonAreaPhoto,
} from "./commonArea.service.ts";

/**
 * A rota da foto enviada de um local de reserva.
 *
 * **Registrada FORA do escopo que exige sessão, de propósito** — como a foto de um achado e a de um
 * condomínio. Uma imagem na web é uma tag `<img>`, que não envia `Authorization`: atrás do token
 * esta rota funcionaria no celular e falharia calada no navegador. A permissão aqui é a ASSINATURA
 * na query string, que só é entregue dentro do catálogo — e o catálogo só responde a um membro
 * (ADR 0012).
 *
 * Não registre esta rota junto das outras "para ficar protegida": ela já está, por outro meio.
 */

const MESSAGE_UNKNOWN_PHOTO = "Photo not found.";

const commonAreaPhotoController: FastifyPluginAsync = async (app) => {
  app.get<{
    Params: { condominiumId: string; commonAreaId: string };
    Querystring: { expires?: unknown; signature?: unknown };
  }>("/:condominiumId/common-areas/:commonAreaId/photo", async (request, reply) => {
    const { condominiumId, commonAreaId } = request.params;

    // O caminho é remontado a partir dos parâmetros, e é ele que a assinatura cobre: a assinatura
    // de um local não abre a foto de outro.
    const signed = verifyPath(
      commonAreaPhotoPathOf(condominiumId, commonAreaId),
      request.query.expires,
      request.query.signature
    );

    // Assinatura errada, vencida ou ausente e foto inexistente recebem a MESMA resposta.
    const photo = signed
      ? await readCommonAreaPhoto(condominiumId, commonAreaId)
      : null;
    if (!photo) {
      return reply.code(404).send({ message: MESSAGE_UNKNOWN_PHOTO });
    }

    return (
      reply
        // O tipo gravado é o que o servidor detectou nos bytes, nunca o que quem enviou disse.
        .header("Content-Type", photo.contentType)
        .header("X-Content-Type-Options", "nosniff")
        .header("Cache-Control", `private, max-age=${COMMON_AREA_PHOTO_TTL_SECONDS}`)
        .send(Buffer.from(photo.bytes))
    );
  });
};

export default commonAreaPhotoController;
