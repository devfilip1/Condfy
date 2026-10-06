import { useCallback, useEffect, useRef, useState } from "react";

import {
  FormErrors,
  NewVisitor,
  Visitor,
  VisitorUnit,
  isFormErrors,
  hasNoErrors,
  sortByExpectedDate,
  validateNewVisitor,
} from "@/features/visitors/domain/visitor";
import { HttpError, useAuth } from "@/features/auth";
import {
  addVisitor as adicionarNoServico,
  listVisitors,
  removeVisitor as removerNoServico,
} from "@/features/visitors/services/visitorService";

/** Estado da list remota: os três casos são exclusivos (data-model, "Estado da tela"). */
export type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; visitors: Visitor[] };

export const MESSAGE_LOAD_FAILED =
  "Couldn't load visitors. Check your connection and try again.";
const MESSAGE_SAVE_OFFLINE =
  "Visitor not saved. Check your connection and try again.";
const MESSAGE_SAVE_SERVER_ERROR =
  "Visitor not saved. Something went wrong on the server.";
const MESSAGE_REMOVE_FAILED =
  "Visitor not removed. Check your connection and try again.";

export interface UseVisitorsResult {
  list: ListState;
  /** Busca a list de novo; é a ação "tentar novamente" (FR-005). */
  reload: () => void;
  formOpen: boolean;
  formErrors: FormErrors;
  /** Cadastro em andamento: bloqueia um segundo envio (FR-010). */
  submitting: boolean;
  /** Falha do cadastro que não é de um field (rede ou servidor). */
  submitError: string | null;
  pendingRemoval: Visitor | null;
  /** Remoção em andamento: bloqueia uma segunda confirmação. */
  removing: boolean;
  /** Falha da remoção, exibida no diálogo (FR-009). */
  removalError: string | null;
  openForm: () => void;
  closeForm: () => void;
  addVisitor: (input: NewVisitor) => void;
  /** Unidades onde a pessoa mora, para o seletor do formulário (ADR 0009). */
  units: VisitorUnit[];
  requestRemoval: (visitor: Visitor) => void;
  cancelRemoval: () => void;
  confirmRemoval: () => void;
}

/**
 * Concentra state e orquestração da tela de Visitantes.
 * Não retorna JSX e não importa componentes.
 */
export function useVisitors(): UseVisitorsResult {
  const { currentMembership, selectedCondominiumId } = useAuth();
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [formOpen, setFormOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [pendingRemoval, setPendingRemoval] = useState<Visitor | null>(
    null
  );
  const [removing, setRemoving] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const removingRef = useRef(false);

  // Evita atualizar state depois que a tela foi fechada no meio de uma requisição.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    setList({ status: "loading" });
    listVisitors()
      .then((visitors) => {
        if (mounted.current) {
          // A ordem já vem do servidor (FR-016).
          setList({ status: "ready", visitors });
        }
      })
      .catch(() => {
        if (mounted.current) {
          setList({ status: "error" });
        }
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openForm = useCallback(() => {
    setFormErrors({});
    setSubmitError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    // Com o envio em andamento, o formulário só fecha quando a response chegar.
    if (submittingRef.current) {
      return;
    }
    setFormErrors({});
    setSubmitError(null);
    setFormOpen(false);
  }, []);

  const addVisitor = useCallback((input: NewVisitor) => {
    // O ref barra o segundo toque antes mesmo de o state re-renderizar (FR-010).
    if (submittingRef.current) {
      return;
    }

    const errors = validateNewVisitor(input);
    if (!hasNoErrors(errors)) {
      setFormErrors(errors);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    adicionarNoServico({
      ...input,
      name: input.name.trim(),
      expectedDate: input.expectedDate.trim(),
      unitId: input.unitId.trim(),
    })
      .then((created) => {
        if (!mounted.current) {
          return;
        }
        // Insere o registro devolvido e reordena, sem buscar a list de novo (research R-005).
        setList((current) =>
          current.status === "ready"
            ? {
              status: "ready",
              visitors: sortByExpectedDate([
                ...current.visitors,
                created,
              ]),
            }
            : current
        );
        setFormErrors({});
        setFormOpen(false);
      })
      .catch((error: unknown) => {
        if (!mounted.current) {
          return;
        }
        // O formulário continua aberto, com o que foi digitado (FR-008, FR-009).
        if (
          error instanceof HttpError &&
          error.type === "validation" &&
          typeof error.body === "object" &&
          error.body !== null &&
          "errors" in error.body &&
          isFormErrors(error.body.errors)
        ) {
          setFormErrors(error.body.errors);
        } else if (error instanceof HttpError && error.type === "session") {
          // Quem reage é o AuthProvider, levando à tela de input: nada a mostrar aqui.
        } else if (error instanceof HttpError && error.type === "network") {
          setSubmitError(MESSAGE_SAVE_OFFLINE);
        } else {
          setSubmitError(MESSAGE_SAVE_SERVER_ERROR);
        }
      })
      .finally(() => {
        submittingRef.current = false;
        if (mounted.current) {
          setSubmitting(false);
        }
      });
  }, []);

  const requestRemoval = useCallback((visitor: Visitor) => {
    setRemovalError(null);
    setPendingRemoval(visitor);
  }, []);

  const cancelRemoval = useCallback(() => {
    // Com a remoção em andamento, o diálogo só fecha quando a response chegar.
    if (removingRef.current) {
      return;
    }
    setRemovalError(null);
    setPendingRemoval(null);
  }, []);

  const confirmRemoval = useCallback(() => {
    if (removingRef.current || !pendingRemoval) {
      return;
    }
    const id = pendingRemoval.id;

    removingRef.current = true;
    setRemoving(true);
    setRemovalError(null);

    removerNoServico(id)
      .then(() => {
        if (!mounted.current) {
          return;
        }
        // 204 vale também para quem já tinha sido removido em outro aparelho (FR-012).
        setList((current) =>
          current.status === "ready"
            ? {
              status: "ready",
              visitors: current.visitors.filter((v) => v.id !== id),
            }
            : current
        );
        setPendingRemoval(null);
      })
      .catch((error: unknown) => {
        if (!mounted.current) {
          return;
        }
        // Sessão expirada não vira error de remoção: o AuthProvider leva à tela de input.
        if (!(error instanceof HttpError && error.type === "session")) {
          // Diálogo continua aberto e a list fica intacta (FR-009).
          setRemovalError(MESSAGE_REMOVE_FAILED);
        }
      })
      .finally(() => {
        removingRef.current = false;
        if (mounted.current) {
          setRemoving(false);
        }
      });
  }, [pendingRemoval]);

  /**
   * As unidades onde a pessoa mora NO CONDOMÍNIO EM QUE ELA ESTÁ (feature 009). Até então eram as
   * de todos os condomínios dela, e o formulário oferecia a unidade de um prédio dentro de outro.
   *
   * Vem do perfil (`GET /me`), e não de uma chamada própria: o tipo é da feature de autenticação,
   * que é dona dele (Princípio III). Vazia para o administrador sem moradia — e aí o formulário
   * avisa em vez de deixar registrar uma visita que o banco recusaria.
   */
  const units: VisitorUnit[] = currentMembership?.units ?? [];

  /**
   * A lista como a tela a mostra: só os visitantes do condomínio em que a pessoa está.
   *
   * **Isto é um filtro DE TELA, não uma proteção.** `GET /visitors` ainda devolve os visitantes de
   * todos os condomínios — a lacuna registrada em `docs/business-rules.md` desde a feature 003, que
   * depende de decidir o que cada cargo pode ver. O filtro faz esta tela concordar com o resto do
   * aplicativo sobre qual é o prédio; ele não torna visitante nenhum privado, e fechar a lacuna
   * continua sendo trabalho do servidor (feature 009, research R-009).
   *
   * O state guarda a lista inteira e o filtro é aplicado aqui, na saída: trocar de condomínio
   * muda o que aparece sem buscar de novo.
   */
  const visibleList: ListState =
    list.status === "ready"
      ? {
          status: "ready",
          visitors: list.visitors.filter(
            (visitor) => visitor.condominiumId === selectedCondominiumId
          ),
        }
      : list;

  return {
    list: visibleList,
    reload,
    formOpen,
    formErrors,
    submitting,
    submitError,
    pendingRemoval,
    removing,
    removalError,
    openForm,
    closeForm,
    addVisitor,
    units,
    requestRemoval,
    cancelRemoval,
    confirmRemoval,
  };
}

export default useVisitors;
