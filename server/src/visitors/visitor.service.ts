import type { Visitor as VisitorRow } from "../../generated/prisma/client.ts";
import type { VisitType } from "../../generated/prisma/enums.ts";
import { prisma } from "../lib/prisma.ts";
import type { NewVisitor } from "./visitor.dto.ts";

/**
 * Regras e acesso a dados de visitantes.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * Contrato e banco usam o mesmo vocabulário em inglês, então não há tradução de nomes aqui — só
 * a conversão da data, que o banco guarda como `DATE` e o contrato entrega como texto.
 */

/** Visitor no formato do contrato JSON: os mesmos campos e nomes do app. */
export interface Visitor {
  id: string;
  name: string;
  type: VisitType;
  /** Dia de calendário `YYYY-MM-DD`, sem horário e sem fuso. */
  expectedDate: string;
  authorizedBy: string;
}

/**
 * Converte a row do banco para o contrato.
 *
 * A coluna `expected_date` é `DATE`, que o Prisma entrega como `Date` à meia-noite UTC. Ler a data
 * em UTC devolve sempre o dia gravado, sem deslocamento de fuso (research R-007).
 * `createdAt` e `updatedAt` ficam fora do contrato.
 */
export function toVisitor(row: VisitorRow): Visitor {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    expectedDate: row.expectedDate.toISOString().slice(0, 10),
    authorizedBy: row.authorizedBy,
  };
}

/**
 * Todos os visitors, da data prevista mais próxima para a mais distante (FR-016).
 * No empate, vale a ordem de criação, e por fim o `id`, para a ordem ser sempre estável.
 */
export async function listVisitors(): Promise<Visitor[]> {
  const rows = await prisma.visitor.findMany({
    orderBy: [{ expectedDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map(toVisitor);
}

/**
 * Grava um visitor já validado e devolve o registro com o `id` gerado pelo banco.
 * A data entra como meia-noite UTC para a coluna `DATE` guardar exatamente o dia informado
 * (research R-007).
 */
export async function createVisitor(data: NewVisitor): Promise<Visitor> {
  const row = await prisma.visitor.create({
    data: {
      name: data.name,
      type: data.type,
      expectedDate: new Date(`${data.expectedDate}T00:00:00.000Z`),
      authorizedBy: data.authorizedBy,
    },
  });
  return toVisitor(row);
}

/**
 * Remove o visitor de forma permanente. Remover um `id` que já não existe também é sucesso:
 * a operação é idempotente (FR-012, research R-011).
 */
export async function removeVisitor(id: string): Promise<void> {
  await prisma.visitor.deleteMany({ where: { id } });
}
