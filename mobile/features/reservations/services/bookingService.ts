import { HttpError, request } from "@/features/auth";
import {
  OwnReservation,
  isOwnReservationList,
} from "@/features/reservations/domain/reservation";
import {
  Availability,
  isAvailability,
} from "@/features/reservations/domain/slot";

/**
 * Acesso às reservas: única camada da feature que faz I/O.
 *
 * A fonte da verdade é o servidor; este módulo não guarda state. O JSON recebido entra como
 * `unknown` e só é devolvido depois do narrowing pelos guards do domínio. Não valida input, não
 * ordena e não gera text de interface — a ordem já vem do servidor e a message de recusa é a que o
 * servidor mandou.
 */

/**
 * Um mês de disponibilidade de um local.
 *
 * O condomínio vai no caminho porque uma pessoa pode pertencer a mais de um, e o token não carrega
 * essa informação (RN-AUT-05). Um `404` sobe como `HttpError("server")` e significa a mesma coisa
 * para quem chama: este local não está disponível para esta pessoa.
 */
export async function fetchAvailability(
  condominiumId: string,
  commonAreaId: string,
  month: string
): Promise<Availability> {
  const response = await request(
    `/condominiums/${encodeURIComponent(condominiumId)}` +
      `/common-areas/${encodeURIComponent(commonAreaId)}` +
      `/availability?month=${encodeURIComponent(month)}`
  );
  if (!isAvailability(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * As reservas desta pessoa no condomínio que ainda não terminaram, já na ordem em que acontecem.
 *
 * De quem são vem do token: não há parâmetro para pedir as de outra pessoa.
 */
export async function listOwnReservations(
  condominiumId: string
): Promise<OwnReservation[]> {
  const response = await request(
    `/condominiums/${encodeURIComponent(condominiumId)}/reservations`
  );
  if (!isOwnReservationList(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Reserva um horário. Devolve nada: quem chama recarrega o mês, porque a resposta de uma reserva
 * não diz o que mudou para os outros horários do day.
 *
 * Um `409` sobe como `HttpError("conflict")` com o body do servidor — é o único caso em que a
 * message mostrada vem da API, porque é ela que sabe o que aconteceu (research R-005).
 */
export async function bookSlot(
  condominiumId: string,
  commonAreaId: string,
  date: string,
  startMinute: number
): Promise<void> {
  await request(
    `/condominiums/${encodeURIComponent(condominiumId)}` +
      `/common-areas/${encodeURIComponent(commonAreaId)}/reservations`,
    { method: "POST", body: { date: date, startMinute: startMinute } }
  );
}

function wholeDayPath(
  condominiumId: string,
  commonAreaId: string,
  date: string
): string {
  return (
    `/condominiums/${encodeURIComponent(condominiumId)}` +
    `/common-areas/${encodeURIComponent(commonAreaId)}` +
    `/whole-day/${encodeURIComponent(date)}`
  );
}

/**
 * Reserva o dia inteiro para o administrador: tudo o que ainda não começou, ou nada.
 *
 * Um `409` sobe como `HttpError("conflict")` com a message do servidor — há reservas de outra
 * pessoa no dia, não sobrou horário, ou o local está desligado. Em nenhum deles algo foi gravado.
 */
export async function takeWholeDay(
  condominiumId: string,
  commonAreaId: string,
  date: string
): Promise<void> {
  await request(wholeDayPath(condominiumId, commonAreaId, date), {
    method: "PUT",
  });
}

/** Libera as reservas do próprio administrador naquele dia. As dos outros não são tocadas. */
export async function releaseWholeDay(
  condominiumId: string,
  commonAreaId: string,
  date: string
): Promise<void> {
  await request(wholeDayPath(condominiumId, commonAreaId, date), {
    method: "DELETE",
  });
}

/**
 * Libera uma reserva. O registro é removido: não há cancelamento a consultar depois.
 *
 * A rota pende do condomínio, não do local — o `id` já identifica uma reserva só. Um `403`, um `404`
 * e um `409` chegam como `HttpError` de tipos diferentes, e quem chama decide a message.
 */
export async function cancelReservation(
  condominiumId: string,
  reservationId: string
): Promise<void> {
  await request(
    `/condominiums/${encodeURIComponent(condominiumId)}` +
      `/reservations/${encodeURIComponent(reservationId)}`,
    { method: "DELETE" }
  );
}
