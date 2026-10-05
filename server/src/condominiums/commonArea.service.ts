import { prisma } from "../lib/prisma.ts";

/**
 * Regras e acesso a dados das áreas comuns de um condomínio.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * Contrato e banco usam o mesmo vocabulário em inglês, então não há tradução de nomes — só a
 * conversão do `DECIMAL`, que o banco guarda como número exato e o contrato entrega como texto.
 */

/** Área comum no formato do contrato JSON. */
export interface CommonArea {
  id: string;
  name: string;
  /**
   * Dinheiro como TEXTO, com duas casas: `"0.00"`, `"150.00"`.
   * Um `number` de JavaScript não representa todo decimal com exatidão, e isto é dinheiro
   * (research R-002). Quem exibe formata; o contrato só garante exatidão.
   */
  usageFee: string;
  imageUrl: string | null;
}

/** Motivo da recusa que o controller traduz em status code. */
export type CommonAreaFailure = "condominium";

export class CommonAreaError extends Error {
  reason: CommonAreaFailure;

  constructor(reason: CommonAreaFailure) {
    super(`Área comum recusada (${reason})`);
    this.name = "CommonAreaError";
    this.reason = reason;
  }
}

/**
 * Catálogo de um condomínio, para quem tem vínculo nele.
 *
 * Condomínio inexistente e condomínio alheio levantam o MESMO erro: responder de formas diferentes
 * permitiria descobrir quais condomínios o sistema atende (mesmo motivo do FR-003 na autenticação
 * e da recusa de `unitId` no ADR 0009).
 *
 * `isAvailable: false` some do catálogo sem o registro ser apagado (FR-007a), e `condominiumId` não
 * volta em cada item: todo item pertence ao condomínio que já está no caminho da rota.
 */
export async function listCommonAreas(
  condominiumId: string,
  requesterId: string
): Promise<CommonArea[]> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { userId: true },
  });

  if (!membership) {
    throw new CommonAreaError("condominium");
  }

  const rows = await prisma.commonArea.findMany({
    where: { condominiumId: condominiumId, isAvailable: true },
    select: { id: true, name: true, usageFee: true, imageUrl: true },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    // `toFixed(2)` fixa as duas casas sem passar por float em momento nenhum.
    usageFee: row.usageFee.toFixed(2),
    imageUrl: row.imageUrl,
  }));
}
