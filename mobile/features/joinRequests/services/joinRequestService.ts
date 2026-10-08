import { HttpError, request } from "@/features/auth";
import {
  JoinRequest,
  isJoinRequestList,
} from "@/features/joinRequests/domain/joinRequest";

/**
 * Acesso aos pedidos de entrada de um condomínio: única camada da feature que faz I/O.
 *
 * As três rotas são de quem cuida do condomínio, e quem decide isso é o servidor. O JSON entra como
 * `unknown` e só sai depois do narrowing; a ordem — do pedido mais antigo para o mais novo — já vem
 * do servidor.
 *
 * Aprovar e rejeitar respondem `404` quando o pedido não existe mais: outra pessoa respondeu, ou
 * quem pediu desistiu. Sobe como `HttpError("server")`; o hook é quem sabe que isso não é falha.
 */

function path(condominiumId: string, requestId?: string): string {
  const base = `/condominiums/${encodeURIComponent(condominiumId)}/join-requests`;
  return requestId === undefined
    ? base
    : `${base}/${encodeURIComponent(requestId)}`;
}

export async function fetchJoinRequests(
  condominiumId: string
): Promise<JoinRequest[]> {
  const response = await request(path(condominiumId));
  if (!isJoinRequestList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** A pessoa vira moradora daquele condomínio, na unidade que pediu. */
export async function approveJoinRequest(
  condominiumId: string,
  requestId: string
): Promise<void> {
  await request(`${path(condominiumId, requestId)}/approval`, { method: "POST" });
}

/** O pedido é removido — e a conta que foi criada para fazê-lo. */
export async function rejectJoinRequest(
  condominiumId: string,
  requestId: string
): Promise<void> {
  await request(path(condominiumId, requestId), { method: "DELETE" });
}
