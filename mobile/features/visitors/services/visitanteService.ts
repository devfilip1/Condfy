import {
  NovoVisitante,
  Visitante,
  ehListaDeVisitantes,
  ehVisitante,
} from "@/features/visitors/domain/visitante";
import { ErroHttp, requisitar } from "@/features/visitors/services/http";

/**
 * Acesso aos visitantes: única camada da feature que faz I/O.
 *
 * A fonte da verdade é o servidor; este módulo não guarda estado. O JSON recebido entra como
 * `unknown` e só é devolvido depois do narrowing pelos guards do domínio. O serviço não valida
 * entrada, não ordena e não gera texto de interface.
 */

/** Lista de visitantes, na ordem do servidor (data prevista, depois ordem de criação). */
export async function listarVisitantes(): Promise<Visitante[]> {
  const resposta = await requisitar("/visitantes");
  if (!ehListaDeVisitantes(resposta)) {
    throw new ErroHttp("servidor", resposta);
  }
  return resposta;
}

/** Grava o visitante e devolve o registro salvo, com o `id` gerado pelo servidor (FR-014). */
export async function adicionarVisitante(
  entrada: NovoVisitante
): Promise<Visitante> {
  const resposta = await requisitar("/visitantes", {
    metodo: "POST",
    corpo: entrada,
  });
  if (!ehVisitante(resposta)) {
    throw new ErroHttp("servidor", resposta);
  }
  return resposta;
}

/**
 * Remove o visitante no servidor. Um `id` que já não existe também conta como removido
 * (FR-012): o servidor responde 204 nos dois casos.
 */
export async function removerVisitante(id: string): Promise<void> {
  await requisitar(`/visitantes/${encodeURIComponent(id)}`, {
    metodo: "DELETE",
  });
}
