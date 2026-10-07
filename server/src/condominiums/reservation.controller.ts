import type { FastifyPluginAsync } from "fastify";

import {
  validateDayParam,
  validateMonth,
  validateNewReservation,
} from "./reservation.dto.ts";
import {
  ReservationError,
  bookSlot,
  cancelReservation,
  listAvailability,
  listOwnReservations,
  releaseWholeDay,
  takeWholeDay,
} from "./reservation.service.ts";

/**
 * Controller de reservas: as rotas do recurso são declaradas aqui dentro.
 *
 * Responsabilidade: traduzir HTTP. Lê parâmetros, valida a entrada, chama o service e escolhe o
 * status code. A regra fica no service (constituição, seção Backend). Registrado em `server.ts` com
 * o prefixo `/condominiums`, dentro do escopo que exige sessão.
 */

const MESSAGE_UNKNOWN_CONDOMINIUM = "Condominium not found.";
const MESSAGE_UNKNOWN_COMMON_AREA = "Common area not found.";
const MESSAGE_SESSION_EXPIRED = "Your session has expired. Sign in again.";
const MESSAGE_SLOT_TAKEN = "That time was just taken. Pick another one.";
const MESSAGE_UNKNOWN_RESERVATION = "Reservation not found.";
const MESSAGE_CANNOT_CANCEL =
  "Only the person who booked it or the condominium administrator can cancel a reservation.";
const MESSAGE_ALREADY_STARTED =
  "That time has already started and cannot be cancelled.";
const MESSAGE_AREA_UNAVAILABLE =
  "This place is unavailable. Switch it on to book it.";
const MESSAGE_ONLY_ADMIN_WHOLE_DAY =
  "Only the condominium administrator can reserve a whole day.";
const MESSAGE_DAY_HAS_BOOKINGS =
  "This day already has bookings. Cancel them first to reserve the whole day.";
const MESSAGE_NOTHING_LEFT = "No time of this day can still be booked.";

/** `YYYY-MM` do mês corrente, para quando a query não informa nada. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const reservationController: FastifyPluginAsync = async (app) => {
  app.get<{
    Params: { condominiumId: string; commonAreaId: string };
    Querystring: { month?: string };
  }>(
    "/:condominiumId/common-areas/:commonAreaId/availability",
    async (request, reply) => {
      // Quem está pedindo vem do token, nunca do caminho nem do body. O `authenticate` do escopo já
      // garantiu que `authUser` existe; a checagem é para o compilador.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      // Ausente é válido e significa o mês corrente; só o que foi informado é verificado.
      const result = validateMonth(request.query.month ?? currentMonth());
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      try {
        return reply.send(
          await listAvailability(
            request.params.condominiumId,
            request.params.commonAreaId,
            requesterId,
            result.data
          )
        );
      } catch (error) {
        // Local inexistente, indisponível, de outro condomínio e condomínio alheio recebem a MESMA
        // resposta, de propósito: responder de formas diferentes permitiria mapear quais locais
        // existem (ADR 0009).
        if (error instanceof ReservationError) {
          return reply.code(404).send({ message: MESSAGE_UNKNOWN_COMMON_AREA });
        }
        throw error;
      }
    }
  );

  app.post<{ Params: { condominiumId: string; commonAreaId: string } }>(
    "/:condominiumId/common-areas/:commonAreaId/reservations",
    async (request, reply) => {
      const result = validateNewReservation(request.body);
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      // Quem reserva vem do token, nunca do body (FR-015).
      const reservedById = request.authUser?.id;
      if (!reservedById) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply
          .code(201)
          .send(
            await bookSlot(
              request.params.condominiumId,
              request.params.commonAreaId,
              reservedById,
              result.data
            )
          );
      } catch (error) {
        if (error instanceof ReservationError) {
          // 409, e não 400 nem 404: o pedido estava bem formado e o horário existe. O que mudou foi
          // o estado do mundo entre ler a lista e confirmar (research R-005).
          if (error.reason === "taken") {
            return reply.code(409).send({ message: MESSAGE_SLOT_TAKEN });
          }
          // Só o administrador chega aqui: para os outros, local desligado é o 404 de sempre.
          if (error.reason === "unavailable") {
            return reply.code(409).send({ message: MESSAGE_AREA_UNAVAILABLE });
          }
          return reply.code(404).send({ message: MESSAGE_UNKNOWN_COMMON_AREA });
        }
        throw error;
      }
    }
  );

  // O dia inteiro é um recurso endereçado pelo dia: `PUT` faz o administrador tê-lo, `DELETE` faz
  // ele não ter. As duas respondem 204 e as duas são idempotentes (research R-005 da 011).
  app.put<{
    Params: { condominiumId: string; commonAreaId: string; date: string };
  }>(
    "/:condominiumId/common-areas/:commonAreaId/whole-day/:date",
    async (request, reply) => {
      const result = validateDayParam(request.params.date, "bookable");
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await takeWholeDay(
          request.params.condominiumId,
          request.params.commonAreaId,
          requesterId,
          result.data.date
        );
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof ReservationError) {
          switch (error.reason) {
            case "forbidden":
              return reply.code(403).send({ message: MESSAGE_ONLY_ADMIN_WHOLE_DAY });
            // Os três 409 são o mesmo tipo de recusa — o pedido estava certo e o estado do mundo
            // não deixa — e em nenhum deles alguma coisa foi gravada.
            case "dayTaken":
              return reply.code(409).send({ message: MESSAGE_DAY_HAS_BOOKINGS });
            case "nothingLeft":
              return reply.code(409).send({ message: MESSAGE_NOTHING_LEFT });
            case "unavailable":
              return reply.code(409).send({ message: MESSAGE_AREA_UNAVAILABLE });
            default:
              return reply.code(404).send({ message: MESSAGE_UNKNOWN_COMMON_AREA });
          }
        }
        throw error;
      }
    }
  );

  app.delete<{
    Params: { condominiumId: string; commonAreaId: string; date: string };
  }>(
    "/:condominiumId/common-areas/:commonAreaId/whole-day/:date",
    async (request, reply) => {
      const result = validateDayParam(request.params.date, "any");
      if (!result.ok) {
        return reply.code(400).send({ errors: result.errors });
      }

      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await releaseWholeDay(
          request.params.condominiumId,
          request.params.commonAreaId,
          requesterId,
          result.data.date
        );
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof ReservationError) {
          return error.reason === "forbidden"
            ? reply.code(403).send({ message: MESSAGE_ONLY_ADMIN_WHOLE_DAY })
            : reply.code(404).send({ message: MESSAGE_UNKNOWN_COMMON_AREA });
        }
        throw error;
      }
    }
  );

  // As reservas de quem pediu, em todos os locais do condomínio. Pende do condomínio pelo mesmo
  // motivo do DELETE abaixo: a lista atravessa locais.
  app.get<{ Params: { condominiumId: string } }>(
    "/:condominiumId/reservations",
    async (request, reply) => {
      // De quem são as reservas vem do token: não existe parâmetro para pedir as de outra pessoa.
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        return reply.send(
          await listOwnReservations(request.params.condominiumId, requesterId)
        );
      } catch (error) {
        // Condomínio inexistente e condomínio alheio recebem a MESMA resposta, como no catálogo.
        if (error instanceof ReservationError) {
          return reply.code(404).send({ message: MESSAGE_UNKNOWN_CONDOMINIUM });
        }
        throw error;
      }
    }
  );

  // A reserva pende do condomínio, não do local: o `id` já identifica uma reserva só, e o condomínio
  // é o que a checagem de permissão precisa.
  app.delete<{ Params: { condominiumId: string; reservationId: string } }>(
    "/:condominiumId/reservations/:reservationId",
    async (request, reply) => {
      const requesterId = request.authUser?.id;
      if (!requesterId) {
        return reply.code(401).send({ message: MESSAGE_SESSION_EXPIRED });
      }

      try {
        await cancelReservation(
          request.params.condominiumId,
          request.params.reservationId,
          requesterId
        );
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof ReservationError) {
          // As três recusas são diferentes de propósito: quem não é membro não descobre que a
          // reserva existe; quem é membro e não pode cancelar ouve que não pode; e quem poderia,
          // mas chegou depois da hora, ouve o motivo (ADR 0010 e research R-005).
          if (error.reason === "forbidden") {
            return reply.code(403).send({ message: MESSAGE_CANNOT_CANCEL });
          }
          if (error.reason === "started") {
            return reply.code(409).send({ message: MESSAGE_ALREADY_STARTED });
          }
          return reply.code(404).send({ message: MESSAGE_UNKNOWN_RESERVATION });
        }
        throw error;
      }
    }
  );
};

export default reservationController;
