import {
  addDaysISO,
  isValidISODate,
  todayLocalISODate,
} from "../lib/calendarDate.ts";
import { BOOKING_WINDOW_DAYS, isSlotStart } from "./slot.ts";

/**
 * Validação da entrada das rotas de reserva.
 *
 * Só valida: não escolhe status code, não lê banco e não aplica regra de permissão. Quem traduz em
 * HTTP é o controller; quem decide quem pode o quê é o service (constituição, seção Backend).
 *
 * Não há espelho no app para esta validação, e isso é diferente da feature de visitantes de
 * propósito: a tela de reserva não tem campo livre. A pessoa escolhe um dia no calendário e um
 * horário entre oito botões, então não há nada digitado para o app validar antes de enviar. O que
 * existe aqui é a confirmação de que o pedido chegou bem formado — inclusive de um cliente que não
 * seja a tela (research R-003).
 */

/** Mês pedido para a disponibilidade. `month` é 1-12, não 0-11. */
export interface RequestedMonth {
  year: number;
  month: number;
}

export interface MonthErrors {
  month?: string;
}

export type MonthValidation =
  | { ok: true; data: RequestedMonth }
  | { ok: false; errors: MonthErrors };

const MESSAGE_BAD_MONTH = "Select a month.";

/** Limites largos: o que recusa data distante é a janela de reserva, não isto. */
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/**
 * Valida o `month` da query string, recebido como `unknown` (Princípio IV).
 *
 * Ausente é válido e significa o mês corrente — quem resolve isso é o controller, que conhece a
 * requisição; aqui só o que foi informado é verificado.
 */
export function validateMonth(value: unknown): MonthValidation {
  const text = typeof value === "string" ? value.trim() : "";

  const parts = /^(\d{4})-(\d{2})$/.exec(text);
  if (!parts) {
    return { ok: false, errors: { month: MESSAGE_BAD_MONTH } };
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);

  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12) {
    return { ok: false, errors: { month: MESSAGE_BAD_MONTH } };
  }

  return { ok: true, data: { year, month } };
}


/* -------------------------------------------------------------------------- */
/* Nova reserva                                                               */
/* -------------------------------------------------------------------------- */

export interface NewReservationInput {
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
  startMinute: number;
}

export interface ReservationErrors {
  date?: string;
  startMinute?: string;
}

export type ReservationValidation =
  | { ok: true; data: NewReservationInput }
  | { ok: false; errors: ReservationErrors };

const MESSAGE_BAD_DATE = "Pick a real date.";
const MESSAGE_PAST_DATE = "Pick a date from today on.";
const MESSAGE_BEYOND_WINDOW = `Pick a date within the next ${BOOKING_WINDOW_DAYS} days.`;
const MESSAGE_BAD_SLOT = "Select one of the available times.";

function asObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

/**
 * Valida o body de uma nova reserva, recebido como `unknown` (Princípio IV).
 *
 * `endMinute` NÃO é aceito: ele é `startMinute + 120` por definição, e recebê-lo criaria uma forma
 * de discordar da grade. `reservedById` também não: identidade vem do token (FR-015).
 *
 * A janela de 60 dias é conferida aqui, e não por uma CHECK no banco, porque depende de que dia é
 * hoje — e uma CHECK só chama função imutável (research R-003). Recusa com erro de CAMPO, não com
 * conflito: o pedido já estava errado quando foi escrito, não foi atropelado por outro.
 */
export function validateNewReservation(
  body: unknown,
  today: string = todayLocalISODate()
): ReservationValidation {
  const data = asObject(body);
  const date = typeof data.date === "string" ? data.date.trim() : "";
  const startMinute = data.startMinute;

  const errors: ReservationErrors = {};

  if (!isValidISODate(date)) {
    errors.date = MESSAGE_BAD_DATE;
  } else if (date < today) {
    // `YYYY-MM-DD` ordena como text igual à data que representa.
    errors.date = MESSAGE_PAST_DATE;
  } else if (date > addDaysISO(today, BOOKING_WINDOW_DAYS)) {
    errors.date = MESSAGE_BEYOND_WINDOW;
  }

  if (typeof startMinute !== "number" || !isSlotStart(startMinute)) {
    errors.startMinute = MESSAGE_BAD_SLOT;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { date, startMinute: startMinute as number } };
}
