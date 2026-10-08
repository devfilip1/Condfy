import type { FastifyPluginAsync } from "fastify";

import { validatePassCheck } from "./passCheck.dto.ts";
import { PassCheckError, checkPass } from "./passCheck.service.ts";

/**
 * Controller da conferência de comprovante: a rota do recurso é declarada aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê o parâmetro e o body, chama o service e escolhe o status
 * code. A regra — inclusive "só o porteiro" — fica no service (constituição, seção Backend).
 * Registrado em `server.ts` com o prefixo `/condominiums`, dentro do escopo que exige sessão.
 *
 * **Toda resposta da conferência é `200`**, seja qual for o resultado: válido, ainda não, vencido
 * e não reconhecido são quatro valores de `outcome`. Os status de erro ficam para "você não pode
 * perguntar" — e é isso que deixa o app distinguir uma resposta de uma falha.
 *
 * **Esta rota nunca responde `400` pelo body.** Um código fora de forma é "não reconhecido".
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_ONLY_DOORMAN = "Only a doorman can check a pass.";

const passCheckController: FastifyPluginAsync = async (app) => {
  // `POST`, e não `GET`: a primeira conferência válida grava a entrada da visita. O condomínio
  // vem do caminho e quem confere, do token; o código vai no BODY, nunca na URL, que vai para o
  // log.
  app.post<{ Params: { condominiumId: string } }>(
    "/:condominiumId/pass-checks",
    async (request, reply) => {
      // O `authenticate` do escopo já garantiu; a checagem é para o compilador.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await checkPass(
            request.params.condominiumId,
            requesterId,
            validatePassCheck(request.body)
          )
        );
      } catch (error) {
        if (error instanceof PassCheckError) {
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_ONLY_DOORMAN })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );
};

export default passCheckController;
