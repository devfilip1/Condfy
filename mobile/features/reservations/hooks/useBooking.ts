import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, actsInCondominium, useAuth } from "@/features/auth";
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
  releaseWholeDay,
  takeWholeDay,
} from "@/features/reservations/services/bookingService";
import {
  commonAreaPhotoUri,
  setCommonAreaAvailability,
} from "@/features/reservations/services/commonAreaService";
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
 * - *Quem pode fazer o quê.* Chega pronto: `status: "held"` com `reservationId` na reserva da
 *   própria pessoa, `reservationId` nas reservas do dia que o administrador pode cancelar,
 *   `canManage` e `wholeDayHeld` para os interruptores. Permissão não é coisa que a tela decide
 *   comparando ids nem cargos (FR-012b).
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
  | { kind: "cancelling"; reservationId: string }
  /** As três ações do administrador. Nenhuma vira nada na tela antes de o servidor responder. */
  | { kind: "switchingAvailability" }
  | { kind: "takingDay" }
  | { kind: "releasingDay" };

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
    /** O endereço completo da foto do local, já resolvido entre as duas origens, ou `null`. */
    photoUri: string | null;
    /**
     * Esta pessoa é o administrador do condomínio. COPIADO da resposta, nunca derivado: quem decide
     * é o servidor, e a tela só mostra os interruptores quando isto veio `true`.
     */
    canManage: boolean;
    month: CalendarMonth;
    /** Indexado por dia. Dia ausente não é reservável — passado ou além da janela. */
    days: Map<string, DayAvailability>;
    /** O dia cujos horários estão à mostra, ou `null` enquanto nenhum foi tocado. */
    selectedDate: string | null;
    /**
     * O início do horário escolhido e ainda não reservado, ou `null`. Escolher não reserva: quem
     * reserva é `book`, depois da confirmação.
     */
    selectedStartMinute: number | null;
    busy: BookingBusy | null;
    /** Recusa a mostrar acima dos horários. Sai no próximo toque. */
    notice: string | null;
  };

export interface UseBookingResult {
  state: BookingState;
  /**
   * A pessoa pode RESERVAR neste condomínio. `false` para o porteiro, que abre esta tela só para
   * consultar: vê o calendário, os horários livres e os ocupados, e não escolhe nem confirma nada.
   *
   * Cortesia de interface. Quem recusa de verdade é a API, que responde `403` a um porteiro.
   */
  canBook: boolean;
  selectDay: (date: string) => void;
  goToMonth: (offset: -1 | 1) => void;
  /** `true` quando ainda há mês reservável naquela direção (FR-021a). */
  canGoToMonth: (offset: -1 | 1) => boolean;
  /** Escolhe um horário livre; tocar de novo no mesmo desfaz a escolha. */
  selectSlot: (slot: Slot) => void;
  /** Reserva o horário escolhido. Sem escolha, não faz nada. */
  book: () => void;
  /**
   * Cancela a reserva que veio com `reservationId` — um horário `held` da própria pessoa, ou um das
   * reservas do dia que o administrador pode cancelar. Sem id, não faz nada.
   */
  cancel: (target: { reservationId?: string }) => void;
  /** Liga ou desliga o local. Só tem efeito para o administrador; o servidor é quem recusa. */
  setAvailability: (isAvailable: boolean) => void;
  /** Reserva (`true`) ou libera (`false`) o dia escolhido inteiro. Sem dia escolhido, não faz nada. */
  setWholeDay: (held: boolean) => void;
  reload: () => void;
}

function messageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  // Um 404 aqui é local inexistente, de outro condomínio, ou indisponível para quem não é o
  // administrador — a API responde igual aos três de propósito, então a tela também diz uma coisa
  // só. É o que um morador vê se chegar por um link a um local que foi desligado.
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
  const { selectedCondominiumId, currentMembership } = useAuth();
  const canBook =
    currentMembership !== null && actsInCondominium(currentMembership.role);
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
          photoUri: commonAreaPhotoUri(availability.commonArea),
          canManage: availability.canManage,
          month: target,
          days: daysByDate(availability),
          selectedDate: keepDate,
          // Toda recarga zera a escolha: o horário escolhido acabou de virar reserva, ou acabou de
          // ser tomado por outra pessoa. Nos dois casos ele não é mais uma opção.
          selectedStartMinute: null,
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
        ? // A recusa anterior sai: ela falava do dia que a pessoa acabou de deixar. A escolha de
        // horário sai junto, pelo mesmo motivo — 09:00 de um dia não é 09:00 do outro.
        {
          ...current,
          selectedDate: date,
          selectedStartMinute: null,
          notice: null,
        }
        : current
    );
  }, []);

  const selectSlot = useCallback((slot: Slot) => {
    setState((current) => {
      if (current.status !== "ready" || current.busy || slot.status !== "open") {
        return current;
      }
      return {
        ...current,
        selectedStartMinute:
          current.selectedStartMinute === slot.startMinute
            ? null
            : slot.startMinute,
        notice: null,
      };
    });
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
   * Reserva o horário escolhido e recarrega o mês.
   *
   * Recarrega inteiro em vez de tirar o horário da lista na mão: a reserva muda a bolinha do day
   * também, e um estado montado localmente seria uma segunda verdade sobre o que está livre.
   */
  const book = useCallback(
    () => {
      if (state.status !== "ready" || state.selectedDate === null || state.busy) {
        return;
      }
      if (state.selectedStartMinute === null) {
        return;
      }
      if (selectedCondominiumId === null || !commonAreaId) {
        return;
      }

      const date = state.selectedDate;
      const startMinute = state.selectedStartMinute;
      setState({
        ...state,
        busy: { kind: "booking", startMinute: startMinute },
        notice: null,
      });

      void (async () => {
        try {
          await bookSlotOnServer(
            selectedCondominiumId,
            commonAreaId,
            date,
            startMinute
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
   * Quem pode cancelar já foi decidido pelo servidor — o `reservationId` só chega em quem pode: no
   * horário `held` da própria pessoa e, para o administrador, nas reservas do dia que são de outra
   * (FR-012b). Aqui não se compara identidade nenhuma, e um alvo sem id não faz nada.
   */
  const cancel = useCallback(
    (target: { reservationId?: string }) => {
      if (state.status !== "ready" || state.selectedDate === null || state.busy) {
        return;
      }
      if (selectedCondominiumId === null || !commonAreaId) {
        return;
      }
      if (!target.reservationId) {
        return;
      }

      const date = state.selectedDate;
      const reservationId = target.reservationId;
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

  /**
   * O caminho comum das três ações do administrador: marca o que está em voo, pede ao servidor e
   * recarrega o mês mantendo o dia aberto.
   *
   * **Nada muda na tela antes da resposta.** Os interruptores leem o valor do state recarregado,
   * então uma falha os deixa onde estavam sem código nenhum para voltá-los (research R-007).
   *
   * Num conflito a tela estava desatualizada — outra pessoa reservou naquele dia, ou o local foi
   * desligado —, então recarrega junto com a message do servidor, como `book` faz.
   */
  const runAdminAction = useCallback(
    (
      busy: BookingBusy,
      action: (condominiumId: string, areaId: string) => Promise<void>
    ) => {
      if (state.status !== "ready" || state.busy) {
        return;
      }
      if (selectedCondominiumId === null || !commonAreaId) {
        return;
      }

      const condominiumId = selectedCondominiumId;
      const date = state.selectedDate;
      setState({ ...state, busy: busy, notice: null });

      void (async () => {
        try {
          await action(condominiumId, commonAreaId);
          if (mounted.current) {
            await load(condominiumId, commonAreaId, month, date);
          }
        } catch (error: unknown) {
          if (!mounted.current) {
            return;
          }
          const message = actionMessageFor(error);

          if (error instanceof HttpError && error.type === "conflict") {
            await load(condominiumId, commonAreaId, month, date);
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

  const setAvailability = useCallback(
    (isAvailable: boolean) => {
      // Já está assim: nada a pedir. Evita um pedido quando o toque chega repetido.
      if (
        state.status !== "ready" ||
        state.commonArea.isAvailable === isAvailable
      ) {
        return;
      }
      runAdminAction({ kind: "switchingAvailability" }, (condominiumId, areaId) =>
        setCommonAreaAvailability(condominiumId, areaId, isAvailable)
      );
    },
    [state, runAdminAction]
  );

  const setWholeDay = useCallback(
    (held: boolean) => {
      if (state.status !== "ready" || state.selectedDate === null) {
        return;
      }
      const date = state.selectedDate;
      runAdminAction(
        { kind: held ? "takingDay" : "releasingDay" },
        (condominiumId, areaId) =>
          held
            ? takeWholeDay(condominiumId, areaId, date)
            : releaseWholeDay(condominiumId, areaId, date)
      );
    },
    [state, runAdminAction]
  );

  return {
    state,
    canBook,
    selectDay,
    selectSlot,
    goToMonth,
    canGoToMonth,
    book,
    cancel,
    setAvailability,
    setWholeDay,
    reload,
  };
}
