import {
  HttpError,
  ProfileMembership,
  isProfileMembership,
  request,
} from "@/features/auth";

/**
 * Criação de um condomínio: única camada da feature que fala com o servidor.
 *
 * Não valida, não ordena e não gera texto de interface. O JSON recebido entra como `unknown` e só é
 * devolvido depois do narrowing pelo guard — o mesmo do perfil, porque a resposta é um vínculo no
 * mesmo formato.
 */

/**
 * O envio pode levar uma foto de alguns megabytes numa rede de celular. Com os 10 segundos padrão,
 * um envio CERTO numa rede lenta seria relatado como "sem conexão".
 */
const POST_TIMEOUT_MS = 60_000;

export interface CondominiumToCreate {
  name: string;
  address: string;
  blocks: { code: string; unitCount: number }[];
  /** Os bytes da foto em base64, sem o prefixo `data:`. Ausente é "sem foto". */
  photo?: string;
}

/**
 * Cria o condomínio e devolve o vínculo de quem criou — já como síndico dele.
 *
 * Quem vira síndico é quem está autenticado: o body não diz, e o servidor não leria se dissesse.
 * Um `400` sobe como `HttpError("validation")` com os errors por field no body.
 */
export async function createCondominium(
  input: CondominiumToCreate
): Promise<ProfileMembership> {
  const response = await request("/condominiums", {
    method: "POST",
    body: input,
    timeoutMs: POST_TIMEOUT_MS,
  });
  if (!isProfileMembership(response)) {
    throw new HttpError("server", response);
  }
  return response;
}
