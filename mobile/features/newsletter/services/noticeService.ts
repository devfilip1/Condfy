import { HttpError, request } from "@/features/auth";
import {
  NewNotice,
  Notice,
  isNotice,
  isNoticeList,
} from "@/features/newsletter/domain/notice";

/**
 * Acesso aos avisos: única camada da feature que faz I/O.
 *
 * A fonte da verdade é o servidor; este módulo não guarda state. O JSON entra como `unknown` e só
 * é devolvido depois do narrowing pelos guards do domínio. Não valida, não ordena e não gera text
 * de interface — a ordem já vem do servidor, do mais recente para o mais antigo.
 */

function path(condominiumId: string): string {
  return `/condominiums/${encodeURIComponent(condominiumId)}/notices`;
}

/** O mural de um condomínio. Cada aviso vem com o corpo COMPLETO (research R-004). */
export async function listNotices(condominiumId: string): Promise<Notice[]> {
  const response = await request(path(condominiumId));
  if (!isNoticeList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Publica um aviso. Só o administrador consegue, e quem decide isso é o servidor.
 *
 * Um `403` sobe como `HttpError("server")`: a tela não oferece a ação a quem não pode, então
 * chegar aqui sem permissão significa que algo está fora do lugar, não que a pessoa errou um campo.
 */
export async function publishNotice(
  condominiumId: string,
  input: NewNotice
): Promise<Notice> {
  const response = await request(path(condominiumId), {
    method: "POST",
    body: input,
  });
  if (!isNotice(response)) {
    throw new HttpError("server", response);
  }
  return response;
}
