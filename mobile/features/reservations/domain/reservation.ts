/**
 * Uma reserva de quem está usando o app, como a lista de "minhas reservas" a recebe.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * O nome do local vem junto de propósito: a lista mistura locais, e cruzar com o catálogo falharia
 * para um local que ficou indisponível depois da reserva — ele some do catálogo, a reserva não.
 */

export interface OwnReservation {
  id: string;
  commonArea: { id: string; name: string };
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
  /** Minutos desde a meia-noite. Quem exibe usa `slotLabel` de `domain/slot`. */
  startMinute: number;
  endMinute: number;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Princípio IV).            */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOwnReservation(value: unknown): value is OwnReservation {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    isObject(value.commonArea) &&
    typeof value.commonArea.id === "string" &&
    typeof value.commonArea.name === "string" &&
    typeof value.date === "string" &&
    typeof value.startMinute === "number" &&
    typeof value.endMinute === "number"
  );
}

/** `true` quando o value é uma list em que todo item é uma `OwnReservation`. */
export function isOwnReservationList(value: unknown): value is OwnReservation[] {
  return Array.isArray(value) && value.every(isOwnReservation);
}
