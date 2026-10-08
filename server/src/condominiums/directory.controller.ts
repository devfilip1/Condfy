import type { FastifyPluginAsync } from "fastify";

import {
  listDirectoryCondominiums,
  listDirectoryUnits,
} from "./directory.service.ts";

/**
 * Controller do diretório: as duas listas que o cadastro mostra a quem ainda não tem conta.
 *
 * **Registrado FORA do escopo de sessão**, com o prefixo `/directory` — ver `server.ts`. Não há
 * `authUser` aqui e não há vínculo a conferir; o que protege estas rotas é o que o service escolhe
 * NÃO ler. Não acrescente a este controller nada que dependa de quem está pedindo.
 */
const directoryController: FastifyPluginAsync = async (app) => {
  app.get("/condominiums", async () => listDirectoryCondominiums());

  app.get<{ Params: { condominiumId: string } }>(
    "/condominiums/:condominiumId/units",
    async (request) => listDirectoryUnits(request.params.condominiumId)
  );
};

export default directoryController;
