import type { FastifyPluginAsync } from "fastify";

import { verifyPath } from "../lib/signedPath.ts";
import {
  CONDOMINIUM_PHOTO_TTL_SECONDS,
  photoPathOf,
  readCondominiumPhoto,
} from "./condominium.service.ts";

/**
 * A rota da foto enviada de um condomínio.
 *
 * **Registrada FORA do escopo que exige sessão, de propósito** — pelo mesmo motivo da foto de um
 * achado. Uma imagem na web é uma tag `<img>`, e uma tag `<img>` não envia `Authorization`: atrás
 * do token esta rota funcionaria no celular e falharia calada no navegador. A permissão aqui é a
 * ASSINATURA na query string, que só é entregue dentro de um vínculo do perfil — e o perfil só traz
 * os condomínios de quem pediu (ADR 0012).
 *
 * Não registre esta rota junto das outras "para ficar protegida": ela já está, por outro meio.
 */

const MESSAGE_UNKNOWN_PHOTO = "Photo not found.";

const condominiumPhotoController: FastifyPluginAsync = async (app) => {
  app.get<{
    Params: { condominiumId: string };
    Querystring: { expires?: unknown; signature?: unknown };
  }>("/:condominiumId/photo", async (request, reply) => {
    const { condominiumId } = request.params;

    // O caminho é remontado a partir do parâmetro, e é ele que a assinatura cobre: a assinatura de
    // um condomínio não abre a foto de outro.
    const signed = verifyPath(
      photoPathOf(condominiumId),
      request.query.expires,
      request.query.signature
    );

    // Assinatura errada, vencida ou ausente e foto inexistente recebem a MESMA resposta: quem não
    // tem um caminho válido não descobre nem se o condomínio existe.
    const photo = signed ? await readCondominiumPhoto(condominiumId) : null;
    if (!photo) {
      return reply.code(404).send({ message: MESSAGE_UNKNOWN_PHOTO });
    }

    return (
      reply
        // O tipo gravado é o que o servidor detectou nos bytes, nunca o que quem enviou disse.
        .header("Content-Type", photo.contentType)
        // Sem isto um navegador pode decidir, olhando o conteúdo, que aquilo é outra coisa.
        .header("X-Content-Type-Options", "nosniff")
        // `private`: a foto é de quem recebeu o caminho, não de um cache compartilhado no meio.
        .header("Cache-Control", `private, max-age=${CONDOMINIUM_PHOTO_TTL_SECONDS}`)
        .send(Buffer.from(photo.bytes))
    );
  });
};

export default condominiumPhotoController;
