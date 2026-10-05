import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import {
  Availability,
  BookedCommonArea,
  DayAvailability,
  Slot,
  lastBookableDate,
} from "@/features/reservations/domain/slot";
import {
  bookSlot as bookSlotOnServer,
  cancelReservation as cancelReservationOnServer,
  fetchAvailability,
} from "@/features/reservations/services/bookingService";
import {
  CalendarMonth,
  monthOfISODate,
  shiftMonth,
  todayISODate,
} from "@/shared/lib/calendar";

/**
 * Estado da tela de reserva de um local.
 *
 * Concentra busca, estado e derivação; não devolve JSX e não importa componente visual
 * (constituição, Princípio I).
 *
 * **Duas coisas que este hook de propósito NÃO calcula:**
 *
 * - *O que está livre.* Vem do servidor, que precisa da hora para saber quais horários de hoje já
 *   passaram — e o relógio dele é o que vai aceitar ou recusar a reserva (research R-004).
 * - *Quem pode liberar qual horário.* Chega como `status: "held"` com `reservationId`. Permissão não
 *   é coisa que a tela decide comparando ids (FR-012b).
 *
 * O que sobra para cá é o que a tela está fazendo agora: qual mês, qual dia, o que está em voo e
 * qual recusa mostrar.
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load the times. Check your connection and try again.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_UNAVAILABLE =
  "This place isn’t available for booking right now.";
export const MESSAGE_ACTION_FAILED = "Couldn’t do that. Try again.";
export const MESSAGE_CONFLICT_FALLBACK =
  "That time is no longer available. The list has been refreshed.";

/** O que já está em voo. Impede um segundo toque no mesmo botão. */
export type BookingBusy =
  | { kind: "booking"; startMinute: number }
  | { kind: "cancelling"; reservationId: string };

/**
 * Os três estados são exaustivos e mutuamente exclusivos. É isso que torna a FR-010 verificável:
 * não existe combinação de flags que renderize uma tela em branco.
 */
export type BookingState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | {
      status: "ready";
      commonArea: BookedCommonArea;
      month: CalendarMonth;
      /** Indexado por dia. Dia ausente não é reservável — passado ou além da janela. */
      days: Map<string, DayAvailability>;
      /** O dia cujos horários estão à mostra, ou `null` enquanto nenhum foi tocado. */
      selectedDate: string | null;
      busy: BookingBusy | null;
      /** Recusa a mostrar acima dos horários. Sai no próximo toque. */
      notice: string | null;
    };

export interface UseBookingResult {
  state: BookingState;
  selectDay: (date: string) => void;
  goToMonth: (offset: -1 | 1) => void;
  /** `true` quando ainda há mês reservável naquela direção (FR-021a). */
  canGoToMonth: (offset: -1 | 1) => boolean;
  book: (slot: Slot) => void;
  /** Só faz sentido num horário `held`; num `open` não faz nada. */
  cancel: (slot: Slot) => void;
  reload: () => void;
}

function messageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  // Um 404 aqui é local inexistente, indisponível ou de outro condomínio — a API responde igual aos
  // três de propósito, então a tela também diz uma coisa só.
  if (error instanceof HttpError && error.type === "server") {
    return MESSAGE_UNAVAILABLE;
  }
  return MESSAGE_LOAD_FAILED;
}

/**
 * A message de uma ação recusada — reservar ou cancelar.
 *
 * Diferente de `messageFor`, que fala de uma tela que não carregou: aqui a tela está certa e a ação
 * é que não passou. A recusa de conflito chega na US3.
 */
function actionMessageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  // É o único caso em que a message vem do servidor: só ele sabe o que aconteceu — o horário foi
  // tomado, ou já começou — e dizer "algo deu errado" aqui esconderia a única informação útil.
  if (error instanceof HttpError && error.type === "conflict") {
    return conflictMessageOf(error.body);
  }
  return MESSAGE_ACTION_FAILED;
}

/** A message de um `409`, ou uma genérica se o body não vier no formato esperado. */
function conflictMessageOf(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return MESSAGE_CONFLICT_FALLBACK;
}

/** `YYYY-MM` que a rota de disponibilidade espera. */
function monthParam(month: CalendarMonth): string {
  return `${month.year}-${month.month < 10 ? "0" : ""}${month.month}`;
}

function daysByDate(availability: Availability): Map<string, DayAvailability> {
  return new Map(availability.days.map((day) => [day.date, day]));
}

export function useBooking(): UseBookingResult {
  // O id do local vem da rota `app/reservations/[id].tsx`, como no mural de avisos.
  const { id: commonAreaId } = useLocalSearchParams<{ id: string }>();
  const { selectedCondominiumId } = useAuth();
  const [state, setState] = useState<BookingState>({ status: "loading" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Mês em exibição. Fica fora de `state` porque sobrevive a loading e a falha. */
  const [month, setMonth] = useState<CalendarMonth>(() =>
    monthOfISODate(todayISODate())!
  );

  /**
   * `keepDate` mantém o day aberto depois de reservar ou cancelar: a pessoa continua olhando o
   * mesmo day, com a lista já atualizada. Numa troca de mês ele vem `null`, porque o day escolhido
   * não existe mais na tela.
   */
  const load = useCallback(
    async (
      condominiumId: string,
      areaId: string,
      target: CalendarMonth,
      keepDate: string | null = null
    ) => {
      setState({ status: "loading" });
      try {
        const availability = await fetchAvailability(
          condominiumId,
          areaId,
          monthParam(target)
        );
        if (!mounted.current) {
          return;
        }
        setState({
          status: "ready",
          commonArea: availability.commonArea,
          month: target,
          days: daysByDate(availability),
          selectedDate: keepDate,
          busy: null,
          notice: null,
        });
      } catch (error: unknown) {
        if (mounted.current) {
          setState({ status: "failed", message: messageFor(error) });
        }
      }
    },
    []
  );

  useEffect(() => {
    if (selectedCondominiumId === null || !commonAreaId) {
      return;
    }
    void load(selectedCondominiumId, commonAreaId, month);
  }, [selectedCondominiumId, commonAreaId, month, load]);

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null && commonAreaId) {
      void load(selectedCondominiumId, commonAreaId, month);
    }
  }, [selectedCondominiumId, commonAreaId, month, load]);

  const selectDay = useCallback((date: string) => {
    setState((current) =>
      current.status === "ready"
        ? // A recusa anterior sai: ela falava do dia que a pessoa acabou de deixar.
          { ...current, selectedDate: date, notice: null }
        : current
    );
  }, []);

  /**
   * Não existe mês inteiramente fora da janela para navegar: antes do mês de hoje não há dia
   * reservável, e depois do mês do último dia da janela também não (FR-021a).
   */
  const canGoToMonth = useCallback(
    (offset: -1 | 1): boolean => {
      const today = todayISODate();
      const target = shiftMonth(month, offset);
      const first = monthOfISODate(today)!;
      const last = monthOfISODate(lastBookableDate(today))!;
      const asNumber = (value: CalendarMonth) => value.year * 12 + value.month;
      return (
        asNumber(target) >= asNumber(first) && asNumber(target) <= asNumber(last)
      );
    },
    [month]
  );

  const goToMonth = useCallback(
    (offset: -1 | 1) => {
      if (canGoToMonth(offset)) {
        setMonth((current) => shiftMonth(current, offset));
      }
    },
    [canGoToMonth]
  );

  /**
   * Reserva o horário e recarrega o mês.
   *
   * Recarrega inteiro em vez de tirar o horário da lista na mão: a reserva muda a bolinha do day
   * também, e um estado montado localmente seria uma segunda verdade sobre o que está livre.
   */
  const book = useCallback(
    (slot: Slot) => {
      if (state.status !== "ready" || state.selectedDate === null || state.busy) {
        return;
      }
      if (selectedCondominiumId === null || !commonAreaId) {
        return;
      }

      const date = state.selectedDate;
      setState({
        ...state,
        busy: { kind: "booking", startMinute: slot.startMinute },
        notice: null,
      });

      void (async () => {
        try {
          await bookSlotOnServer(
            selectedCondominiumId,
            commonAreaId,
            date,
            slot.startMinute
          );
          if (mounted.current) {
            await load(selectedCondominiumId, commonAreaId, month, date);
          }
        } catch (error: unknown) {
          if (!mounted.current) {
            return;
          }
          const message = actionMessageFor(error);

          // Num conflito a lista está desatualizada: o horário já é de outra pessoa. Recarregar
          // junto com a message é o que faz ele sumir ao mesmo tempo em que a recusa aparece
          // (FR-020) — mostrar a message e deixar o horário na tela convidaria a tentar de novo.
          if (error instanceof HttpError && error.type === "conflict") {
            await load(selectedCondominiumId, commonAreaId, month, date);
            if (mounted.current) {
              setState((current) =>
                current.status === "ready"
                  ? { ...current, notice: message }
                  : current
              );
            }
            return;
          }

          setState((current) =>
            current.status === "ready"
              ? { ...current, busy: null, notice: message }
              : current
          );
        }
      })();
    },
    [state, selectedCondominiumId, commonAreaId, month, load]
  );

  /**
   * Libera o horário e recarrega o mês, pelo mesmo motivo de `book`: a bolinha do day muda junto.
   *
   * Quem pode cancelar já foi decidido pelo servidor — o horário só chega como `held` para quem
   * pode (FR-012b). Aqui não se compara identidade nenhuma.
   */
  const cancel = useCallback(
    (slot: Slot) => {
      if (state.status !== "ready" || state.selectedDate === null || state.busy) {
        return;
      }
      if (selectedCondominiumId === null || !commonAreaId) {
        return;
      }
      if (slot.status !== "held" || !slot.reservationId) {
        return;
      }

      const date = state.selectedDate;
      const reservationId = slot.reservationId;
      setState({
        ...state,
        busy: { kind: "cancelling", reservationId: reservationId },
        notice: null,
      });

      void (async () => {
        try {
          await cancelReservationOnServer(selectedCondominiumId, reservationId);
          if (mounted.current) {
            await load(selectedCondominiumId, commonAreaId, month, date);
          }
        } catch (error: unknown) {
          if (!mounted.current) {
            return;
          }
          const message = actionMessageFor(error);

          // Mesmo raciocínio de `book`: num conflito — aqui, horário que já começou — a lista está
          // desatualizada, então recarregar junto com a message evita convidar a tentar de novo.
          if (error instanceof HttpError && error.type === "conflict") {
            await load(selectedCondominiumId, commonAreaId, month, date);
            if (mounted.current) {
              setState((current) =>
                current.status === "ready"
                  ? { ...current, notice: message }
                  : current
              );
            }
            return;
          }

          setState((current) =>
            current.status === "ready"
              ? { ...current, busy: null, notice: message }
              : current
          );
        }
      })();
    },
    [state, selectedCondominiumId, commonAreaId, month, load]
  );

  return { state, selectDay, goToMonth, canGoToMonth, book, cancel, reload };
}
