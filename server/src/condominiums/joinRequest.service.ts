import { clearFailures } from "../auth/auth.service.ts";
import { prisma } from "../lib/prisma.ts";
import { managesCondominium } from "../lib/roles.ts";

/**
 * Pedidos de entrada de um condomínio: quem se cadastrou dizendo que mora nele e espera que alguém
 * confirme (feature 016).
 *
 * Não conhece HTTP: não recebe requisição e não escolhe status code (constituição, seção Backend).
 *
 * **Quem responde é quem cuida do condomínio** — o administrador ou o síndico, pela pergunta de
 * sempre, `managesCondominium`. O porteiro e o morador não veem pedido nenhum.
 *
 * **Toda resposta começa apagando o pedido, e só segue se apagou.** Um pedido existe enquanto está
 * pendente e some com qualquer resposta; não há coluna de situação nem histórico. Duas pessoas
 * aprovando ao mesmo tempo, ou uma aprovação cruzando com a desistência da pessoa, rodam as duas o
 * mesmo `DELETE`: uma apaga uma linha e a outra não apaga nenhuma. Ler "ainda está pendente?" antes
 * de agir deixaria as duas passarem (ADR 0021).
 */

/** Um pedido, como a lista de quem cuida do condomínio o mostra. */
export interface JoinRequest {
  id: string;
  /** O nome e o e-mail de quem pede: é com eles que se confere se a pessoa mora ali. */
  name: string;
  email: string;
  unit: { block: string | null; number: string };
  /** ISO 8601: quando foi pedido. Um instante. */
  requestedAt: string;
}

/**
 * Motivos de recusa que o controller traduz em status code.
 *
 * - `notFound` → 404. O condomínio não existe, ou quem pediu não tem vínculo com ele (ADR 0010).
 * - `forbidden` → 403. Tem vínculo, mas não cuida do condomínio.
 * - `requestNotFound` → 404. O pedido não existe mais: já foi respondido, a pessoa desistiu, ou é
 *   de outro condomínio. Sem histórico não dá para dizer qual dos três, e a resposta é uma só.
 */
export type JoinRequestFailure = "notFound" | "forbidden" | "requestNotFound";

export class JoinRequestError extends Error {
  reason: JoinRequestFailure;

  constructor(reason: JoinRequestFailure) {
    super(`Pedido de entrada recusado (${reason})`);
    this.name = "JoinRequestError";
    this.reason = reason;
  }
}

/** A porta das três operações: quem pediu cuida DESTE condomínio. */
async function requireInCharge(
  condominiumId: string,
  requesterId: string
): Promise<void> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new JoinRequestError("notFound");
  }
  if (!managesCondominium(membership.role)) {
    throw new JoinRequestError("forbidden");
  }
}

/** Os pedidos pendentes do condomínio, do mais antigo para o mais novo: quem espera há mais tempo
 * aparece primeiro. O `id` desempata dois do mesmo instante. */
export async function listJoinRequests(
  condominiumId: string,
  requesterId: string
): Promise<JoinRequest[]> {
  await requireInCharge(condominiumId, requesterId);

  const rows = await prisma.joinRequest.findMany({
    where: { condominiumId: condominiumId },
    select: {
      id: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      unit: { select: { block: true, number: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.user.name,
    email: row.user.email,
    unit: row.unit,
    requestedAt: row.createdAt.toISOString(),
  }));
}

/**
 * Aprova: a pessoa vira moradora do condomínio, morando na unidade que pediu.
 *
 * São três gravações em UMA transação, nesta ordem:
 *
 * 1. apaga o pedido — e só segue se apagou;
 * 2. cria o vínculo de morador;
 * 3. cria a moradia naquela unidade.
 *
 * As duas últimas PRECISAM estar na mesma transação: a trigger que exige unidade de todo morador é
 * conferida no fim dela, quando as duas linhas já existem. Separadas, o banco desfaria a primeira
 * (RN-RES-02). Esta função é a primeira do aplicativo a criar um morador.
 */
export async function approveJoinRequest(
  condominiumId: string,
  requesterId: string,
  requestId: string
): Promise<void> {
  await requireInCharge(condominiumId, requesterId);

  // De quem é e para qual unidade. Só para saber O QUE gravar: quem decide se o pedido ainda vale é
  // o `DELETE` lá embaixo, não esta leitura.
  const request = await prisma.joinRequest.findFirst({
    where: { id: requestId, condominiumId: condominiumId },
    select: { userId: true, unitId: true },
  });
  if (!request) {
    throw new JoinRequestError("requestNotFound");
  }

  await prisma.$transaction(async (transaction) => {
    const { count } = await transaction.joinRequest.deleteMany({
      where: { id: requestId, condominiumId: condominiumId },
    });
    if (count === 0) {
      throw new JoinRequestError("requestNotFound");
    }

    await transaction.condominiumMember.create({
      data: {
        userId: request.userId,
        condominiumId: condominiumId,
        role: "resident",
      },
      select: { userId: true },
    });
    await transaction.unitResident.create({
      data: {
        userId: request.userId,
        unitId: request.unitId,
        condominiumId: condominiumId,
      },
      select: { userId: true },
    });
  });
}

/**
 * Rejeita: o pedido E a conta da pessoa deixam de existir.
 *
 * A conta foi criada para fazer aquele pedido, como a de um porteiro é criada para aquele cargo; e
 * se ficasse seria uma conta sem condomínio nenhum — justamente a que pode criar um. A pessoa se
 * cadastra de novo, com os dados certos, e o e-mail está livre para isso.
 *
 * **A conta só é apagada se não tem vínculo em lugar nenhum.** Hoje um pedido só vem com conta
 * nova, então a trava nunca dispara. Ela existe pelo mesmo motivo que em `removeStaffMember`: no
 * dia em que quem já mora num condomínio puder pedir para entrar em outro, uma rejeição lá não
 * pode apagar uma pessoa que mora aqui.
 */
export async function rejectJoinRequest(
  condominiumId: string,
  requesterId: string,
  requestId: string
): Promise<void> {
  await requireInCharge(condominiumId, requesterId);

  const request = await prisma.joinRequest.findFirst({
    where: { id: requestId, condominiumId: condominiumId },
    select: { userId: true },
  });
  if (!request) {
    throw new JoinRequestError("requestNotFound");
  }

  const removedEmail = await prisma.$transaction(async (transaction) => {
    const { count } = await transaction.joinRequest.deleteMany({
      where: { id: requestId, condominiumId: condominiumId },
    });
    if (count === 0) {
      throw new JoinRequestError("requestNotFound");
    }

    const memberships = await transaction.condominiumMember.count({
      where: { userId: request.userId },
    });
    if (memberships > 0) {
      return null;
    }

    const user = await transaction.user.delete({
      where: { id: request.userId },
      select: { email: true },
    });
    return user.email;
  });

  // O endereço não é mais de ninguém: um bloqueio pendurado nele só atrapalharia o novo cadastro.
  if (removedEmail !== null) {
    await clearFailures(removedEmail);
  }
}
