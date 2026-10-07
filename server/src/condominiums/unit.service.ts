import { prisma } from "../lib/prisma.ts";
import { managesCondominium } from "../lib/roles.ts";

/**
 * Leitura das unidades de um condomínio.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code (constituição, seção
 * Backend).
 *
 * Existe por um motivo só: o administrador autoriza visitas para QUALQUER unidade, e ele não mora
 * em nenhuma — o perfil dele (`GET /me`) vem com a lista de unidades vazia. O morador não precisa
 * disto: as unidades dele já estão no perfil.
 */

/** Unidade no formato do contrato. O app monta o rótulo (`block` + `number`). */
export interface CondominiumUnit {
  id: string;
  /** `null` quando o condomínio não tem blocos. */
  block: string | null;
  number: string;
}

/**
 * Motivo da recusa que o controller traduz em status code.
 *
 * - `condominium` → 404. Quem pediu não tem vínculo com o condomínio, ou ele não existe.
 * - `forbidden` → 403. Tem vínculo, mas não é o administrador (ADR 0010).
 */
export type UnitFailure = "condominium" | "forbidden";

export class UnitError extends Error {
  reason: UnitFailure;

  constructor(reason: UnitFailure) {
    super(`Unidades recusadas (${reason})`);
    this.name = "UnitError";
    this.reason = reason;
  }
}

/**
 * Todas as unidades do condomínio, por bloco e número. Só o administrador.
 *
 * Um morador recebe 403: a lista de unidades de um prédio não é segredo, mas ele não tem o que
 * fazer com ela — só autoriza visita para onde mora — e uma rota sem uso é uma rota a menos para
 * alguém explorar.
 */
export async function listUnits(
  condominiumId: string,
  requesterId: string
): Promise<CondominiumUnit[]> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new UnitError("condominium");
  }
  if (!managesCondominium(membership.role)) {
    throw new UnitError("forbidden");
  }

  return prisma.unit.findMany({
    where: { condominiumId: condominiumId },
    select: { id: true, block: true, number: true },
    orderBy: [{ block: "asc" }, { number: "asc" }],
  });
}
