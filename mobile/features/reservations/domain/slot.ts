/**
 * A grade fixa de horários, e a disponibilidade de um mês como o servidor a entrega.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * ESTE ARQUIVO TEM UM ESPELHO: `server/src/condominiums/slot.ts` declara a MESMA grade, de
 * propósito (research R-006). Mudou a grade aqui? Mude lá também — e a CHECK da migration.
 *
 * Não há funções de validação, e isso é diferente da feature de visitantes de propósito: esta tela
 * não tem campo livre. A pessoa escolhe entre oito botões, então não há nada digitado para validar.
 * O servidor confere tudo de novo (research R-003) porque a contenção da tela não é garantia.
 */

import { addDays } from "@/shared/lib/calendar";

/** Os oito inícios possíveis, em minutos desde a meia-noite. `420` é 07:00. */
export const SLOT_START_MINUTES: readonly number[] = [
  420, 540, 660, 780, 900, 1020, 1140, 1260,
];

/** Todo horário tem duas horas. */
export const SLOT_LENGTH_MINUTES = 120;

/** Até quantos dias à frente se pode reservar, em dias inteiros a partir de hoje. */
export const BOOKING_WINDOW_DAYS = 60;

/**
 * `open` — livre, confirmar reserva.
 * `held` — ocupado E quem pediu pode cancelar. É o que torna o cancelamento alcançável (FR-012a).
 *
 * Horário ocupado por OUTRA pessoa não chega em lista nenhuma: não vem no JSON (FR-012).
 */
export type SlotStatus = "open" | "held";

export interface Slot {
  startMinute: number;
  endMinute: number;
  status: SlotStatus;
  /** Presente exatamente quando `status` é `"held"`: a reserva que esta pessoa pode cancelar. */
  reservationId?: string;
}

export interface DayAvailability {
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
  /** Só o que dá para agir. Lista vazia é dia reservável sem nada livre — a bolinha vermelha. */
  slots: Slot[];
}

/** O local sendo reservado, como vem junto da disponibilidade (research R-009). */
export interface BookedCommonArea {
  id: string;
  name: string;
  /** Dinheiro como TEXTO, com duas casas. Quem exibe usa `formatCurrency`. */
  usageFee: string;
  /** Endereço https da foto que abre a tela, ou `null` — a tela mostra o placeholder. */
  imageUrl: string | null;
}

export interface Availability {
  commonArea: BookedCommonArea;
  /** `YYYY-MM` do mês pedido. */
  month: string;
  /**
   * Só os dias RESERVÁVEIS do mês. Dia passado e dia além da janela não vêm — e é por isso que a
   * regra da tela é uma só: sem item, sem bolinha.
   */
  days: DayAvailability[];
}

/* -------------------------------------------------------------------------- */
/* Apresentação da grade: não pertence a componente nenhum.                   */
/* -------------------------------------------------------------------------- */

function twoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Minutos desde a meia-noite como `07:00`. */
export function minuteLabel(minute: number): string {
  return `${twoDigits(Math.floor(minute / 60))}:${twoDigits(minute % 60)}`;
}

/** O horário como `07:00 – 09:00`. Só precisa do início e do fim, então serve a uma reserva também. */
export function slotLabel(slot: {
  startMinute: number;
  endMinute: number;
}): string {
  return `${minuteLabel(slot.startMinute)} – ${minuteLabel(slot.endMinute)}`;
}

/**
 * Último dia reservável, `YYYY-MM-DD`. A navegação entre meses usa isto para não oferecer um mês
 * inteiro fora da janela (FR-021a); dentro de um mês, quem decide é a resposta do servidor — dia
 * ausente é dia não reservável, sem a tela ter de recalcular nada.
 *
 * Recebe hoje como parâmetro em vez de chamar `todayISODate()` por dentro: função pura é função que
 * dá para conferir sem esperar a virada do dia.
 */
export function lastBookableDate(todayISO: string): string {
  return addDays(todayISO, BOOKING_WINDOW_DAYS);
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Princípio IV).            */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSlot(value: unknown): value is Slot {
  if (!isObject(value)) {
    return false;
  }
  if (value.status !== "open" && value.status !== "held") {
    return false;
  }
  // `reservationId` existe exatamente nos ocupados: é o que o DELETE endereça.
  if (value.status === "held" && typeof value.reservationId !== "string") {
    return false;
  }
  return (
    typeof value.startMinute === "number" && typeof value.endMinute === "number"
  );
}

function isDayAvailability(value: unknown): value is DayAvailability {
  return (
    isObject(value) &&
    typeof value.date === "string" &&
    Array.isArray(value.slots) &&
    value.slots.every(isSlot)
  );
}

function isBookedCommonArea(value: unknown): value is BookedCommonArea {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.usageFee === "string" &&
    (value.imageUrl === null || typeof value.imageUrl === "string")
  );
}

/** `true` quando o value tem exatamente a forma da disponibilidade de um mês. */
export function isAvailability(value: unknown): value is Availability {
  if (!isObject(value)) {
    return false;
  }
  return (
    isBookedCommonArea(value.commonArea) &&
    typeof value.month === "string" &&
    Array.isArray(value.days) &&
    value.days.every(isDayAvailability)
  );
}
