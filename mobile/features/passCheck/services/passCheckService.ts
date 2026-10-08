import { HttpError, request } from "@/features/auth";
import { PassCheck, isPassCheck } from "@/features/passCheck/domain/passCheck";

/**
 * Acesso à conferência de comprovante: a única chamada de rede da feature.
 *
 * Só o CÓDIGO viaja — nada do que a câmera viu, e nenhum texto que não seja de um comprovante
 * (quem separa é o hook, antes de chamar aqui).
 *
 * As quatro respostas chegam como `200`. Um `403` (não é porteiro), um `404` (não é deste
 * condomínio) e um corpo fora do contrato sobem como falha: quem chama mostra "não deu para
 * conferir", que não é nenhuma das quatro.
 */
export async function checkPass(
  condominiumId: string,
  code: string
): Promise<PassCheck> {
  const response = await request(
    `/condominiums/${encodeURIComponent(condominiumId)}/pass-checks`,
    { method: "POST", body: { code } }
  );
  if (!isPassCheck(response)) {
    throw new HttpError("server", response);
  }
  return response;
}
