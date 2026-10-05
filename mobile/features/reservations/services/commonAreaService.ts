import {
  CommonArea,
  isCommonAreaList,
} from "@/features/reservations/domain/commonArea";
import { HttpError, request } from "@/features/auth";

/**
 * Acesso às áreas comuns: única camada da feature que faz I/O.
 *
 * A fonte da verdade é o servidor; este módulo não guarda state. O JSON recebido entra como
 * `unknown` e só é devolvido depois do narrowing pelos guards do domínio. Não valida input, não
 * ordena e não gera text de interface — a ordem já vem do servidor, por nome.
 */

/**
 * Catálogo de um condomínio.
 *
 * O condomínio vai no caminho porque uma pessoa pode pertencer a mais de um, e o token não carrega
 * essa informação (RN-AUT-05). Um `404` sobe como `HttpError("server")` e significa a mesma coisa
 * para quem chama: o catálogo não está disponível para este condomínio.
 */
export async function listCommonAreas(
  condominiumId: string
): Promise<CommonArea[]> {
  const response = await request(
    `/condominiums/${encodeURIComponent(condominiumId)}/common-areas`
  );
  if (!isCommonAreaList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}
