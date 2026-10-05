import { prisma } from "../lib/prisma.ts";

/**
 * Regras e acesso a dados dos avisos de um condomínio.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * É aqui que mora a PRIMEIRA regra de permissão do projeto. O banco garante *vínculo* — a FK
 * composta exige que a linha de `condominium_members` exista — mas não consegue exigir que a coluna
 * `role` valha `admin`. Uma trigger também seria errada: a regra vale no momento da publicação, não
 * pela vida da linha, senão um aviso antigo passaria a violar a regra quando o cargo mudasse.
 */

/** Aviso no formato do contrato JSON. */
export interface Notice {
  id: string;
  title: string;
  /** Texto completo, quebras de linha incluídas. O corte de duas linhas é da tela, não daqui. */
  body: string;
  /** Dia de calendário `YYYY-MM-DD`, sem horário e sem fuso. */
  date: string;
}

/**
 * Motivos de recusa que o controller traduz em status code.
 *
 * `condominium` e `forbidden` são DIFERENTES de propósito. O resto da API esconde existência com
 * `404` para impedir enumeração, e isso não vale para quem está dentro: um morador do Brisas lê os
 * avisos dele todo dia, então dizer "condomínio não encontrado" seria mentira (research R-002).
 */
export type NoticeFailure = "condominium" | "forbidden";

export class NoticeError extends Error {
  reason: NoticeFailure;

  constructor(reason: NoticeFailure) {
    super(`Aviso recusado (${reason})`);
    this.name = "NoticeError";
    this.reason = reason;
  }
}

/** O que o serviço precisa gravar. Já validado pelo dto. */
export interface NewNotice {
  title: string;
  body: string;
  date: string;
}

/** Converte a row para o contrato. `publishedById` nunca sai daqui (FR-004). */
function toNotice(row: {
  id: string;
  title: string;
  body: string;
  date: Date;
}): Notice {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    // A coluna é `DATE`; ler em UTC devolve sempre o dia gravado (research R-007 da 002).
    date: row.date.toISOString().slice(0, 10),
  };
}

/** Vínculo de quem está pedindo, com o cargo. `null` quando não é membro. */
async function membershipOf(
  condominiumId: string,
  userId: string
): Promise<{ role: string } | null> {
  return prisma.condominiumMember.findUnique({
    where: { userId_condominiumId: { userId: userId, condominiumId: condominiumId } },
    select: { role: true },
  });
}

/**
 * O mural de um condomínio, para quem tem vínculo nele.
 *
 * Devolve o corpo COMPLETO de cada aviso: a tela de detalhe lê o que a lista já trouxe, sem uma
 * segunda requisição (research R-004). Mais recente primeiro, com `id` desempatando para a ordem
 * ser estável entre visitas (FR-010).
 */
export async function listNotices(
  condominiumId: string,
  requesterId: string
): Promise<Notice[]> {
  const membership = await membershipOf(condominiumId, requesterId);
  if (!membership) {
    throw new NoticeError("condominium");
  }

  const rows = await prisma.notice.findMany({
    where: { condominiumId: condominiumId },
    select: { id: true, title: true, body: true, date: true },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return rows.map(toNotice);
}

/**
 * Publica um aviso. Só o administrador daquele condomínio consegue.
 *
 * Quem não é membro recebe `condominium`, que o controller traduz em `404` — a existência continua
 * escondida de quem está de fora. Quem é membro mas não é administrador recebe `forbidden`, que
 * vira `403`: ela sabe que o condomínio existe, e fingir o contrário só atrapalharia.
 */
export async function publishNotice(
  condominiumId: string,
  publisherId: string,
  data: NewNotice
): Promise<Notice> {
  const membership = await membershipOf(condominiumId, publisherId);

  if (!membership) {
    throw new NoticeError("condominium");
  }
  if (membership.role !== "admin") {
    throw new NoticeError("forbidden");
  }

  const row = await prisma.notice.create({
    data: {
      condominiumId: condominiumId,
      publishedById: publisherId,
      title: data.title,
      body: data.body,
      // Meia-noite UTC para a coluna DATE guardar exatamente o dia informado.
      date: new Date(`${data.date}T00:00:00.000Z`),
    },
    select: { id: true, title: true, body: true, date: true },
  });

  return toNotice(row);
}
