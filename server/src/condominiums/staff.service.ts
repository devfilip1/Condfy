import { Prisma } from "../../generated/prisma/client.ts";
import {
  checkLockout,
  clearFailures,
  recordFailure,
  signUpKey,
} from "../auth/auth.service.ts";
import { hashPassword } from "../lib/password.ts";
import { prisma } from "../lib/prisma.ts";
import type { NewStaffMember, StaffRole } from "./staff.dto.ts";

/**
 * Cargos de um condomínio: quem o síndico trouxe para trabalhar nele — o administrador e os
 * porteiros (feature 014).
 *
 * Não conhece HTTP: não recebe requisição e não escolhe status code (constituição, seção Backend).
 *
 * **Tudo aqui é só do síndico.** É a segunda permissão do projeto que pergunta por
 * `role === "manager"` em vez de `managesCondominium` — a outra é criar um local de reserva. O
 * administrador cuida do condomínio, mas não mexe em quem trabalha nele (FR-001).
 *
 * O síndico e os moradores NUNCA são alcançados por este módulo: toda consulta e toda escrita
 * filtra por `STAFF_ROLES`, então um `userId` de síndico, de morador ou de outro condomínio
 * simplesmente não casa com nada.
 */

/** Uma pessoa com cargo, no formato do contrato. Nunca traz password, em forma nenhuma. */
export interface StaffMember {
  userId: string;
  /** O nome DA PESSOA, e não "Administrator": é como o síndico distingue dois porteiros. */
  name: string;
  email: string;
  role: StaffRole;
  /** A pessoa ainda não trocou a password que o síndico definiu — "ainda não entrou". */
  passwordIsProvisional: boolean;
}

/**
 * Motivos de recusa que o controller traduz em status code.
 *
 * - `notFound` → 404. O condomínio não existe, ou quem pediu não tem vínculo com ele: a mesma
 *   resposta para os dois (ADR 0010).
 * - `forbidden` → 403. Tem vínculo, mas não é o síndico.
 * - `emailTaken` → 400 no campo `email`.
 * - `adminTaken` → 400 no campo `role`. O condomínio já tem administrador.
 * - `personNotFound` → 404. O `userId` não tem cargo de administrador nem de porteiro aqui.
 * - `notProvisional` → 409. A pessoa já escolheu a própria password; o síndico não a troca mais.
 */
export type StaffFailure =
  | "notFound"
  | "forbidden"
  | "emailTaken"
  | "adminTaken"
  | "personNotFound"
  | "notProvisional";

export class StaffError extends Error {
  reason: StaffFailure;

  constructor(reason: StaffFailure) {
    super(`Cargo recusado (${reason})`);
    this.name = "StaffError";
    this.reason = reason;
  }
}

const STAFF_ROLES: StaffRole[] = ["admin", "doorman"];

/** As colunas de uma pessoa com cargo, num lugar só para todas as consultas. */
const STAFF_COLUMNS = {
  userId: true,
  role: true,
  user: { select: { name: true, email: true, passwordIsProvisional: true } },
} as const;

function toStaffMember(row: {
  userId: string;
  role: string;
  user: { name: string; email: string; passwordIsProvisional: boolean };
}): StaffMember {
  return {
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    // As consultas filtram por `STAFF_ROLES`; o teste é para o compilador.
    role: row.role === "admin" ? "admin" : "doorman",
    passwordIsProvisional: row.user.passwordIsProvisional,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * A porta de todas as operações: quem pediu é o síndico DESTE condomínio.
 *
 * A ordem das recusas é a do ADR 0010: sem vínculo → `notFound`; tem vínculo com outro cargo →
 * `forbidden`.
 */
async function requireManager(
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
    throw new StaffError("notFound");
  }
  if (membership.role !== "manager") {
    throw new StaffError("forbidden");
  }
}

/** A pessoa com cargo neste condomínio, ou `personNotFound`. */
async function staffMemberOf(
  condominiumId: string,
  userId: string
): Promise<StaffMember> {
  const row = await prisma.condominiumMember.findFirst({
    where: { condominiumId: condominiumId, userId: userId, role: { in: STAFF_ROLES } },
    select: STAFF_COLUMNS,
  });
  if (!row) {
    throw new StaffError("personNotFound");
  }
  return toStaffMember(row);
}

/**
 * Quem tem cargo no condomínio: o administrador primeiro, depois os porteiros por nome (FR-026).
 *
 * `role: "asc"` põe o administrador na frente porque o Postgres ordena um enum pela ordem em que
 * os valores foram declarados, e `admin` vem antes de `doorman`. O `userId` no fim deixa a ordem
 * estável entre duas pessoas com o mesmo nome.
 */
export async function listStaff(
  condominiumId: string,
  requesterId: string
): Promise<StaffMember[]> {
  await requireManager(condominiumId, requesterId);

  const rows = await prisma.condominiumMember.findMany({
    where: { condominiumId: condominiumId, role: { in: STAFF_ROLES } },
    select: STAFF_COLUMNS,
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }, { userId: "asc" }],
  });

  return rows.map(toStaffMember);
}

/**
 * Cria a conta de uma pessoa e o cargo dela neste condomínio, JUNTOS (FR-013): nunca uma conta sem
 * cargo, nunca um cargo sem conta.
 *
 * **Não há leitura de "este e-mail está livre?" nem de "já existe administrador?" antes de gravar,
 * de propósito.** Dois pedidos simultâneos passariam pelas duas leituras; quem decide são os
 * índices únicos, e quem perde recebe a violação (ADR 0011).
 *
 * **São dois `try/catch`, um por gravação, e não um em volta das duas.** As duas violações são
 * `P2002`; o que diz qual índice foi violado é ONDE o erro foi lançado — o do usuário é o e-mail,
 * o do vínculo é `condominium_members_one_admin_key`. Um `catch` só não saberia dizer em qual
 * campo pôr a mensagem. Qualquer uma das duas desfaz a transação inteira.
 *
 * A conta nasce com `passwordIsProvisional: true` e NENHUMA sessão é aberta para ela: reusar
 * `signUp` aqui entregaria ao síndico as credenciais de outra pessoa.
 *
 * O limite contra varredura de e-mails é o MESMO do cadastro, com a mesma chave. Qualquer conta
 * vira síndica criando um condomínio, então sem isto este formulário seria um desvio do limite.
 */
export async function addStaffMember(
  condominiumId: string,
  requesterId: string,
  data: NewStaffMember,
  origin: string
): Promise<StaffMember> {
  await requireManager(condominiumId, requesterId);

  const key = signUpKey(origin);
  await checkLockout([key]);

  const passwordHash = await hashPassword(data.password);

  try {
    return await prisma.$transaction(async (tx) => {
      let user: { id: string; name: string; email: string };
      try {
        user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash: passwordHash,
            passwordIsProvisional: true,
          },
          select: { id: true, name: true, email: true },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new StaffError("emailTaken");
        }
        throw error;
      }

      try {
        await tx.condominiumMember.create({
          data: { userId: user.id, condominiumId: condominiumId, role: data.role },
          select: { userId: true },
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new StaffError("adminTaken");
        }
        throw error;
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: data.role,
        passwordIsProvisional: true,
      };
    });
  } catch (error) {
    // Fora da transação, que a esta altura já foi desfeita: o contador não pode sumir com ela.
    if (error instanceof StaffError && error.reason === "emailTaken") {
      await recordFailure([key]);
    }
    throw error;
  }
}

/**
 * Muda o cargo entre porteiro e administrador (FR-034).
 *
 * O `where` carrega o condomínio e os dois cargos: o vínculo do próprio síndico e o de um morador
 * nunca casam, então não há como este módulo mexer neles (FR-036). Virar administrador pode bater
 * no índice que limita a um — a mesma recusa de `addStaffMember`.
 *
 * Quem deixa de ser administrador mantém as reservas que segurava: o vínculo não acabou, então
 * nada vai em cascata.
 */
export async function changeStaffRole(
  condominiumId: string,
  requesterId: string,
  userId: string,
  role: StaffRole
): Promise<StaffMember> {
  await requireManager(condominiumId, requesterId);

  let count: number;
  try {
    ({ count } = await prisma.condominiumMember.updateMany({
      where: { condominiumId: condominiumId, userId: userId, role: { in: STAFF_ROLES } },
      data: { role: role },
    }));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new StaffError("adminTaken");
    }
    throw error;
  }

  if (count === 0) {
    throw new StaffError("personNotFound");
  }
  return staffMemberOf(condominiumId, userId);
}

/**
 * Tira a pessoa do condomínio E APAGA A CONTA que o síndico criou para ela (FR-030, FR-031).
 *
 * Decisão do dono do produto, em 2026-10-07: a conta nasceu para aquele cargo, então sai com ele.
 * Isso também resolve o e-mail digitado errado, que antes ficava preso numa conta sem dono.
 *
 * Tudo numa transação só:
 *
 * 1. O `DELETE` no vínculo. O banco leva junto as visitas que ela liberou e as reservas que
 *    segurava, como em qualquer vínculo que acaba.
 * 2. **A conta só é apagada se não sobrou nada dela em outro lugar.** Com vínculo em outro
 *    condomínio, ou com aviso ou achado publicado em outro condomínio, a conta FICA e só o vínculo
 *    sai: este síndico não decide pelo prédio dos outros. Hoje isso quase não acontece — um cargo
 *    só vem com conta nova —, mas é a trava que impede uma remoção daqui de apagar alguém de lá.
 * 3. Os avisos e os achados que ela publicou NESTE condomínio ficam (FR-032), e passam para o nome
 *    do síndico que a removeu. Eles apontam para a conta com `Restrict` (ADR 0019), então sem isto
 *    o passo 4 falharia para quem tivesse publicado um aviso sequer; e não sobra pessoa para ser
 *    nomeada. Quem responde pelo que o condomínio guarda é quem cuida dele.
 * 4. O `DELETE` na conta, que leva as sessões dela.
 *
 * A pessoa cai para a tela de entrar na próxima renovação de sessão, e `GET /me` já responde `401`
 * na hora.
 */
export async function removeStaffMember(
  condominiumId: string,
  requesterId: string,
  userId: string
): Promise<void> {
  await requireManager(condominiumId, requesterId);

  const removedEmail = await prisma.$transaction(async (tx) => {
    const { count } = await tx.condominiumMember.deleteMany({
      where: { condominiumId: condominiumId, userId: userId, role: { in: STAFF_ROLES } },
    });
    if (count === 0) {
      throw new StaffError("personNotFound");
    }

    const elsewhere = { not: condominiumId };
    const [memberships, notices, foundItems] = await Promise.all([
      tx.condominiumMember.count({ where: { userId: userId } }),
      tx.notice.count({ where: { publishedById: userId, condominiumId: elsewhere } }),
      tx.foundItem.count({ where: { postedById: userId, condominiumId: elsewhere } }),
    ]);
    if (memberships + notices + foundItems > 0) {
      return null;
    }

    await tx.notice.updateMany({
      where: { publishedById: userId, condominiumId: condominiumId },
      data: { publishedById: requesterId },
    });
    await tx.foundItem.updateMany({
      where: { postedById: userId, condominiumId: condominiumId },
      data: { postedById: requesterId },
    });

    const user = await tx.user.delete({
      where: { id: userId },
      select: { email: true },
    });
    return user.email;
  });

  // O endereço não é mais de ninguém: um bloqueio pendurado nele só atrapalharia quem viesse a
  // usá-lo depois. Fora da transação, como em `deleteAccount`.
  if (removedEmail !== null) {
    await clearFailures(removedEmail);
  }
}

/**
 * Define OUTRA password provisória, enquanto a pessoa não escolheu a dela (FR-024, FR-025).
 *
 * A condição está no próprio `UPDATE` (`passwordIsProvisional: true` no filtro), e não numa
 * leitura antes: se a pessoa escolher a password no mesmo instante, ela ganha e esta escrita não
 * muda nada. Depois disso o síndico não tem mais como ver, definir ou trocar a password dela.
 *
 * As credenciais de renovação são APAGADAS, e não revogadas — o mesmo motivo de `changePassword`:
 * uma credencial revogada que é usada de novo derruba todas as sessões da conta (RN-AUT-04).
 *
 * Não pede a password do síndico. O ADR 0015 é sobre mudar a PRÓPRIA conta.
 */
export async function setProvisionalPassword(
  condominiumId: string,
  requesterId: string,
  userId: string,
  password: string
): Promise<void> {
  await requireManager(condominiumId, requesterId);
  // Antes de tudo: o alvo tem cargo NESTE condomínio. Sem isto o síndico de um prédio trocaria a
  // password provisória de alguém de outro.
  await staffMemberOf(condominiumId, userId);

  const { count } = await prisma.user.updateMany({
    where: { id: userId, passwordIsProvisional: true },
    data: { passwordHash: await hashPassword(password) },
  });

  if (count === 0) {
    throw new StaffError("notProvisional");
  }

  await prisma.refreshToken.deleteMany({ where: { userId: userId } });
}
