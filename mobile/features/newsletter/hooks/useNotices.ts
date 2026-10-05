import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import {
  FormErrors,
  NewNotice,
  Notice,
  hasNoErrors,
  validateNewNotice,
} from "@/features/newsletter/domain/notice";
import {
  listNotices,
  publishNotice as publicarNoServico,
} from "@/features/newsletter/services/noticeService";

/**
 * Estado do mural de avisos.
 *
 * Concentra busca, estado e derivação; não devolve JSX e não importa componente visual
 * (constituição, Princípio I).
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load the notices. Check your connection and try again.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_PUBLISH_FAILED = "Couldn't publish. Try again.";

/** Os quatro estados são exaustivos: nenhuma combinação renderiza tela em branco (FR-011). */
export type BoardState =
  | { status: "loading" }
  /** Autenticado, mas sem vínculo com condomínio nenhum. */
  | { status: "noCondominium" }
  /** `notices` vazia é o mural sem nada publicado, não um erro. */
  | { status: "ready"; notices: Notice[] }
  | { status: "failed"; message: string };

export interface UseNoticesResult {
  state: BoardState;
  /**
   * `true` só quando a pessoa é administradora DO CONDOMÍNIO EM TELA — não "é admin em algum
   * lugar". Quem administra um prédio e mora em outro publica num e não no outro.
   *
   * Isto é cortesia de interface. Quem recusa de verdade é a API (FR-023).
   */
  canPublish: boolean;
  formOpen: boolean;
  formErrors: FormErrors;
  submitting: boolean;
  submitError: string | null;
  openForm: () => void;
  closeForm: () => void;
  publish: (input: NewNotice) => void;
  reload: () => void;
}

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  return fallback;
}

/** Mais recente primeiro, com `id` desempatando, igual à ordem do servidor (FR-010). */
function sortNewestFirst(list: Notice[]): Notice[] {
  return [...list].sort((a, b) => {
    if (a.date === b.date) {
      return a.id < b.id ? 1 : -1;
    }
    return a.date < b.date ? 1 : -1;
  });
}

export function useNotices(): UseNoticesResult {
  const { profile, selectedCondominiumId } = useAuth();
  const [state, setState] = useState<BoardState>({ status: "loading" });
  const [formOpen, setFormOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canPublish =
    profile.status === "ready" &&
    selectedCondominiumId !== null &&
    profile.profile.memberships.some(
      (membership) =>
        membership.condominium.id === selectedCondominiumId &&
        membership.role === "admin"
    );

  // O condomínio em exibição vem do contexto de autenticação; aqui só sobra reagir ao perfil.
  useEffect(() => {
    if (profile.status === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (profile.status === "failed") {
      setState({ status: "failed", message: MESSAGE_LOAD_FAILED });
      return;
    }
    if (profile.profile.memberships.length === 0) {
      setState({ status: "noCondominium" });
    }
  }, [profile]);

  const load = useCallback(async (condominiumId: string) => {
    setState({ status: "loading" });
    try {
      const notices = await listNotices(condominiumId);
      if (mounted.current) {
        setState({ status: "ready", notices });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        setState({
          status: "failed",
          message: messageFor(error, MESSAGE_LOAD_FAILED),
        });
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCondominiumId === null) {
      return;
    }
    void load(selectedCondominiumId);
  }, [selectedCondominiumId, load]);

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null) {
      void load(selectedCondominiumId);
    }
  }, [selectedCondominiumId, load]);

  const openForm = useCallback(() => {
    setFormErrors({});
    setSubmitError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (!submittingRef.current) {
      setFormOpen(false);
    }
  }, []);

  /**
   * Publica e insere o aviso na lista local, reordenando — sem buscar tudo de novo.
   * É isso que faz o aviso aparecer no topo imediatamente (FR-024).
   */
  const publish = useCallback(
    (input: NewNotice) => {
      if (submittingRef.current || selectedCondominiumId === null) {
        return;
      }

      const errors = validateNewNotice(input);
      if (!hasNoErrors(errors)) {
        setFormErrors(errors);
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setFormErrors({});

      publicarNoServico(selectedCondominiumId, {
        ...input,
        title: input.title.trim(),
        date: input.date.trim(),
      })
        .then((created) => {
          if (!mounted.current) {
            return;
          }
          setState((current) =>
            current.status === "ready"
              ? {
                status: "ready",
                notices: sortNewestFirst([created, ...current.notices]),
              }
              : current
          );
          setFormOpen(false);
        })
        .catch((error: unknown) => {
          if (mounted.current) {
            setSubmitError(messageFor(error, MESSAGE_PUBLISH_FAILED));
          }
        })
        .finally(() => {
          submittingRef.current = false;
          if (mounted.current) {
            setSubmitting(false);
          }
        });
    },
    [selectedCondominiumId]
  );

  return {
    state,
    canPublish,
    formOpen,
    formErrors,
    submitting,
    submitError,
    openForm,
    closeForm,
    publish,
    reload,
  };
}
