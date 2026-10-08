import type { FastifyPluginAsync } from "fastify";

import { validateNewCondominium } from "./condominium.dto.ts";
import { CondominiumError, createCondominium } from "./condominium.service.ts";

/**
 * Controller de condomínios: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê o body, valida, chama o service e escolhe o status code. A
 * regra fica no service (constituição, seção Backend). Registrado em `server.ts` com o prefixo
 * `/condominiums`, dentro do escopo que exige sessão.
 */

const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_PENDING = "Your request to join a condominium is still pending.";
const MESSAGE_ALREADY_BELONGS =
  "You already belong to a condominium, so you cannot create one.";

/**
 * Teto do body da criação. O padrão do Fastify é 1 MB, e a foto viaja em base64 dentro do JSON.
 *
 * 8 MB fica ACIMA do que uma foto de 5 MB precisa (uns 6,7 MB codificada), de propósito — o mesmo
 * raciocínio da foto de um achado: assim uma foto um pouco acima do limite chega na validação e é
 * recusada com a mensagem do campo, em vez de morrer no transporte com um `413` sem explicação.
 */
const POST_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

const condominiumController: FastifyPluginAsync = async (app) => {
  // Cria quem ainda não pertence a condomínio nenhum: criar é o que torna a pessoa síndica, e um
  // síndico tem um só. Quem já tem vínculo — com qualquer cargo — ouve `409`.
  app.post("/", { bodyLimit: POST_BODY_LIMIT_BYTES }, async (request, reply) => {
    const result = validateNewCondominium(request.body);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    // Quem vira síndico vem do token, nunca do body. O `authenticate` do escopo já garantiu que
    // `authUser` existe; a checagem é para o compilador.
    const creatorId = request.authUser?.id;
    if (!creatorId) {
      return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
    }

    try {
      return reply.code(201).send(await createCondominium(result.data, creatorId));
    } catch (error) {
      // `409`, e não `400` nem `403`: os campos estão certos e não há cargo que falte. É o estado da
      // conta que não permite, como ao apagar a conta de quem cuida de um condomínio.
      if (error instanceof CondominiumError) {
        return reply.code(409).send({
          message:
            error.reason === "pending" ? MESSAGE_PENDING : MESSAGE_ALREADY_BELONGS,
        });
      }
      throw error;
    }
  });
};

export default condominiumController;
