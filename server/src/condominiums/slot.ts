/**
 * A grade fixa de horários reserváveis.
 *
 * Funções puras: não conhecem HTTP nem Prisma. Por isso podem ser usadas pelo dto, pelo service e
 * por um script.
 *
 * ESTE ARQUIVO TEM UM ESPELHO: `mobile/features/reservations/domain/slot.ts` declara a MESMA grade,
 * de propósito (research R-006). Não existe pacote compartilhado no projeto, e criar um para uma
 * lista congelada de oito inteiros seria mudança de build em troca de apagar quatro linhas. Mudou a
 * grade aqui? Mude lá também — e mude a CHECK da migration, que é a terceira cópia.
 *
 * A terceira cópia é diferente em natureza, não repetição do mesmo: estes módulos decidem o que
 * OFERECER, a CHECK `reservations_slot_grid_check` decide o que pode EXISTIR.
 */

/**
 * Os oito inícios possíveis, em minutos desde a meia-noite, no relógio do condomínio.
 * `420` é 07:00 e `1260` é 21:00 — o último horário termina às 23:00.
 *
 * Minutos desde a meia-noite, e não um instante no tempo, porque isto é hora de parede civil: um
 * inteiro não muda de significado com fuso nem com horário de verão (feature 005, research R-001).
 */
export const SLOT_START_MINUTES: readonly number[] = [
  420, 540, 660, 780, 900, 1020, 1140, 1260,
];

/** Todo horário tem duas horas. O fim é sempre o início mais isto (FR-002, FR-004). */
export const SLOT_LENGTH_MINUTES = 120;

/** Até quantos dias à frente se pode reservar, contados em dias inteiros a partir de hoje (FR-021). */
export const BOOKING_WINDOW_DAYS = 60;

/** `true` quando o minuto é um dos oito inícios da grade. */
export function isSlotStart(minute: number): boolean {
  return SLOT_START_MINUTES.includes(minute);
}

/** O fim do horário que começa em `startMinute`. */
export function endMinuteOf(startMinute: number): number {
  return startMinute + SLOT_LENGTH_MINUTES;
}
