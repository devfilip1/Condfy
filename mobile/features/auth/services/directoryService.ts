import {
  DirectoryCondominium,
  DirectoryUnit,
  isDirectoryCondominiumList,
  isDirectoryUnitList,
} from "@/features/auth/domain/directory";
import { HttpError, request } from "@/features/auth/services/http";

/**
 * Acesso ao diretório: as duas listas que o cadastro mostra a quem ainda não tem conta.
 *
 * As rotas são PÚBLICAS, e por isso os pedidos vão com `skipAuth`: não há credencial a anexar nem
 * sessão a renovar. O JSON entra como `unknown` e só sai depois do narrowing pelos guards do
 * domínio. Não ordena e não agrupa — isso é do domínio.
 */

export async function fetchDirectoryCondominiums(): Promise<DirectoryCondominium[]> {
  const response = await request("/directory/condominiums", { skipAuth: true });
  if (!isDirectoryCondominiumList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Todas as unidades de um condomínio, de uma vez. Quem agrupa por bloco é o domínio. */
export async function fetchDirectoryUnits(
  condominiumId: string
): Promise<DirectoryUnit[]> {
  const response = await request(
    `/directory/condominiums/${encodeURIComponent(condominiumId)}/units`,
    { skipAuth: true }
  );
  if (!isDirectoryUnitList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}
