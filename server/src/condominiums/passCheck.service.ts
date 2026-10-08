import type { VisitType } from "../../generated/prisma/enums.ts";
import { fromDateColumn, todayLocalISODate } from "../lib/calendarDate.ts";
import { displayNameOf } from "../lib/displayName.ts";
import { prisma } from "../lib/prisma.ts";

/**
 * Conferência do comprovante de uma visita, na portaria (feature 015).
 *
 * Não conhece HTTP: não recebe requisição e não escolhe status code (constituição, seção Backend).
 *
 * É a primeira vez que alguma coisa LÊ o código que todo comprovante carrega desde a feature 012.
 * O comprovante não mudou para isso: o código identifica uma visita, e o dia em que ela vale é o
 * `expectedDate` dela, que o servidor já sabe.
 *
 * **Só o porteiro confere.** É a única regra do projeto que pergunta pelo cargo `doorman` pelo
 * nome — as outras diferenças do porteiro são perguntas de `lib/roles.ts`. O síndico e o
 * administrador, que já veem todas as visitas, NÃO conferem comprovante: decisão do dono.
 *
 * A conferência em si não é guardada em lugar nenhum. A única coisa que ela deixa é a hora de
 * entrada da visita, na primeira vez que responde "válido".
 */

/** A visita, como a resposta da conferência a mostra. Nenhum id, e NUNCA o código. */
export interface CheckedVisit {
  name: string;
  type: VisitType;
  /** Dia de calendário `YYYY-MM-DD`. */
  expectedDate: string;
  unit: { block: string | null; number: string };
  /** O nome com que quem liberou aparece no condomínio: "Administrator", "Manager" ou o dela. */
  authorizedBy: { name: string };
  /** INSTANTE ISO 8601, ou `null` se ninguém conferiu esta visita com sucesso ainda. */
  enteredAt: string | null;
}

/**
 * As quatro respostas. São quatro valores de um campo, e NÃO quatro status HTTP: o porteiro fez
 * uma pergunta e recebeu uma resposta, nas quatro. Um "vencido" devolvido como erro viraria, no
 * app, "não deu para conferir" — que é outra coisa.
 *
 * - `valid` — a visita é esperada HOJE, neste condomínio. `alreadyEntered` diz se esta conferência
 *   foi a primeira (`false`: ela acabou de gravar a entrada) ou não.
 * - `notYet` — é esperada num dia que ainda vai chegar.
 * - `expired` — era esperada num dia que já passou.
 * - `notRecognised` — todo o resto, e sem mais nenhum campo: código que não é UUID, código que não
 *   existe, visita removida e visita de OUTRO condomínio recebem exatamente isto, para a resposta
 *   não contar a ninguém qual foi o caso.
 */
export type PassCheck =
  | { outcome: "valid"; alreadyEntered: boolean; visit: CheckedVisit }
  | { outcome: "notYet" | "expired"; visit: CheckedVisit }
  | { outcome: "notRecognised" };

/**
 * Motivos de recusa que o controller traduz em status code.
 *
 * - `notFound` → 404. O condomínio não existe, ou quem pediu não tem vínculo com ele (ADR 0010).
 * - `forbidden` → 403. Tem vínculo, mas não é porteiro.
 */
export type PassCheckFailure = "notFound" | "forbidden";

export class PassCheckError extends Error {
  reason: PassCheckFailure;

  constructor(reason: PassCheckFailure) {
    super(`Conferência recusada (${reason})`);
    this.name = "PassCheckError";
    this.reason = reason;
  }
}

const NOT_RECOGNISED: PassCheck = { outcome: "notRecognised" };

/**
 * Confere um comprovante. `code` é `null` quando o que foi lido não tem a forma de um código — o
 * controller já passou pelo dto.
 *
 * "Hoje" é o dia do relógio do SERVIDOR no instante da conferência, o mesmo relógio que o projeto
 * já trata como o do condomínio nas reservas. Nunca a data do aparelho do porteiro, nem nada que o
 * comprovante diga (FR-013).
 */
export async function checkPass(
  condominiumId: string,
  requesterId: string,
  code: string | null
): Promise<PassCheck> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new PassCheckError("notFound");
  }
  if (membership.role !== "doorman") {
    throw new PassCheckError("forbidden");
  }

  if (code === null) {
    return NOT_RECOGNISED;
  }

  // Pelo código E pelo condomínio do caminho: o comprovante de uma visita de outro prédio não
  // casa com nada, e cai no mesmo `notRecognised` de um código que nunca existiu.
  const row = await prisma.visitor.findFirst({
    where: { passCode: code, condominiumId: condominiumId },
    select: {
      id: true,
      name: true,
      type: true,
      expectedDate: true,
      enteredAt: true,
      unit: { select: { block: true, number: true } },
      authorizedBy: {
        select: { role: true, user: { select: { name: true } } },
      },
    },
  });

  if (!row) {
    return NOT_RECOGNISED;
  }

  const expectedDate = fromDateColumn(row.expectedDate);
  const today = todayLocalISODate();

  const visitWith = (enteredAt: Date | null): CheckedVisit => ({
    name: row.name,
    type: row.type,
    expectedDate: expectedDate,
    unit: { block: row.unit.block, number: row.unit.number },
    authorizedBy: {
      name: displayNameOf({
        role: row.authorizedBy.role,
        name: row.authorizedBy.user.name,
      }),
    },
    enteredAt: enteredAt?.toISOString() ?? null,
  });

  // `YYYY-MM-DD` ordena como texto igual à data que representa. Nenhuma das duas grava nada.
  if (expectedDate < today) {
    return { outcome: "expired", visit: visitWith(row.enteredAt) };
  }
  if (expectedDate > today) {
    return { outcome: "notYet", visit: visitWith(row.enteredAt) };
  }

  // Válido. A entrada é gravada UMA vez, e por um `UPDATE` condicional — `enteredAt: null` no
  // filtro —, não por "leio, e se estiver vazio gravo". Dois porteiros lendo o mesmo comprovante no
  // mesmo instante rodam os dois este `UPDATE`: um muda uma linha e o outro não muda nenhuma. Essa
  // contagem é também a resposta de "esta conferência foi a primeira?" — com leitura e depois
  // escrita, os dois achariam que foram.
  const now = new Date();
  const { count } = await prisma.visitor.updateMany({
    where: { id: row.id, enteredAt: null },
    data: { enteredAt: now },
  });

  if (count === 1) {
    return { outcome: "valid", alreadyEntered: false, visit: visitWith(now) };
  }

  // Outra conferência gravou antes — agora há pouco, ou nesta mesma corrida. A hora que vale é a
  // que está no banco, não a que foi lida no começo desta função.
  const stored = await prisma.visitor.findUnique({
    where: { id: row.id },
    select: { enteredAt: true },
  });
  if (!stored) {
    // A visita foi removida entre a leitura e a escrita.
    return NOT_RECOGNISED;
  }
  return {
    outcome: "valid",
    alreadyEntered: true,
    visit: visitWith(stored.enteredAt),
  };
}
