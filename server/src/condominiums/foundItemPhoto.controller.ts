import type { FastifyPluginAsync } from "fastify";

import { verifyPath } from "../lib/signedPath.ts";
import { photoPathOf, readFoundItemPhoto } from "./foundItem.service.ts";

/**
 * A rota da foto de um item de achados e perdidos.
 *
 * **Registrada FORA do escopo que exige sessão, de propósito.** Uma imagem na web é uma tag
 * `<img>`, e uma tag `<img>` não envia `Authorization`: atrás do token esta rota funcionaria no
 * celular e falharia calada no navegador. A permissão aqui é a ASSINATURA na query string, que só
 * é entregue dentro da lista — e a lista só responde a um membro (research R-005, ADR 0012).
 *
 * Não registre esta rota junto das outras "para ficar protegida": ela já está, por outro meio.
 */

const MESSAGE_UNKNOWN_PHOTO = "Photo not found.";

/** O mesmo prazo do caminho assinado: depois dele o endereço nem vale mais. */
const CACHE_SECONDS = 60 * 60;

const foundItemPhotoController: FastifyPluginAsync = async (app) => {
  app.get<{
    Params: { condominiumId: string; itemId: string };
    Querystring: { expires?: unknown; signature?: unknown };
  }>("/:condominiumId/found-items/:itemId/photo", async (request, reply) => {
    const { condominiumId, itemId } = request.params;

    // O caminho é remontado a partir dos parâmetros, e é ele que a assinatura cobre: a assinatura
    // de um item não abre a foto de outro.
    const signed = verifyPath(
      photoPathOf(condominiumId, itemId),
      request.query.expires,
      request.query.signature
    );

    // Assinatura errada, vencida ou ausente e foto inexistente recebem a MESMA resposta: quem não
    // tem um caminho válido não descobre nem se o item existe.
    const photo = signed ? await readFoundItemPhoto(condominiumId, itemId) : null;
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
        .header("Cache-Control", `private, max-age=${CACHE_SECONDS}`)
        .send(Buffer.from(photo.bytes))
    );
  });
};

export default foundItemPhotoController;
