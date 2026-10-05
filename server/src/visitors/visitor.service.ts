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
 *
 * Desde a ligação com unidade e vínculo, duas garantias são do BANCO e não deste módulo: quem
 * autorizou pertence ao condomínio da visita, e a unidade é do mesmo condomínio. As duas FKs
 * compostas de `visitors` recusam qualquer combinação fora disso (research R-002).
 */

/** Unidade visitada, no formato do contrato. O app monta o rótulo (`block` + `number`). */
export interface VisitorUnit {
  id: string;
  /** `null` quando o condomínio não tem blocos. */
  block: string | null;
  number: string;
}

/** Quem autorizou a visita. */
export interface VisitorAuthorizer {
  id: string;
  name: string;
}

/** Visitor no formato do contrato JSON: os mesmos campos e nomes do app. */
export interface Visitor {
  id: string;
  name: string;
  type: VisitType;
  /** Dia de calendário `YYYY-MM-DD`, sem horário e sem fuso. */
  expectedDate: string;
  condominiumId: string;
  unit: VisitorUnit;
  authorizedBy: VisitorAuthorizer;
}

/** Motivo da recusa que o controller traduz em status code. */
export type VisitorFailure = "unit";

export class VisitorError extends Error {
  reason: VisitorFailure;

  constructor(reason: VisitorFailure) {
    super(`Visita recusada (${reason})`);
    this.name = "VisitorError";
    this.reason = reason;
  }
}

/** Tudo que `toVisitor` precisa das relações, num lugar só. */
const WITH_RELATIONS = {
  unit: { select: { id: true, block: true, number: true } },
  authorizedBy: { select: { userId: true, user: { select: { name: true } } } },
} as const;

type VisitorRowWithRelations = {
  id: string;
  name: string;
  type: VisitType;
  expectedDate: Date;
  condominiumId: string;
  unit: { id: string; block: string | null; number: string };
  authorizedBy: { userId: string; user: { name: string } };
};

/**
 * Converte a row do banco para o contrato.
 *
 * A coluna `expected_date` é `DATE`, que o Prisma entrega como `Date` à meia-noite UTC. Ler a data
 * em UTC devolve sempre o dia gravado, sem deslocamento de fuso (research R-007).
 * `createdAt` e `updatedAt` ficam fora do contrato.
 */
export function toVisitor(row: VisitorRowWithRelations): Visitor {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    expectedDate: row.expectedDate.toISOString().slice(0, 10),
    condominiumId: row.condominiumId,
    unit: {
      id: row.unit.id,
      block: row.unit.block,
      number: row.unit.number,
    },
    authorizedBy: {
      id: row.authorizedBy.userId,
      name: row.authorizedBy.user.name,
    },
  };
}

/**
 * Todos os visitors, da data prevista mais próxima para a mais distante (FR-016).
 * No empate, vale a ordem de criação, e por fim o `id`, para a ordem ser sempre estável.
 *
 * TODO: ainda devolve os visitantes de TODOS os condomínios. Restringir ao condomínio de quem
 * pediu depende de decidir o que cada cargo pode ver, que é a feature de moradores.
 */
export async function listVisitors(): Promise<Visitor[]> {
  const rows = await prisma.visitor.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      expectedDate: true,
      condominiumId: true,
      ...WITH_RELATIONS,
    },
    orderBy: [{ expectedDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map(toVisitor);
}

/**
 * Grava um visitor já validado e devolve o registro com o `id` gerado pelo banco.
 *
 * `authorizedById` vem do token, nunca do body (FR-022), e o condomínio vem da UNIDADE — o body
 * não escolhe nenhum dos dois. A data entra como meia-noite UTC para a coluna `DATE` guardar
 * exatamente o dia informado (research R-007).
 *
 * A unidade é procurada antes de gravar só para devolver erro de campo em vez de deixar a FK
 * composta estourar como 500. A garantia continua sendo do banco.
 */
export async function createVisitor(
  data: NewVisitor,
  authorizedById: string
): Promise<Visitor> {
  const unit = await prisma.unit.findUnique({
    where: { id: data.unitId },
    select: { condominiumId: true },
  });

  if (!unit) {
    throw new VisitorError("unit");
  }

  // Unidade de um condomínio onde quem autorizou não tem vínculo recebe a MESMA recusa de
  // unidade inexistente: responder de formas diferentes revelaria quais unidades existem.
  const member = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: {
        userId: authorizedById,
        condominiumId: unit.condominiumId,
      },
    },
    select: { userId: true },
  });

  if (!member) {
    throw new VisitorError("unit");
  }

  const row = await prisma.visitor.create({
    data: {
      name: data.name,
      type: data.type,
      expectedDate: new Date(`${data.expectedDate}T00:00:00.000Z`),
      unitId: data.unitId,
      condominiumId: unit.condominiumId,
      authorizedById: authorizedById,
    },
    select: {
      id: true,
      name: true,
      type: true,
      expectedDate: true,
      condominiumId: true,
      ...WITH_RELATIONS,
    },
  });
  return toVisitor(row);
}

/**
 * Remove o visitor de forma permanente. Remover um `id` que já não existe também é sucesso:
 * a operação é idempotente (FR-012, research R-011).
 *
 * TODO: não confere de quem é o visitante. Qualquer conta autenticada apaga o de qualquer outra,
 * até a feature de moradores definir o que cada cargo pode apagar.
 */
export async function removeVisitor(id: string): Promise<void> {
  await prisma.visitor.deleteMany({ where: { id } });
}
