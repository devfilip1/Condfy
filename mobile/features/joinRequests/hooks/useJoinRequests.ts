import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import {
  JoinRequest,
  JoinRequestAnswer,
} from "@/features/joinRequests/domain/joinRequest";
import {
  approveJoinRequest,
  fetchJoinRequests,
  rejectJoinRequest,
} from "@/features/joinRequests/services/joinRequestService";

/**
 * Estado do módulo de pedidos de entrada: a lista do condomínio em tela e a resposta a um pedido.
 *
 * Concentra busca, estado e orquestração; não devolve JSX e não importa componente visual
 * (constituição, Princípio I).
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load the requests. Check your connection and try again.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_ANSWER_FAILED = "Couldn't answer this request. Try again.";
export const MESSAGE_ALREADY_ANSWERED = "This request was already answered.";

/** `failed` é diferente de uma lista vazia: "ninguém espera" só vale para uma resposta certa. */
export type JoinRequestsState =
  | { status: "loading" }
  | { status: "ready"; requests: JoinRequest[] }
  | { status: "failed"; message: string };

/** O pedido que está no diálogo de confirmação, e o que se vai responder a ele. */
export interface PendingAnswer {
  request: JoinRequest;
  answer: JoinRequestAnswer;
}

export interface UseJoinRequestsResult {
  state: JoinRequestsState;
  /**
   * `true` para quem cuida do condomínio em tela — o administrador ou o síndico. Cortesia de
   * interface: quem recusa de verdade é a API.
   */
  canAnswer: boolean;
  reload: () => void;
  pending: PendingAnswer | null;
  answering: boolean;
  /** Falha da resposta, mostrada dentro do diálogo. */
  answerError: string | null;
  /**
   * O que dizer acima da lista depois de uma resposta que não encontrou o pedido: outra pessoa já
   * tinha respondido, ou quem pediu desistiu. NÃO é uma falha, e não pede ação de ninguém.
   */
  notice: string | null;
  ask: (request: JoinRequest, answer: JoinRequestAnswer) => void;
  cancel: () => void;
  confirm: () => void;
}

/** Um `404` com a frase do servidor: o pedido não existe mais. */
function isGone(error: unknown): boolean {
  if (!(error instanceof HttpError) || error.type !== "server") {
    return false;
  }
  const body = error.body;
  return (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    (body as { message: unknown }).message === "This request no longer exists."
  );
}

export function useJoinRequests(): UseJoinRequestsResult {
  const { selectedCondominiumId, managesSelectedCondominium } = useAuth();
  const [state, setState] = useState<JoinRequestsState>({ status: "loading" });
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Trava a segunda resposta: o state só muda no próximo render, o ref muda na hora. */
  const running = useRef(false);
  const loadedOnce = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canAnswer = managesSelectedCondominium;

  const load = useCallback(async (condominiumId: string, quiet: boolean) => {
    if (!quiet) {
      setState({ status: "loading" });
    }
    try {
      const requests = await fetchJoinRequests(condominiumId);
      if (mounted.current) {
        loadedOnce.current = true;
        setState({ status: "ready", requests });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        loadedOnce.current = false;
        setState({
          status: "failed",
          message:
            error instanceof HttpError && error.type === "network"
              ? MESSAGE_OFFLINE
              : MESSAGE_LOAD_FAILED,
        });
      }
    }
  }, []);

  // A cada vez que a tela volta a ser a da frente: pedidos chegam a qualquer hora, e ninguém avisa.
  useFocusEffect(
    useCallback(() => {
      if (selectedCondominiumId === null || !canAnswer) {
        return;
      }
      void load(selectedCondominiumId, loadedOnce.current);
    }, [selectedCondominiumId, canAnswer, load])
  );

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null) {
      setNotice(null);
      void load(selectedCondominiumId, false);
    }
  }, [selectedCondominiumId, load]);

  const ask = useCallback((request: JoinRequest, answer: JoinRequestAnswer) => {
    setAnswerError(null);
    setNotice(null);
    setPending({ request, answer });
  }, []);

  const cancel = useCallback(() => {
    if (!running.current) {
      setPending(null);
    }
  }, []);

  const confirm = useCallback(() => {
    if (running.current || pending === null || selectedCondominiumId === null) {
      return;
    }
    const { request, answer } = pending;

    running.current = true;
    setAnswering(true);
    setAnswerError(null);

    const send = answer === "approve" ? approveJoinRequest : rejectJoinRequest;
    send(selectedCondominiumId, request.id)
      .then(() => {
        if (!mounted.current) {
          return;
        }
        // Respondido: o pedido sai da lista na hora, sem esperar outra busca.
        setState((current) =>
          current.status === "ready"
            ? {
                status: "ready",
                requests: current.requests.filter((item) => item.id !== request.id),
              }
            : current
        );
        setPending(null);
      })
      .catch((error: unknown) => {
        if (!mounted.current) {
          return;
        }
        if (isGone(error)) {
          // Outra pessoa respondeu antes, ou quem pediu desistiu. Fecha o diálogo, diz isso em
          // tom de aviso e relê a lista — não há nada a tentar de novo.
          setPending(null);
          setNotice(MESSAGE_ALREADY_ANSWERED);
          void load(selectedCondominiumId, true);
          return;
        }
        setAnswerError(
          error instanceof HttpError && error.type === "network"
            ? MESSAGE_OFFLINE
            : MESSAGE_ANSWER_FAILED
        );
      })
      .finally(() => {
        running.current = false;
        if (mounted.current) {
          setAnswering(false);
        }
      });
  }, [pending, selectedCondominiumId, load]);

  return {
    state,
    canAnswer,
    reload,
    pending,
    answering,
    answerError,
    notice,
    ask,
    cancel,
    confirm,
  };
}
