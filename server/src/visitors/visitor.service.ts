import type { Role, VisitType } from "../../generated/prisma/enums.ts";
import { displayNameOf } from "../lib/displayName.ts";
import { prisma } from "../lib/prisma.ts";
import { MANAGING_ROLES } from "../lib/roles.ts";
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
  /**
   * O cargo de quem autorizou, no condomínio da visita, AGORA — o mesmo instante para o qual `name`
   * é calculado. É o que deixa o comprovante dizer "Resident …" ou "Administrator" sem o app
   * adivinhar o cargo pelo nome.
   */
  role: Role;
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
  /**
   * Quem pediu pode remover esta visita: foi ele quem a autorizou. Para o administrador é `false`
   * em toda visita de outra pessoa — ele a vê, mas não a apaga. A tela só desenha a lixeira onde
   * isto vem `true`; permissão não é coisa que ela decide comparando ids.
   */
  canRemove: boolean;
  /**
   * O código do comprovante desta visita. Presente EXATAMENTE quando quem pediu a autorizou — a
   * mesma condição de `canRemove` —, e ausente nos outros casos, em vez de `null`. O administrador
   * vê as visitas de todo mundo, mas o código das que não liberou não chega a ele: quem não poderia
   * ter gerado o comprovante não o recebe (research R-007 da 012).
   */
  passCode?: string;
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

/** Tudo que `toVisitor` precisa além das colunas básicas, num lugar só para as duas consultas. */
const WITH_RELATIONS = {
  // Sempre lido; se SAI na resposta é `toVisitor` que decide, olhando quem pediu.
  passCode: true,
  unit: { select: { id: true, block: true, number: true } },
  // O cargo vem junto porque decide o NOME exibido: o administrador aparece como "Administrator".
  authorizedBy: {
    select: { userId: true, role: true, user: { select: { name: true } } },
  },
} as const;

type VisitorRowWithRelations = {
  id: string;
  name: string;
  type: VisitType;
  expectedDate: Date;
  condominiumId: string;
  passCode: string;
  unit: { id: string; block: string | null; number: string };
  authorizedBy: { userId: string; role: Role; user: { name: string } };
};

/**
 * Converte a row do banco para o contrato.
 *
 * A coluna `expected_date` é `DATE`, que o Prisma entrega como `Date` à meia-noite UTC. Ler a data
 * em UTC devolve sempre o dia gravado, sem deslocamento de fuso (research R-007).
 * `createdAt` e `updatedAt` ficam fora do contrato.
 */
export function toVisitor(
  row: VisitorRowWithRelations,
  requesterId: string
): Visitor {
  // Uma pergunta só decide as duas coisas: remover a visita e ter o comprovante dela.
  const authorizedByRequester = row.authorizedBy.userId === requesterId;

  return {
    canRemove: authorizedByRequester,
    // A chave fica FORA do objeto para quem não autorizou: nem o nome do campo viaja.
    ...(authorizedByRequester ? { passCode: row.passCode } : {}),
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
      // "Administrator" quando quem autorizou administra este condomínio; o nome dela, se não.
      name: displayNameOf({
        role: row.authorizedBy.role,
        name: row.authorizedBy.user.name,
      }),
      role: row.authorizedBy.role,
    },
  };
}

/**
 * Quais visitas uma pessoa VÊ.
 *
 * - **Administrador**: todas as visitas dos condomínios que ele administra, de qualquer unidade e
 *   autorizadas por qualquer pessoa. É o único que vê visita de outra pessoa.
 * - **Morador**: só as que ele mesmo autorizou. Nem a de quem mora na mesma unidade.
 *
 * O cargo é POR CONDOMÍNIO: quem administra um prédio e mora em outro vê tudo do primeiro e só as
 * suas do segundo, e é por isso que o filtro é um `OR` e não um `if` de cargo.
 *
 * **Ver não é poder remover.** Remover é só de quem autorizou, administrador inclusive — ver
 * `removeVisitor`.
 */
async function visibleTo(requesterId: string) {
  const administered = await prisma.condominiumMember.findMany({
    where: { userId: requesterId, role: { in: MANAGING_ROLES } },
    select: { condominiumId: true },
  });

  return {
    OR: [
      { condominiumId: { in: administered.map((row) => row.condominiumId) } },
      { authorizedById: requesterId },
    ],
  };
}

/**
 * As visitas que quem pediu vê, da data prevista mais próxima para a mais distante (FR-016).
 * No empate, vale a ordem de criação, e por fim o `id`, para a ordem ser sempre estável.
 *
 * Até aqui esta rota devolvia as visitas de TODOS os condomínios para qualquer conta, e a tela é
 * que filtrava. A decisão que faltava — o que cada cargo pode ver — está em `visibleTo`.
 */
export async function listVisitors(requesterId: string): Promise<Visitor[]> {
  const rows = await prisma.visitor.findMany({
    where: await visibleTo(requesterId),
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
  return rows.map((row) => toVisitor(row, requesterId));
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
  // Quem acabou de autorizar é, por definição, quem pode remover.
  return toVisitor(row, authorizedById);
}

/**
 * Remove o visitor de forma permanente. Remover um `id` que já não existe também é sucesso:
 * a operação é idempotente (FR-012, research R-011).
 *
 * **Só quem autorizou a visita a remove — e isso vale para o administrador também.** Ele vê as
 * visitas do condomínio inteiro, mas apagar a de outra pessoa não é dele: só as que ele mesmo
 * liberou. É a mesma condição que `toVisitor` manda como `canRemove`, para a tela não desenhar uma
 * lixeira que o servidor recusaria.
 *
 * Um `id` de outra pessoa NÃO é apagado e recebe o mesmo sucesso de um `id` que não existe — a
 * resposta não diz a ninguém se aquela visita existe.
 */
export async function removeVisitor(id: string, requesterId: string): Promise<void> {
  await prisma.visitor.deleteMany({
    where: { id: id, authorizedById: requesterId },
  });
}
