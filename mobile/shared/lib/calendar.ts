/**
 * Datas de calendário no formato ISO `YYYY-MM-DD`: validação, conversão para exibição
 * e a grade mensal usada pelo seletor de data.
 *
 * Funções puras, sem React: não pertencem a nenhuma feature e podem ser usadas por todas.
 */

/** Verifica se o text é uma data de calendário real no formato `YYYY-MM-DD`. */
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

  // Dia 0 do mês seguinte é o último day do mês corrente.
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  return day <= lastDayOfMonth;
}

/**
 * Converte a data digitada (`DD/MM/AAAA`) para o formato ISO usado pela entidade.
 * Quando o text não tem o formato esperado, devolve o próprio text sem espaços das pontas,
 * para que a validação distinga "field empty" de "data inválida".
 */
export function toISODate(typedText: string): string {
  const text = typedText.trim();
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!parts) {
    return text;
  }
  return `${parts[3]}-${parts[2]}-${parts[1]}`;
}

/** Converte a data da entidade (`YYYY-MM-DD`) para exibição (`DD/MM/AAAA`). */
export function toDisplayDate(isoDate: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!parts) {
    return isoDate;
  }
  return `${parts[3]}/${parts[2]}/${parts[1]}`;
}

/**
 * Só o dia e o mês de um dia de calendário: `2026-10-07` → `07/10`. É como o card do último aviso,
 * na home, mostra a data.
 *
 * Como `toDisplayDate`, CORTA o texto e nunca passa por `Date`: um dia de calendário não tem fuso, e
 * convertê-lo é como ele vira o dia anterior num fuso negativo. Devolve o texto recebido quando ele
 * não é uma data.
 */
export function toDisplayDayMonth(isoDate: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!parts) {
    return isoDate;
  }
  return `${parts[3]}/${parts[2]}`;
}

/**
 * Converte um INSTANTE (`2026-10-05T23:10:00.000Z`) para exibição, no horário local do aparelho:
 * `05/10/2026, 20:10`.
 *
 * É a única função deste arquivo que lê um instante, e a única que converte fuso. Todas as outras
 * tratam de DIA DE CALENDÁRIO, que não tem fuso — nunca passe um dia para esta nem um instante
 * para aquelas. Um item postado às 21:30 em São Paulo é 00:30 do dia seguinte em UTC, e mostrá-lo
 * sem converter diria "amanhã" (feature 008, research R-009).
 *
 * Devolve o texto recebido quando ele não é uma data, como `toDisplayDate` faz.
 */
export function toDisplayDateTime(isoInstant: string): string {
  const moment = new Date(isoInstant);
  if (Number.isNaN(moment.getTime())) {
    return isoInstant;
  }
  const two = (value: number): string => (value < 10 ? `0${value}` : String(value));
  return (
    `${two(moment.getDate())}/${two(moment.getMonth() + 1)}/${moment.getFullYear()}, ` +
    `${two(moment.getHours())}:${two(moment.getMinutes())}`
  );
}

/* -------------------------------------------------------------------------- */
/* Calendário: regras puras usadas pelo seletor de data prevista.              */
/* Todo cálculo usa o fuso local do aparelho; nenhuma conversão UTC é feita,   */
/* porque a data prevista é um day de calendário, não um instante no tempo.    */
/* -------------------------------------------------------------------------- */

/** Rótulos dos months, na ordem de `Date.getMonth()` (janeiro = índice 0). */
export const MONTH_NAMES: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Iniciais dos dias da semana, começando no domingo (`Date.getDay()` = 0). */
export const WEEKDAY_INITIALS: readonly string[] = [
  "S",
  "M",
  "T",
  "W",
  "T",
  "F",
  "S",
];

/** Mês de calendário identificado por year e mês 1-12 (não 0-11). */
export interface CalendarMonth {
  year: number;
  /** 1 = janeiro, 12 = dezembro. */
  month: number;
}

function twoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Monta `YYYY-MM-DD` a partir de year, mês (1-12) e day. */
export function buildISODate(year: number, month: number, day: number): string {
  return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
}

/** Data de hoje no fuso do aparelho, em `YYYY-MM-DD`. */
export function todayISODate(): string {
  const agora = new Date();
  return buildISODate(
    agora.getFullYear(),
    agora.getMonth() + 1,
    agora.getDate()
  );
}

/**
 * Soma dias a uma data ISO e devolve outra data ISO.
 * Datas inválidas voltam inalteradas, para não inventar value sobre input ruim.
 */
export function addDays(isoDate: string, dias: number): string {
  if (!isValidISODate(isoDate)) {
    return isoDate;
  }

  const data = new Date(
    Number(isoDate.slice(0, 4)),
    Number(isoDate.slice(5, 7)) - 1,
    Number(isoDate.slice(8, 10)) + dias
  );
  return buildISODate(data.getFullYear(), data.getMonth() + 1, data.getDate());
}

/** Mês a que pertence a data ISO, ou `null` quando o text não é uma data válida. */
export function monthOfISODate(isoDate: string): CalendarMonth | null {
  if (!isValidISODate(isoDate)) {
    return null;
  }
  return { year: Number(isoDate.slice(0, 4)), month: Number(isoDate.slice(5, 7)) };
}

/** Mês exibido quando o formulário abre: o da data escolhida ou o mês corrente. */
export function initialCalendarMonth(isoDate: string): CalendarMonth {
  return monthOfISODate(isoDate) ?? monthOfISODate(todayISODate())!;
}

/** Avança (`+1`) ou retrocede (`-1`) months, virando o year quando necessário. */
export function shiftMonth(
  currentMonth: CalendarMonth,
  offset: number
): CalendarMonth {
  const reference = new Date(currentMonth.year, currentMonth.month - 1 + offset, 1);
  return { year: reference.getFullYear(), month: reference.getMonth() + 1 };
}

/** Título do cabeçalho do calendário, por exemplo `August 2026`. */
export function monthLabel(currentMonth: CalendarMonth): string {
  return `${MONTH_NAMES[currentMonth.month - 1]} ${currentMonth.year}`;
}

/**
 * Grade do mês em weeks de 7 posições, começando no domingo.
 * Posições fora do mês recebem `null`, para que a View apenas renderize.
 */
export function buildMonthGrid(currentMonth: CalendarMonth): (number | null)[][] {
  const firstWeekday = new Date(
    currentMonth.year,
    currentMonth.month - 1,
    1
  ).getDay();
  const daysInMonth = new Date(currentMonth.year, currentMonth.month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let blank = 0; blank < firstWeekday; blank += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let inicio = 0; inicio < cells.length; inicio += 7) {
    weeks.push(cells.slice(inicio, inicio + 7));
  }
  return weeks;
}
