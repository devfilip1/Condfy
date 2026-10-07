import { Prisma } from "../../generated/prisma/client.ts";
import type { Role } from "../../generated/prisma/enums.ts";
import {
  addDaysISO,
  buildISODate,
  daysInMonth,
  fromDateColumn,
  minutesSinceMidnightLocal,
  toDateColumn,
  todayLocalISODate,
} from "../lib/calendarDate.ts";
import { prisma } from "../lib/prisma.ts";
import { managesCondominium } from "../lib/roles.ts";
import { signedCommonAreaPhotoPath } from "./commonArea.service.ts";
import { BOOKING_WINDOW_DAYS, SLOT_START_MINUTES, endMinuteOf } from "./slot.ts";

/**
 * Regras e acesso a dados das reservas de áreas comuns.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * Duas garantias NÃO são deste módulo e não precisam ser conferidas aqui:
 *
 * - **Reserva dupla é impossível** pelo índice único `(common_area_id, date, start_minute)`. Nenhuma
 *   gravação deste arquivo CONFIA numa leitura de "está livre?" feita antes, de propósito: dois
 *   pedidos simultâneos passariam pela conferência e os dois gravariam (research R-001). Quem perde
 *   a corrida recebe a violação do índice, que `bookSlot` e `takeWholeDay` traduzem. A leitura que
 *   `takeWholeDay` faz antes de gravar serve só para escolher a mensagem.
 * - **Local e vínculo são do mesmo condomínio da reserva**, pelas duas FKs compostas de
 *   `reservations` (feature 005, research R-002).
 *
 * O que É deste módulo é a janela de 60 dias, e isso é assimétrico de propósito: uma CHECK só chama
 * função imutável, e "hoje" é o oposto disso (research R-003).
 */

/* -------------------------------------------------------------------------- */
/* O contrato                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `open` — livre. `held` — reservado POR QUEM PEDIU, que por isso pode cancelar (FR-012a).
 *
 * Até a feature 011 o administrador recebia aqui também as reservas dos outros. Elas passaram para
 * `booked`, com o `reservationId` junto, para cada reserva ter um lugar só de onde ser cancelada
 * (research R-003 da 011).
 */
export type SlotStatus = "open" | "held";

export interface AvailableSlot {
  startMinute: number;
  endMinute: number;
  status: SlotStatus;
  /** Presente exatamente quando `status` é `"held"`. É o que o DELETE endereça. */
  reservationId?: string;
}

/** Um horário já reservado. De quem é não entra, em caso nenhum. */
export interface BookedSlot {
  startMinute: number;
  endMinute: number;
  /**
   * Presente exatamente quando quem pediu pode cancelar esta reserva POR ESTA LISTA: é o
   * administrador, a reserva é de outra pessoa e o horário ainda não começou. É o que o DELETE
   * endereça. Para um morador nunca vem — a lista dele só informa.
   */
  reservationId?: string;
}

export interface DayAvailability {
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
  /** Só o que quem pediu pode reservar ou liberar. Vazia é dia cheio. */
  slots: AvailableSlot[];
  /** Todas as reservas do local neste dia, de qualquer pessoa, da mais cedo para a mais tarde. */
  booked: BookedSlot[];
  /**
   * Presente exatamente quando quem pediu é o administrador. `true` quando o dia tem ao menos um
   * horário que ainda não começou e TODOS eles são dele — é a posição do interruptor de dia inteiro.
   */
  wholeDayHeld?: boolean;
}

/** O local sendo reservado, como vai junto da disponibilidade. */
export interface BookedCommonArea {
  id: string;
  name: string;
  usageFee: string;
  /** A foto que abre a tela de reserva, nos locais de exemplo: um endereço https, ou `null`. */
  imageUrl: string | null;
  /** O caminho assinado da foto ENVIADA ao criar o local, ou `null`. No máximo um dos dois vem. */
  photoPath: string | null;
  /** `false` só chega ao administrador: para os outros um local desligado responde 404. */
  isAvailable: boolean;
}

export interface Availability {
  commonArea: BookedCommonArea;
  /**
   * Quem pediu é o administrador deste condomínio. A tela mostra os dois interruptores quando isto
   * vem `true`, e só então: quem decide é este módulo, não uma comparação de cargo na tela.
   */
  canManage: boolean;
  /** `YYYY-MM` do mês pedido. */
  month: string;
  /** Só os dias RESERVÁVEIS do mês: hoje até hoje + 60, dentro do mês pedido. */
  days: DayAvailability[];
}

/** Reserva no formato do contrato. `condominiumId` fica fora: já está no caminho da rota. */
export interface Reservation {
  id: string;
  commonAreaId: string;
  date: string;
  startMinute: number;
  endMinute: number;
}

/**
 * Uma reserva de quem pediu, com o nome do local junto: a lista de "minhas reservas" mistura locais,
 * e sem o nome o app teria de cruzar com o catálogo — que não traz local indisponível.
 */
export interface OwnReservation {
  id: string;
  commonArea: { id: string; name: string };
  date: string;
  startMinute: number;
  endMinute: number;
}

/** Dados já validados de uma nova reserva. Quem reserva vem do token, nunca daqui. */
export interface NewReservation {
  date: string;
  startMinute: number;
}

/**
 * Motivo da recusa que o controller traduz em status code.
 *
 * - `condominium` → 404. Quem pediu não tem vínculo com o condomínio, ou ele não existe.
 * - `commonArea` → 404. Local inexistente, indisponível, de outro condomínio, ou quem pediu não tem
 *   vínculo: a MESMA resposta para os quatro, senão daria para mapear quais locais existem.
 * - `reservation` → 404. O mesmo, para uma reserva.
 * - `forbidden` → 403. Tem vínculo, mas não é quem reservou nem administrador (ADR 0010).
 * - `taken` → 409. Perdeu a corrida: o horário foi reservado no meio do caminho.
 * - `started` → 409. O horário já começou; não há o que liberar.
 * - `unavailable` → 409. O local está desligado e quem pediu é o administrador. Para os outros o
 *   mesmo caso é `commonArea`, como sempre foi.
 * - `dayTaken` → 409. Dia inteiro: outra pessoa tem horário naquele dia. Nada é reservado.
 * - `nothingLeft` → 409. Dia inteiro: todos os horários de hoje já começaram.
 */
export type ReservationFailure =
  | "condominium"
  | "commonArea"
  | "reservation"
  | "forbidden"
  | "taken"
  | "started"
  | "unavailable"
  | "dayTaken"
  | "nothingLeft";

export class ReservationError extends Error {
  reason: ReservationFailure;

  constructor(reason: ReservationFailure) {
    super(`Reserva recusada (${reason})`);
    this.name = "ReservationError";
    this.reason = reason;
  }
}

/* -------------------------------------------------------------------------- */
/* Disponibilidade                                                            */
/* -------------------------------------------------------------------------- */

/** Chave de busca de uma reserva dentro do mês: dia + início. */
function slotKey(isoDate: string, startMinute: number): string {
  return `${isoDate}|${startMinute}`;
}

/** O vínculo de quem pediu, ou `null`. O cargo decide o que ela pode liberar. */
async function membershipOf(
  condominiumId: string,
  userId: string
): Promise<{ role: Role } | null> {
  return prisma.condominiumMember.findUnique({
    where: { userId_condominiumId: { userId: userId, condominiumId: condominiumId } },
    select: { role: true },
  });
}

/**
 * O local, se ele existe e é deste condomínio — DISPONÍVEL OU NÃO. `null` nos outros casos.
 *
 * O que fazer com um local desligado é de quem chama, porque depende de quem pediu: para o
 * administrador ele abre, para os outros ele responde como se não existisse.
 */
async function commonAreaOf(
  condominiumId: string,
  commonAreaId: string
): Promise<BookedCommonArea | null> {
  const row = await prisma.commonArea.findFirst({
    where: { id: commonAreaId, condominiumId: condominiumId },
    // `photoContentType` diz se há foto enviada sem tocar nos bytes: `photo` NUNCA entra aqui.
    select: {
      id: true,
      name: true,
      usageFee: true,
      imageUrl: true,
      photoContentType: true,
      isAvailable: true,
    },
  });

  if (!row) {
    return null;
  }

  // `toFixed(2)` fixa as duas casas sem passar por float em momento nenhum.
  return {
    id: row.id,
    name: row.name,
    usageFee: row.usageFee.toFixed(2),
    imageUrl: row.imageUrl,
    photoPath: signedCommonAreaPhotoPath(condominiumId, row),
    isAvailable: row.isAvailable,
  };
}

/** `true` quando o horário daquele dia já começou, no relógio do servidor. */
function slotHasStarted(
  date: string,
  startMinute: number,
  today: string,
  nowMinutes: number
): boolean {
  if (date < today) {
    return true;
  }
  return date === today && startMinute <= nowMinutes;
}

/** Os dias do mês que dá para reservar: a interseção do mês com a janela de hoje até hoje + 60. */
function bookableDaysOf(year: number, month: number, today: string): string[] {
  const monthFirst = buildISODate(year, month, 1);
  const monthLast = buildISODate(year, month, daysInMonth(year, month));
  const windowLast = addDaysISO(today, BOOKING_WINDOW_DAYS);

  // Comparação de text funciona porque `YYYY-MM-DD` ordena igual à data que representa.
  const first = today > monthFirst ? today : monthFirst;
  const last = windowLast < monthLast ? windowLast : monthLast;

  const days: string[] = [];
  for (let day = first; day <= last; day = addDaysISO(day, 1)) {
    days.push(day);
  }
  return days;
}

/**
 * Um mês de disponibilidade de um local, para quem tem vínculo no condomínio.
 *
 * **Quem calcula é o servidor, não o app** — decidir o que está livre exige saber a hora, e o
 * relógio do servidor é o que vai aceitar ou recusar a reserva. Se o aparelho decidisse, um relógio
 * errado ofereceria um horário que o servidor depois recusa, e a pessoa leria isso como app quebrado
 * (research R-004).
 *
 * `slots` traz o que está LIVRE, não o que está ocupado: assim o app não subtrai nada e nunca
 * guarda uma segunda cópia da grade para isso. E a resposta traz o local junto, para um pedido
 * pintar a tela inteira (research R-009).
 *
 * `booked` é a outra metade, para a pessoa ver o dia inteiro do local: os horários reservados, por
 * quem quer que seja. Vai SÓ o horário — sem nome, sem id de reserva e sem dizer quais são de quem
 * pediu —, então a lista não serve para descobrir quem reservou nem para cancelar nada. Inclui o
 * horário de hoje que já começou: a reserva existe, e o dia que a seção mostra é o dia todo.
 *
 * Dia passado e dia além da janela simplesmente NÃO VÊM. É a mesma forma para os dois casos, então a
 * regra do app é uma só: sem item, sem bolinha.
 */
export async function listAvailability(
  condominiumId: string,
  commonAreaId: string,
  requesterId: string,
  requested: { year: number; month: number }
): Promise<Availability> {
  const membership = await membershipOf(condominiumId, requesterId);
  if (!membership) {
    throw new ReservationError("commonArea");
  }

  const canManage = managesCondominium(membership.role);

  // Local desligado: para o administrador a tela abre — é nela que ele religa. Para os outros é a
  // mesma recusa de um local que não existe, como era antes de o catálogo passar a mostrá-lo.
  const commonArea = await commonAreaOf(condominiumId, commonAreaId);
  if (!commonArea || (!commonArea.isAvailable && !canManage)) {
    throw new ReservationError("commonArea");
  }

  const monthLabel = `${requested.year}-${String(requested.month).padStart(2, "0")}`;
  const today = todayLocalISODate();
  const days = bookableDaysOf(requested.year, requested.month, today);

  if (days.length === 0) {
    // Mês inteiro no passado, ou inteiro depois da janela. Nenhum dia leva bolinha.
    return { commonArea: commonArea, canManage: canManage, month: monthLabel, days: [] };
  }

  const taken = await prisma.reservation.findMany({
    where: {
      commonAreaId: commonAreaId,
      date: {
        gte: toDateColumn(days[0]!),
        lte: toDateColumn(days[days.length - 1]!),
      },
    },
    select: { id: true, date: true, startMinute: true, reservedById: true },
  });

  const bySlot = new Map<string, { id: string; reservedById: string }>();
  for (const row of taken) {
    bySlot.set(slotKey(fromDateColumn(row.date), row.startMinute), {
      id: row.id,
      reservedById: row.reservedById,
    });
  }

  const nowMinutes = minutesSinceMidnightLocal();

  return {
    commonArea: commonArea,
    canManage: canManage,
    month: monthLabel,
    days: days.map((date): DayAvailability => {
      // Os horários do dia que ainda não começaram: é sobre eles que tudo abaixo decide.
      const ahead = SLOT_START_MINUTES.filter(
        (startMinute) => !slotHasStarted(date, startMinute, today, nowMinutes)
      );

      const day: DayAvailability = {
        date: date,
        // Pela ordem da grade, que já é a do relógio.
        booked: SLOT_START_MINUTES.flatMap((startMinute): BookedSlot[] => {
          const reservation = bySlot.get(slotKey(date, startMinute));
          if (!reservation) {
            return [];
          }

          const slot: BookedSlot = {
            startMinute: startMinute,
            endMinute: endMinuteOf(startMinute),
          };

          // O id só vai junto quando esta lista é o caminho do cancelamento: o administrador, a
          // reserva de OUTRA pessoa, e um horário que ainda não começou. A dele mesmo continua
          // sendo cancelada pelo horário `held` — uma reserva, um lugar só (research R-003).
          if (
            canManage &&
            reservation.reservedById !== requesterId &&
            !slotHasStarted(date, startMinute, today, nowMinutes)
          ) {
            slot.reservationId = reservation.id;
          }

          return [slot];
        }),
        // Horário de hoje que já começou não é oferecido nem como livre nem como liberável: não dá
        // para reservar o passado, e o FR-027 também não deixa cancelar o que já começou.
        slots: ahead.flatMap((startMinute): AvailableSlot[] => {
          const reservation = bySlot.get(slotKey(date, startMinute));
          if (!reservation) {
            // Local desligado não oferece horário a ninguém, nem ao administrador.
            return commonArea.isAvailable
              ? [
                  {
                    startMinute: startMinute,
                    endMinute: endMinuteOf(startMinute),
                    status: "open",
                  },
                ]
              : [];
          }

          // Ocupado. Só aparece aqui se é de quem pediu. Ocupado por outra pessoa fica AUSENTE
          // desta lista (FR-012) e aparece só em `booked`; em nenhum caso a resposta diz de quem é.
          return reservation.reservedById === requesterId
            ? [
                {
                  startMinute: startMinute,
                  endMinute: endMinuteOf(startMinute),
                  status: "held",
                  reservationId: reservation.id,
                },
              ]
            : [];
        }),
      };

      if (canManage) {
        day.wholeDayHeld =
          ahead.length > 0 &&
          ahead.every(
            (startMinute) =>
              bySlot.get(slotKey(date, startMinute))?.reservedById === requesterId
          );
      }

      return day;
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Minhas reservas                                                            */
/* -------------------------------------------------------------------------- */

/**
 * As reservas de quem pediu neste condomínio que ainda não terminaram, da mais próxima para a mais
 * distante.
 *
 * Só as de quem pediu, inclusive para o administrador: ele pode LIBERAR a reserva de qualquer
 * pessoa, mas isso acontece pelas reservas do dia (`booked`) da disponibilidade. Esta lista responde
 * "o que eu reservei", e por isso não diz nome de ninguém.
 *
 * A reserva de hoje fica até o horário TERMINAR, e não até começar: quem está usando o salão agora
 * ainda tem aquela reserva. Local que ficou indisponível depois continua aparecendo — a reserva
 * existe, e sumir com ela da lista seria esconder um compromisso.
 */
export async function listOwnReservations(
  condominiumId: string,
  requesterId: string
): Promise<OwnReservation[]> {
  const membership = await membershipOf(condominiumId, requesterId);
  if (!membership) {
    throw new ReservationError("condominium");
  }

  const today = todayLocalISODate();
  const rows = await prisma.reservation.findMany({
    where: {
      condominiumId: condominiumId,
      reservedById: requesterId,
      date: { gte: toDateColumn(today) },
    },
    select: {
      id: true,
      date: true,
      startMinute: true,
      endMinute: true,
      commonArea: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { startMinute: "asc" }],
  });

  const nowMinutes = minutesSinceMidnightLocal();

  return rows
    .map((row) => ({
      id: row.id,
      commonArea: row.commonArea,
      date: fromDateColumn(row.date),
      startMinute: row.startMinute,
      endMinute: row.endMinute,
    }))
    .filter((row) => row.date > today || row.endMinute > nowMinutes);
}

/* -------------------------------------------------------------------------- */
/* Reservar                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Grava uma reserva já validada e devolve o registro com o `id` gerado pelo banco.
 *
 * **Não há conferência de "o horário está livre?" aqui, de propósito.** Dois pedidos simultâneos
 * passariam pela conferência e os dois gravariam; quem garante é o índice único, e quem perde a
 * corrida recebe a violação (research R-001). A tradução dessa violação chega na US3.
 *
 * Quem reserva vem do token, nunca do body (FR-015), e o condomínio vem do caminho da rota — o body
 * não escolhe nenhum dos dois. A data entra como meia-noite UTC para a coluna `DATE` guardar
 * exatamente o dia informado.
 */
export async function bookSlot(
  condominiumId: string,
  commonAreaId: string,
  reservedById: string,
  data: NewReservation
): Promise<Reservation> {
  const membership = await membershipOf(condominiumId, reservedById);
  if (!membership) {
    throw new ReservationError("commonArea");
  }

  const commonArea = await commonAreaOf(condominiumId, commonAreaId);
  if (!commonArea) {
    throw new ReservationError("commonArea");
  }

  // Local desligado não aceita reserva de ninguém. A diferença é só o que cada um ouve: o
  // administrador, que pode religá-lo, ouve o motivo; para os outros é a MESMA recusa de local
  // inexistente (FR-017), porque a tela de reserva dele nunca abriu para eles.
  if (!commonArea.isAvailable) {
    throw new ReservationError(
      managesCondominium(membership.role) ? "unavailable" : "commonArea"
    );
  }

  let row;
  try {
    row = await prisma.reservation.create({
      data: {
        commonAreaId: commonAreaId,
        reservedById: reservedById,
        condominiumId: condominiumId,
        date: toDateColumn(data.date),
        startMinute: data.startMinute,
        endMinute: endMinuteOf(data.startMinute),
      },
      select: {
        id: true,
        commonAreaId: true,
        date: true,
        startMinute: true,
        endMinute: true,
      },
    });
  } catch (error) {
    // `P2002` é violação de índice único, e aqui só existe um índice único a violar: o horário foi
    // reservado entre o momento em que esta pessoa olhou a lista e o momento em que confirmou.
    // Quem decidiu quem fica com ele foi o banco, não este código (research R-001).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReservationError("taken");
    }
    throw error;
  }

  return {
    id: row.id,
    commonAreaId: row.commonAreaId,
    date: fromDateColumn(row.date),
    startMinute: row.startMinute,
    endMinute: row.endMinute,
  };
}

/* -------------------------------------------------------------------------- */
/* Cancelar                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Libera uma reserva. O registro é REMOVIDO: ele não tem estado, então a existência da linha é a
 * reserva e cancelar é apagá-la (FR-024). Não fica histórico, e isso está registrado nas premissas
 * da spec em vez de ficar implícito.
 *
 * A ordem das recusas é a do ADR 0010, e importa:
 *
 * 1. Sem vínculo → 404. Quem é de fora não descobre que a reserva existe.
 * 2. Reserva inexistente, ou de outro condomínio → o MESMO 404.
 * 3. Tem vínculo mas não é quem reservou nem administrador → 403. A esta pessoa o sistema diz que
 *    recusou, porque ela pertence ao lugar.
 * 4. Só então o horário já começado → 409.
 *
 * O 3 vem antes do 4 de propósito: quem não pode cancelar não deveria nem descobrir se o horário
 * já passou.
 *
 * **Diferente de `removeVisitor`, esta operação NÃO é idempotente.** Apagar o que já não existe
 * responde 404, não 204. Dizer "já foi apagado" a quem nunca teve direito sobre aquele id vazaria
 * que o id existiu.
 */
export async function cancelReservation(
  condominiumId: string,
  reservationId: string,
  requesterId: string
): Promise<void> {
  const membership = await membershipOf(condominiumId, requesterId);
  if (!membership) {
    throw new ReservationError("reservation");
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, condominiumId: condominiumId },
    select: { id: true, reservedById: true, date: true, startMinute: true },
  });

  if (!reservation) {
    throw new ReservationError("reservation");
  }

  const canRelease =
    reservation.reservedById === requesterId || managesCondominium(membership.role);
  if (!canRelease) {
    throw new ReservationError("forbidden");
  }

  if (
    slotHasStarted(
      fromDateColumn(reservation.date),
      reservation.startMinute,
      todayLocalISODate(),
      minutesSinceMidnightLocal()
    )
  ) {
    throw new ReservationError("started");
  }

  await prisma.reservation.delete({ where: { id: reservation.id } });
}

/* -------------------------------------------------------------------------- */
/* O dia inteiro                                                              */
/* -------------------------------------------------------------------------- */

/** As recusas comuns às duas operações de dia inteiro, na ordem do ADR 0010. */
async function requireAdministrator(
  condominiumId: string,
  requesterId: string
): Promise<void> {
  const membership = await membershipOf(condominiumId, requesterId);
  if (!membership) {
    throw new ReservationError("commonArea");
  }
  // Antes de o local ser procurado: quem não pode fazer isto não descobre se o id existe.
  if (!managesCondominium(membership.role)) {
    throw new ReservationError("forbidden");
  }
}

/**
 * Reserva, para o administrador, todos os horários do dia que ainda não começaram e que ele ainda
 * não tem. **O dia todo ou nada** (FR-026a).
 *
 * São reservas comuns: não existe "dia bloqueado" em lugar nenhum do banco, e por isso nenhuma
 * consulta de disponibilidade precisou aprender uma segunda forma de um horário estar ocupado.
 *
 * **A leitura antes de gravar é para a mensagem, não para a garantia.** Ela diz ao administrador
 * que há reservas de outra pessoa no dia. Quem garante que nunca sobra meio dia é o índice único do
 * ADR 0011 somado a um fato do banco: o `createMany` abaixo é UM comando. Se alguém reservar um
 * daqueles horários entre a leitura e a gravação, o comando viola o índice e o Postgres descarta
 * TODAS as linhas dele, não só a que colidiu. Não há sequência de oito gravações para parar na
 * quinta, e não há transação para esquecer de abrir (research R-004).
 *
 * É idempotente: quem já tem o dia inteiro pede de novo e nada muda.
 */
export async function takeWholeDay(
  condominiumId: string,
  commonAreaId: string,
  requesterId: string,
  date: string
): Promise<void> {
  await requireAdministrator(condominiumId, requesterId);

  const commonArea = await commonAreaOf(condominiumId, commonAreaId);
  if (!commonArea) {
    throw new ReservationError("commonArea");
  }
  if (!commonArea.isAvailable) {
    throw new ReservationError("unavailable");
  }

  const today = todayLocalISODate();
  const nowMinutes = minutesSinceMidnightLocal();
  const ahead = SLOT_START_MINUTES.filter(
    (startMinute) => !slotHasStarted(date, startMinute, today, nowMinutes)
  );

  if (ahead.length === 0) {
    throw new ReservationError("nothingLeft");
  }

  const existing = await prisma.reservation.findMany({
    where: { commonAreaId: commonAreaId, date: toDateColumn(date) },
    select: { startMinute: true, reservedById: true },
  });
  const holderOf = new Map(
    existing.map((row) => [row.startMinute, row.reservedById])
  );

  // Horário de outra pessoa que JÁ COMEÇOU não entra na conta: ninguém pode cancelá-lo, e a ação
  // só fala dos horários que ainda estão à frente.
  if (
    ahead.some((startMinute) => {
      const holder = holderOf.get(startMinute);
      return holder !== undefined && holder !== requesterId;
    })
  ) {
    throw new ReservationError("dayTaken");
  }

  const missing = ahead.filter((startMinute) => !holderOf.has(startMinute));
  if (missing.length === 0) {
    return;
  }

  try {
    await prisma.reservation.createMany({
      data: missing.map((startMinute) => ({
        commonAreaId: commonAreaId,
        reservedById: requesterId,
        condominiumId: condominiumId,
        date: toDateColumn(date),
        startMinute: startMinute,
        endMinute: endMinuteOf(startMinute),
      })),
    });
  } catch (error) {
    // Alguém reservou um dos horários no meio do caminho. O comando inteiro foi desfeito pelo
    // banco, então a resposta é a mesma da leitura: há reservas neste dia.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReservationError("dayTaken");
    }
    throw error;
  }
}

/**
 * Libera as reservas do próprio administrador naquele dia e local cujo horário ainda não começou.
 *
 * Nunca toca na reserva de outra pessoa, e nunca no que já começou — pelo mesmo motivo que
 * `cancelReservation` recusa: não libera nada e apagaria o único registro de que o local foi
 * usado. Funciona com o local desligado: cancelar nunca depende de disponibilidade (FR-007).
 *
 * É idempotente, e pode ser: diferente de `cancelReservation`, aqui não há um id cuja existência
 * a resposta pudesse vazar.
 */
export async function releaseWholeDay(
  condominiumId: string,
  commonAreaId: string,
  requesterId: string,
  date: string
): Promise<void> {
  await requireAdministrator(condominiumId, requesterId);

  const commonArea = await commonAreaOf(condominiumId, commonAreaId);
  if (!commonArea) {
    throw new ReservationError("commonArea");
  }

  const today = todayLocalISODate();
  if (date < today) {
    return;
  }

  await prisma.reservation.deleteMany({
    where: {
      commonAreaId: commonAreaId,
      reservedById: requesterId,
      date: toDateColumn(date),
      // Num dia futuro todo horário está à frente; hoje, só os que ainda não começaram.
      ...(date === today
        ? { startMinute: { gt: minutesSinceMidnightLocal() } }
        : {}),
    },
  });
}
