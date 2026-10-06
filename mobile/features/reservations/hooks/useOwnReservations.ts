import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import { OwnReservation } from "@/features/reservations/domain/reservation";
import {
  cancelReservation,
  listOwnReservations,
} from "@/features/reservations/services/bookingService";

/**
 * Estado da seção "minhas reservas" do catálogo.
 *
 * Concentra busca e estado; não devolve JSX e não importa componente visual (constituição,
 * Princípio I).
 *
 * Separado de `useCommonAreas` de propósito: são duas leituras independentes, e a falha desta não
 * pode derrubar o catálogo — quem não consegue ver o que já reservou ainda consegue reservar.
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load your bookings. Check your connection and try again.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_CANCEL_FAILED = "Couldn't cancel the booking. Try again.";

/** Os três estados são exaustivos: a seção nunca fica em branco (FR-010). */
export type OwnReservationsState =
  | { status: "loading" }
  /** `reservations` vazia é "nada reservado ainda", não um erro. */
  | { status: "ready"; reservations: OwnReservation[] }
  | { status: "failed"; message: string };

export interface UseOwnReservationsResult {
  state: OwnReservationsState;
  reload: () => void;
  /** A reserva à espera da confirmação de cancelamento, ou `null`. */
  pendingCancel: OwnReservation | null;
  /** `true` enquanto o cancelamento está em voo: o diálogo trava e não fecha. */
  cancelling: boolean;
  /** Recusa do último cancelamento, mostrada dentro do diálogo. */
  cancelError: string | null;
  /** Abre a confirmação. Nada é enviado antes de `confirmCancel`. */
  askCancel: (reservation: OwnReservation) => void;
  dismissCancel: () => void;
  confirmCancel: () => void;
}

function messageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  return MESSAGE_LOAD_FAILED;
}

/**
 * A message de um cancelamento recusado. Num `409` ela vem do servidor, que é quem sabe o motivo —
 * o horário já começou —, como na tela de reserva.
 */
function cancelMessageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  if (
    error instanceof HttpError &&
    error.type === "conflict" &&
    typeof error.body === "object" &&
    error.body !== null &&
    "message" in error.body &&
    typeof (error.body as { message: unknown }).message === "string"
  ) {
    return (error.body as { message: string }).message;
  }
  return MESSAGE_CANCEL_FAILED;
}

export function useOwnReservations(): UseOwnReservationsResult {
  const { selectedCondominiumId } = useAuth();
  const [state, setState] = useState<OwnReservationsState>({
    status: "loading",
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (condominiumId: string) => {
    // Quem já tem a lista na tela não volta ao "carregando" a cada retorno: a troca acontece quando
    // a resposta chega, sem a seção piscar.
    setState((current) =>
      current.status === "ready" ? current : { status: "loading" }
    );
    try {
      const reservations = await listOwnReservations(condominiumId);
      if (mounted.current) {
        setState({ status: "ready", reservations });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        setState({ status: "failed", message: messageFor(error) });
      }
    }
  }, []);

  // No foco, e não só na montagem: a reserva é feita na tela seguinte, e esta continua montada por
  // baixo. Um `useEffect` deixaria a lista de antes da reserva à espera de quem voltasse.
  useFocusEffect(
    useCallback(() => {
      if (selectedCondominiumId !== null) {
        void load(selectedCondominiumId);
      }
    }, [selectedCondominiumId, load])
  );

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null) {
      void load(selectedCondominiumId);
    }
  }, [selectedCondominiumId, load]);

  const [pendingCancel, setPendingCancel] = useState<OwnReservation | null>(
    null
  );
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const askCancel = useCallback((reservation: OwnReservation) => {
    setCancelError(null);
    setPendingCancel(reservation);
  }, []);

  const dismissCancel = useCallback(() => {
    setPendingCancel(null);
    setCancelError(null);
  }, []);

  /**
   * Libera a reserva e recarrega a lista, em vez de tirar o card na mão: a lista do servidor é a
   * única verdade sobre o que esta pessoa ainda tem reservado.
   *
   * A recusa fica DENTRO do diálogo, que continua aberto — é ali que a pessoa está olhando. Fora a
   * falha de rede, toda recusa significa que a lista na tela está velha (o horário já começou, ou a
   * reserva já não existe), então ela é recarregada junto.
   */
  const confirmCancel = useCallback(() => {
    if (pendingCancel === null || cancelling || selectedCondominiumId === null) {
      return;
    }
    const condominiumId = selectedCondominiumId;
    const reservationId = pendingCancel.id;
    setCancelling(true);
    setCancelError(null);

    void (async () => {
      try {
        await cancelReservation(condominiumId, reservationId);
        if (!mounted.current) {
          return;
        }
        setPendingCancel(null);
        await load(condominiumId);
      } catch (error: unknown) {
        if (!mounted.current) {
          return;
        }
        setCancelError(cancelMessageFor(error));
        if (!(error instanceof HttpError && error.type === "network")) {
          await load(condominiumId);
        }
      } finally {
        if (mounted.current) {
          setCancelling(false);
        }
      }
    })();
  }, [pendingCancel, cancelling, selectedCondominiumId, load]);

  return {
    state,
    reload,
    pendingCancel,
    cancelling,
    cancelError,
    askCancel,
    dismissCancel,
    confirmCancel,
  };
}
