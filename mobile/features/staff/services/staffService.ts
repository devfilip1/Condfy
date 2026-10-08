import { HttpError, request } from "@/features/auth";
import {
  StaffMember,
  StaffRole,
  isStaffList,
  isStaffMember,
} from "@/features/staff/domain/staff";

/**
 * Acesso aos cargos de um condomínio: única camada da feature que faz I/O.
 *
 * A fonte da verdade é o servidor; este módulo não guarda state. O JSON entra como `unknown` e só
 * é devolvido depois do narrowing pelos guards do domínio. Não valida, não ordena e não gera texto
 * de interface — a ordem já vem do servidor: o administrador primeiro, depois os porteiros.
 *
 * Todas as rotas são só do síndico, e quem decide isso é o servidor. Um `403` sobe como
 * `HttpError("server")`: as telas não são oferecidas a quem não pode.
 */

function path(condominiumId: string, userId?: string): string {
  const base = `/condominiums/${encodeURIComponent(condominiumId)}/staff`;
  return userId === undefined ? base : `${base}/${encodeURIComponent(userId)}`;
}

export async function fetchStaff(condominiumId: string): Promise<StaffMember[]> {
  const response = await request(path(condominiumId));
  if (!isStaffList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Cria a conta da pessoa e o cargo dela, juntos. A password provisória só viaja aqui, e não volta
 * em resposta nenhuma.
 */
export async function addStaffMember(
  condominiumId: string,
  input: { name: string; email: string; password: string; role: StaffRole }
): Promise<StaffMember> {
  const response = await request(path(condominiumId), {
    method: "POST",
    body: input,
  });
  if (!isStaffMember(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

export async function changeStaffRole(
  condominiumId: string,
  userId: string,
  role: StaffRole
): Promise<StaffMember> {
  const response = await request(path(condominiumId, userId), {
    method: "PATCH",
    body: { role },
  });
  if (!isStaffMember(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Tira a pessoa do condomínio. O servidor apaga junto a conta que o síndico criou para ela. */
export async function removeStaffMember(
  condominiumId: string,
  userId: string
): Promise<void> {
  await request(path(condominiumId, userId), { method: "DELETE" });
}

/** Define outra password provisória. O servidor recusa se a pessoa já escolheu a dela. */
export async function setProvisionalPassword(
  condominiumId: string,
  userId: string,
  password: string
): Promise<void> {
  await request(`${path(condominiumId, userId)}/password`, {
    method: "PUT",
    body: { password },
  });
}
