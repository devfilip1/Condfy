import { HttpError, request } from "@/features/auth";
import {
  FoundItem,
  FoundItemStatus,
  isFoundItem,
  isFoundItemList,
} from "@/features/lostAndFound/domain/foundItem";

/**
 * Acesso aos achados e perdidos: única camada da feature que faz I/O com a API.
 *
 * A fonte da verdade é o servidor; este módulo não guarda state. O JSON recebido entra como
 * `unknown` e só é devolvido depois do narrowing pelos guards do domínio. Não valida input, não
 * ordena e não gera text de interface — a ordem já vem do servidor.
 */

/**
 * O envio leva a foto em base64 dentro do JSON: são megabytes, não kilobytes. Os 10 segundos do
 * cliente HTTP relatariam um envio certo numa rede lenta como "sem conexão" (research R-015).
 */
const POST_TIMEOUT_MS = 60_000;

function path(condominiumId: string): string {
  return `/condominiums/${encodeURIComponent(condominiumId)}/found-items`;
}

/**
 * Tudo o que foi encontrado no condomínio, devolvidos incluídos, mais recente primeiro.
 *
 * O condomínio vai no caminho porque uma pessoa pode pertencer a mais de um. Um `404` sobe como
 * `HttpError("server")`: a prateleira não está disponível para esta pessoa.
 */
export async function listFoundItems(condominiumId: string): Promise<FoundItem[]> {
  const response = await request(path(condominiumId));
  if (!isFoundItemList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Posta um item. `photo` é o base64 puro, sem prefixo `data:` — o tipo da imagem não vai junto,
 * porque o servidor o detecta pelos bytes.
 */
export async function postFoundItem(
  condominiumId: string,
  input: { description: string; place: string; photo: string }
): Promise<FoundItem> {
  const response = await request(path(condominiumId), {
    method: "POST",
    body: input,
    timeoutMs: POST_TIMEOUT_MS,
  });
  if (!isFoundItem(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Troca o status e devolve o item como ficou. Só o status viaja; o resto não tem por onde mudar. */
export async function changeFoundItemStatus(
  condominiumId: string,
  itemId: string,
  status: FoundItemStatus
): Promise<FoundItem> {
  const response = await request(
    `${path(condominiumId)}/${encodeURIComponent(itemId)}`,
    { method: "PATCH", body: { status: status } }
  );
  if (!isFoundItem(response)) {
    throw new HttpError("server", response);
  }
  return response;
}
