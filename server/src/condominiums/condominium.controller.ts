import type { FastifyPluginAsync } from "fastify";

import { validateNewCondominium } from "./condominium.dto.ts";
import { createCondominium } from "./condominium.service.ts";

/**
 * Controller de condomínios: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê o body, valida, chama o service e escolhe o status code. A
 * regra fica no service (constituição, seção Backend). Registrado em `server.ts` com o prefixo
 * `/condominiums`, dentro do escopo que exige sessão.
 */

const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";

/**
 * Teto do body da criação. O padrão do Fastify é 1 MB, e a foto viaja em base64 dentro do JSON.
 *
 * 8 MB fica ACIMA do que uma foto de 5 MB precisa (uns 6,7 MB codificada), de propósito — o mesmo
 * raciocínio da foto de um achado: assim uma foto um pouco acima do limite chega na validação e é
 * recusada com a mensagem do campo, em vez de morrer no transporte com um `413` sem explicação.
 */
const POST_BODY_LIMIT_BYTES = 8 * 1024 * 1024;

const condominiumController: FastifyPluginAsync = async (app) => {
  // Qualquer conta autenticada cria um condomínio: criar é o que torna a pessoa síndica dele. Não
  // há cargo a conferir antes, porque antes ela não tem vínculo nenhum com o que ainda não existe.
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

    return reply.code(201).send(await createCondominium(result.data, creatorId));
  });
};

export default condominiumController;
