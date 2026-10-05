import { HttpError, request } from "@/features/auth";
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
