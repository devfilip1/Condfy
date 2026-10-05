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
import { BOOKING_WINDOW_DAYS, SLOT_START_MINUTES, endMinuteOf } from "./slot.ts";

/**
 * Regras e acesso a dados das reservas de áreas comuns.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * Duas garantias NÃO são deste módulo e não precisam ser conferidas aqui:
 *
 * - **Reserva dupla é impossível** pelo índice único `(common_area_id, date, start_minute)`. Não há
 *   "confere se está livre e depois grava" em lugar nenhum deste arquivo, de propósito: dois pedidos
 *   simultâneos passariam pela conferência e os dois gravariam (research R-001). Quem perde a corrida
 *   recebe a violação do índice, que `bookSlot` traduz.
 * - **Local e vínculo são do mesmo condomínio da reserva**, pelas duas FKs compostas de
 *   `reservations` (feature 005, research R-002).
 *
 * O que É deste módulo é a janela de 60 dias, e isso é assimétrico de propósito: uma CHECK só chama
 * função imutável, e "hoje" é o oposto disso (research R-003).
 */

/* -------------------------------------------------------------------------- */
/* O contrato                                                                 */
/* -------------------------------------------------------------------------- */

/** `open` — livre. `held` — ocupado E quem pediu pode cancelar (FR-012a). */
export type SlotStatus = "open" | "held";

export interface AvailableSlot {
  startMinute: number;
  endMinute: number;
  status: SlotStatus;
  /** Presente exatamente quando `status` é `"held"`. É o que o DELETE endereça. */
  reservationId?: string;
}

export interface DayAvailability {
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
  /** Só o que quem pediu pode reservar ou liberar. Vazia é dia cheio. */
  slots: AvailableSlot[];
}

export interface Availability {
  commonArea: { id: string; name: string; usageFee: string };
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

/** Dados já validados de uma nova reserva. Quem reserva vem do token, nunca daqui. */
export interface NewReservation {
  date: string;
  startMinute: number;
}

/**
 * Motivo da recusa que o controller traduz em status code.
 *
 * - `commonArea` → 404. Local inexistente, indisponível, de outro condomínio, ou quem pediu não tem
 *   vínculo: a MESMA resposta para os quatro, senão daria para mapear quais locais existem.
 * - `reservation` → 404. O mesmo, para uma reserva.
 * - `forbidden` → 403. Tem vínculo, mas não é quem reservou nem administrador (ADR 0010).
 * - `taken` → 409. Perdeu a corrida: o horário foi reservado no meio do caminho.
 * - `started` → 409. O horário já começou; não há o que liberar.
 */
export type ReservationFailure =
  | "commonArea"
  | "reservation"
  | "forbidden"
  | "taken"
  | "started";

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
 * O local, se ele existe, está disponível e é deste condomínio. `null` nos outros casos — e os
 * outros casos recebem todos a mesma recusa de quem não tem vínculo.
 */
async function availableCommonArea(
  condominiumId: string,
  commonAreaId: string
): Promise<{ id: string; name: string; usageFee: string } | null> {
  const row = await prisma.commonArea.findFirst({
    where: { id: commonAreaId, condominiumId: condominiumId, isAvailable: true },
    select: { id: true, name: true, usageFee: true },
  });

  if (!row) {
    return null;
  }

  // `toFixed(2)` fixa as duas casas sem passar por float em momento nenhum.
  return { id: row.id, name: row.name, usageFee: row.usageFee.toFixed(2) };
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
 * A resposta traz o que está LIVRE, não o que está ocupado: assim o app não subtrai nada e nunca
 * guarda uma segunda cópia da grade para isso. E traz o local junto, para um pedido pintar a tela
 * inteira (research R-009).
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

  const commonArea = await availableCommonArea(condominiumId, commonAreaId);
  if (!commonArea) {
    throw new ReservationError("commonArea");
  }

  const monthLabel = `${requested.year}-${String(requested.month).padStart(2, "0")}`;
  const today = todayLocalISODate();
  const days = bookableDaysOf(requested.year, requested.month, today);

  if (days.length === 0) {
    // Mês inteiro no passado, ou inteiro depois da janela. Nenhum dia leva bolinha.
    return { commonArea: commonArea, month: monthLabel, days: [] };
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
    month: monthLabel,
    days: days.map((date) => ({
      date: date,
      slots: SLOT_START_MINUTES.flatMap((startMinute): AvailableSlot[] => {
        // Horário de hoje que já começou não é oferecido nem como livre nem como liberável: não dá
        // para reservar o passado, e o FR-027 também não deixa cancelar o que já começou.
        if (date === today && startMinute <= nowMinutes) {
          return [];
        }

        const reservation = bySlot.get(slotKey(date, startMinute));
        if (!reservation) {
          return [
            {
              startMinute: startMinute,
              endMinute: endMinuteOf(startMinute),
              status: "open",
            },
          ];
        }

        // Ocupado. Só aparece se esta pessoa pode liberar — quem reservou, ou o administrador do
        // condomínio. Ocupado por outra pessoa fica AUSENTE da lista (FR-012), e em nenhum caso a
        // resposta diz de quem é.
        const canRelease =
          reservation.reservedById === requesterId || membership.role === "admin";

        return canRelease
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
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Reservar                                                                   */
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

  // Local indisponível recebe a MESMA recusa de local inexistente (FR-017): ele saiu do catálogo,
  // então para quem pede ele não está lá.
  const commonArea = await availableCommonArea(condominiumId, commonAreaId);
  if (!commonArea) {
    throw new ReservationError("commonArea");
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

/** `true` quando o horário da reserva já começou — não há mais o que liberar. */
function hasStarted(date: string, startMinute: number, today: string): boolean {
  if (date < today) {
    return true;
  }
  return date === today && startMinute <= minutesSinceMidnightLocal();
}

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
    reservation.reservedById === requesterId || membership.role === "admin";
  if (!canRelease) {
    throw new ReservationError("forbidden");
  }

  if (
    hasStarted(
      fromDateColumn(reservation.date),
      reservation.startMinute,
      todayLocalISODate()
    )
  ) {
    throw new ReservationError("started");
  }

  await prisma.reservation.delete({ where: { id: reservation.id } });
}
