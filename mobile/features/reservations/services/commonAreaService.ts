import {
  CommonArea,
  isCommonArea,
  isCommonAreaList,
} from "@/features/reservations/domain/commonArea";
import { HttpError, apiUrl, request } from "@/features/auth";

/**
 * O envio leva uma foto de alguns megabytes. Com os 10 segundos padrão, um envio CERTO numa rede
 * lenta seria relatado como "sem conexão".
 */
const POST_TIMEOUT_MS = 60_000;

/**
 * O endereço da foto de um local, pronto para exibir — ou `null`, e aí quem exibe mostra o
 * placeholder. A foto enviada chega como um caminho relativo e assinado, que precisa do endereço da
 * API na frente; a dos locais de exemplo é um endereço https inteiro.
 *
 * Mora no serviço porque montar o endereço depende de saber onde a API está. Os hooks chamam isto e
 * entregam o resultado aos componentes, que não sabem que existem duas origens.
 */
export function commonAreaPhotoUri(area: {
  imageUrl: string | null;
  photoPath: string | null;
}): string | null {
  return area.photoPath !== null ? apiUrl(area.photoPath) : area.imageUrl;
}

/**
 * Cria um local de reserva. Só o síndico consegue: para os outros o servidor recusa.
 *
 * `usageFee` vai como TEXTO com ponto — `"150.50"` —, porque é dinheiro e um número JSON já seria
 * um float. Um `400` sobe como `HttpError("validation")` com os errors por field no body.
 */
export async function createCommonArea(
  condominiumId: string,
  input: { name: string; usageFee: string; photo: string }
): Promise<CommonArea> {
  const response = await request(
    `/condominiums/${encodeURIComponent(condominiumId)}/common-areas`,
    { method: "POST", body: input, timeoutMs: POST_TIMEOUT_MS }
  );
  if (!isCommonArea(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

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

/**
 * Liga ou desliga um local. Só o administrador consegue: para os outros o servidor recusa.
 *
 * Devolve nada: quem chama recarrega o mês, porque desligar muda o que a tela inteira oferece.
 */
export async function setCommonAreaAvailability(
  condominiumId: string,
  commonAreaId: string,
  isAvailable: boolean
): Promise<void> {
  await request(
    `/condominiums/${encodeURIComponent(condominiumId)}` +
      `/common-areas/${encodeURIComponent(commonAreaId)}`,
    { method: "PATCH", body: { isAvailable: isAvailable } }
  );
}
