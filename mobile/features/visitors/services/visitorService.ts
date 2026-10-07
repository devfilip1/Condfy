import {
  NewVisitor,
  Visitor,
  VisitorUnit,
  isVisitorList,
  isVisitor,
  isVisitorUnitList,
} from "@/features/visitors/domain/visitor";
import { HttpError, request } from "@/features/auth";

/**
 * Acesso aos visitors: única camada da feature que faz I/O.
 *
 * A fonte da verdade é o servidor; este módulo não guarda state. O JSON recebido entra como
 * `unknown` e só é devolvido depois do narrowing pelos guards do domínio. O serviço não valida
 * input, não ordena e não gera text de interface.
 */

/**
 * Todas as unidades de um condomínio, para o seletor do formulário DO ADMINISTRADOR. Ele não mora
 * em unidade nenhuma, então o perfil dele não traz de onde escolher. Para qualquer outra pessoa o
 * servidor responde `403`.
 */
export async function listCondominiumUnits(
  condominiumId: string
): Promise<VisitorUnit[]> {
  const response = await request(
    `/condominiums/${encodeURIComponent(condominiumId)}/units`
  );
  if (!isVisitorUnitList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Lista de visitors, na ordem do servidor (data prevista, depois ordem de criação). Só vêm os que
 * esta pessoa pode ver: todos os do condomínio para o administrador, e só os que ela mesma
 * autorizou para a moradora.
 */
export async function listVisitors(): Promise<Visitor[]> {
  const response = await request("/visitors");
  if (!isVisitorList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Grava o visitor e devolve o registro salvo, com o `id` gerado pelo servidor (FR-014). */
export async function addVisitor(
  input: NewVisitor
): Promise<Visitor> {
  const response = await request("/visitors", {
    method: "POST",
    body: input,
  });
  if (!isVisitor(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Remove o visitor no servidor. Um `id` que já não existe também conta como removido
 * (FR-012): o servidor responde 204 nos dois casos.
 */
export async function removeVisitor(id: string): Promise<void> {
  await request(`/visitors/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
