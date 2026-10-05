/**
 * Dias de calendário em `YYYY-MM-DD`: validação, aritmética e a borda do banco.
 *
 * Funções puras, sem Prisma e sem HTTP.
 *
 * **Duas coisas diferentes vivem aqui, e misturá-las é o bug clássico:**
 *
 * 1. *A borda do banco* — `toDateColumn` e `fromDateColumn` — é **UTC**, sempre. Um dia de calendário
 *    não é um instante no tempo; ler uma coluna `DATE` no fuso local desloca o dia para quem está a
 *    oeste de UTC. É a regra do projeto: converta na borda, em UTC.
 *
 * 2. *O relógio* — `todayLocalISODate` e `minutesSinceMidnightLocal` — é **local**, porque responde
 *    "que horas são no condomínio". Os horários reservados são hora de parede civil do condomínio, e
 *    decidir se o horário das 15:00 já passou em UTC erraria por três horas no Brasil.
 *
 *    Isto assume que o servidor roda no fuso do condomínio. É verdade hoje (um fuso só) e é a
 *    limitação a trocar quando houver condomínio em outro fuso: aí o fuso passa a ser coluna de
 *    `condominiums` e estas duas funções recebem-no como parâmetro.
 *
 * `visitors/visitor.dto.ts` e `condominiums/notice.dto.ts` carregam cópias antigas de
 * `isValidISODate`, de quando este arquivo não existia. Quem mexer nelas em seguida deve apontá-las
 * para cá em vez de manter uma terceira.
 */

/** `true` quando o text é um dia de calendário real no formato `YYYY-MM-DD`. */
export function isValidISODate(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) {
    return false;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  // Dia 0 do mês seguinte é o último dia do mês corrente.
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDayOfMonth;
}

function twoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Monta `YYYY-MM-DD` a partir de ano, mês (1-12) e dia. */
export function buildISODate(year: number, month: number, day: number): string {
  return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
}

/** Quantos dias tem o mês (1-12) do ano. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/* -------------------------------------------------------------------------- */
/* Aritmética de dias: UTC, porque é contagem de dias e não de horas.         */
/* -------------------------------------------------------------------------- */

/** Soma dias a um dia de calendário e devolve outro dia de calendário. */
export function addDaysISO(isoDate: string, days: number): string {
  const reference = new Date(`${isoDate}T00:00:00.000Z`);
  reference.setUTCDate(reference.getUTCDate() + days);
  return buildISODate(
    reference.getUTCFullYear(),
    reference.getUTCMonth() + 1,
    reference.getUTCDate()
  );
}

/* -------------------------------------------------------------------------- */
/* O relógio do condomínio: LOCAL. Ver o item 2 do comentário do arquivo.     */
/* -------------------------------------------------------------------------- */

/** Hoje no relógio do condomínio, como dia de calendário. */
export function todayLocalISODate(reference: Date = new Date()): string {
  return buildISODate(
    reference.getFullYear(),
    reference.getMonth() + 1,
    reference.getDate()
  );
}

/**
 * Minutos desde a meia-noite no relógio do condomínio.
 * É o que decide se um horário de hoje já passou (FR-008, FR-013).
 */
export function minutesSinceMidnightLocal(reference: Date = new Date()): number {
  return reference.getHours() * 60 + reference.getMinutes();
}

/* -------------------------------------------------------------------------- */
/* A borda do banco: UTC. Ver o item 1 do comentário do arquivo.              */
/* -------------------------------------------------------------------------- */

/** O `Date` que a coluna `DATE` deve receber para guardar exatamente este dia. */
export function toDateColumn(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** O dia que a coluna `DATE` guardou, sem deslocamento de fuso. */
export function fromDateColumn(value: Date): string {
  return value.toISOString().slice(0, 10);
}
