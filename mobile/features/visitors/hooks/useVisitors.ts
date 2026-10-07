import { useCallback, useEffect, useRef, useState } from "react";

import {
  FormErrors,
  NewVisitor,
  OpenPass,
  Visitor,
  VisitorUnit,
  isFormErrors,
  isPassExpired,
  hasNoErrors,
  sortByExpectedDate,
  validateNewVisitor,
} from "@/features/visitors/domain/visitor";
import { HttpError, useAuth } from "@/features/auth";
import {
  PassTarget,
  sharePassPicture,
} from "@/features/visitors/services/passSharing";
import { todayISODate } from "@/shared/lib/calendar";
import {
  addVisitor as adicionarNoServico,
  listCondominiumUnits,
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
/**
 * A MESMA lista vazia a cada render. O formulário limpa os campos quando `units` muda, então um
 * `[]` novo por render apagaria o que a pessoa está digitando.
 */
const NO_UNITS: VisitorUnit[] = [];

const MESSAGE_PASS_SAVED =
  "Sharing isn't available here, so the pass was saved as a picture.";
const MESSAGE_PASS_UNAVAILABLE =
  "Couldn't share or save the pass on this device.";
/** O nome do arquivo não leva dado de ninguém: a imagem é encaminhada e o nome vai junto. */
const PASS_FILE_NAME = "condfy-pass.png";

const MESSAGE_NO_UNIT_RESIDENT =
  "You do not live in any unit, so you cannot register a visitor.";
const MESSAGE_NO_UNIT_CONDOMINIUM =
  "This condominium has no units registered yet.";
const MESSAGE_UNITS_FAILED =
  "Couldn't load the units. Close this form and open it again.";

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
  /**
   * As unidades que o formulário oferece: para a moradora, onde ela mora; para o administrador,
   * todas as do condomínio (ADR 0009).
   */
  units: VisitorUnit[];
  /** O que dizer quando `units` está vazia — o motivo muda com o cargo e com uma falha de carga. */
  unitsHint: string;
  requestRemoval: (visitor: Visitor) => void;
  cancelRemoval: () => void;
  confirmRemoval: () => void;

  /** O comprovante aberto, ou `null`. Abre sozinho depois de um cadastro que deu certo. */
  openPass: OpenPass | null;
  /** Abre o comprovante de uma visita. Não faz nada numa visita que veio sem código. */
  showPass: (visitor: Visitor) => void;
  closePass: () => void;
  /** Captura o quadrado indicado e entrega a imagem ao aparelho. */
  sharePass: (target: PassTarget) => void;
  /** Compartilhamento em andamento: bloqueia um segundo toque. */
  sharing: boolean;
  /** O que dizer embaixo do comprovante depois de uma tentativa de compartilhar, ou `null`. */
  shareNotice: string | null;
}

/**
 * Concentra state e orquestração da tela de Visitantes.
 * Não retorna JSX e não importa componentes.
 */
export function useVisitors(): UseVisitorsResult {
  const {
    profile,
    currentMembership,
    selectedCondominiumId,
    managesSelectedCondominium,
  } = useAuth();
  const [list, setList] = useState<ListState>({ status: "loading" });
  /** A visita cujo comprovante está aberto, ou `null`. */
  const [passVisitor, setPassVisitor] = useState<Visitor | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const sharingRef = useRef(false);
  /** As unidades do condomínio, que só o administrador busca. `null` é "não carregou". */
  const [condominiumUnits, setCondominiumUnits] = useState<
    VisitorUnit[] | null
  >(null);
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

  /**
   * O administrador não mora em unidade nenhuma, então o perfil dele não traz de onde escolher: as
   * unidades do condomínio vêm de uma rota própria, que só responde a ele. Quem decide se a pessoa
   * pode pedir é o servidor — o cargo lido aqui só evita um pedido que voltaria recusado.
   */
  const loadCondominiumUnits = useCallback(() => {
    if (!managesSelectedCondominium || selectedCondominiumId === null) {
      setCondominiumUnits(null);
      return;
    }
    listCondominiumUnits(selectedCondominiumId)
      .then((units) => {
        if (mounted.current) {
          setCondominiumUnits(units);
        }
      })
      .catch(() => {
        if (mounted.current) {
          setCondominiumUnits(null);
        }
      });
  }, [managesSelectedCondominium, selectedCondominiumId]);

  useEffect(() => {
    loadCondominiumUnits();
  }, [loadCondominiumUnits]);

  const openForm = useCallback(() => {
    setFormErrors({});
    setSubmitError(null);
    setFormOpen(true);
    // Se a carga falhou, abrir o formulário de novo é a nova tentativa.
    if (managesSelectedCondominium && condominiumUnits === null) {
      loadCondominiumUnits();
    }
  }, [managesSelectedCondominium, condominiumUnits, loadCondominiumUnits]);

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
        // O comprovante abre sozinho, com a visita que o SERVIDOR devolveu — é ela que traz o
        // código. Uma falha cai no `catch` abaixo e não abre nada (FR-016, FR-017).
        if (created.passCode) {
          setShareNotice(null);
          setPassVisitor(created);
        }
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

  /* ------------------------------------------------------------------------ */
  /* O comprovante                                                            */
  /* ------------------------------------------------------------------------ */

  /**
   * Abre o comprovante de uma visita — a que acabou de ser cadastrada, ou uma da lista.
   *
   * Quem pode abrir já foi decidido pelo servidor: o código só chega em quem autorizou a visita.
   * Aqui não se compara identidade nenhuma, e uma visita sem código não abre nada.
   */
  const showPass = useCallback((visitor: Visitor) => {
    if (!visitor.passCode) {
      return;
    }
    setShareNotice(null);
    setPassVisitor(visitor);
  }, []);

  const closePass = useCallback(() => {
    setShareNotice(null);
    setPassVisitor(null);
  }, []);

  /**
   * Compartilha o comprovante aberto como uma imagem. Quem captura e entrega ao aparelho é o
   * serviço; este hook não conhece as bibliotecas que fazem isso.
   *
   * O app não manda o comprovante a lugar nenhum por conta própria: ele sai do aparelho só pelo
   * destino que a pessoa escolher (FR-027).
   */
  const sharePass = useCallback(
    (target: PassTarget) => {
      // O ref barra o segundo toque antes mesmo de o state re-renderizar.
      if (sharingRef.current || passVisitor === null) {
        return;
      }
      // Comprovante vencido não se compartilha, mesmo que o botão chegasse a aparecer.
      if (isPassExpired(passVisitor, todayISODate())) {
        return;
      }

      sharingRef.current = true;
      setSharing(true);
      setShareNotice(null);

      void sharePassPicture(target, PASS_FILE_NAME)
        .then((outcome) => {
          if (!mounted.current) {
            return;
          }
          // Compartilhado ou desistido: nada a dizer, o comprovante continua aberto.
          if (outcome === "saved") {
            setShareNotice(MESSAGE_PASS_SAVED);
          } else if (outcome === "unavailable") {
            setShareNotice(MESSAGE_PASS_UNAVAILABLE);
          }
        })
        .finally(() => {
          sharingRef.current = false;
          if (mounted.current) {
            setSharing(false);
          }
        });
    },
    [passVisitor]
  );

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
   * Para a moradora vêm do perfil (`GET /me`), e não de uma chamada própria: o tipo é da feature de
   * autenticação, que é dona dele (Princípio III). Para o administrador, que não mora em nenhuma,
   * são todas as do condomínio — ele libera pessoas para a unidade que escolher.
   */
  const units: VisitorUnit[] = managesSelectedCondominium
    ? (condominiumUnits ?? NO_UNITS)
    : (currentMembership?.units ?? NO_UNITS);

  const unitsHint = !managesSelectedCondominium
    ? MESSAGE_NO_UNIT_RESIDENT
    : condominiumUnits === null
      ? MESSAGE_UNITS_FAILED
      : MESSAGE_NO_UNIT_CONDOMINIUM;

  /**
   * A lista como a tela a mostra: só os visitantes do condomínio em que a pessoa está.
   *
   * **Isto é um filtro DE TELA, não a proteção.** A proteção é do servidor: `GET /visitors` só
   * devolve o que esta pessoa pode ver — tudo do condomínio para o administrador, só as visitas que
   * ela mesma autorizou para a moradora. Mas ele devolve isso de TODOS os condomínios dela de uma vez, e
   * o filtro faz esta tela concordar com o resto do aplicativo sobre qual é o prédio em exibição.
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

  /**
   * O comprovante como a tela o desenha. O nome do condomínio é o DA VISITA, procurado no perfil
   * pelo id que ela carrega — e não o do condomínio em exibição —, para um comprovante nunca dizer
   * o prédio errado (FR-006). Se o perfil não tiver esse condomínio, não há o que mostrar.
   */
  const passCondominiumName =
    passVisitor !== null && profile.status === "ready"
      ? (profile.profile.memberships.find(
          (membership) =>
            membership.condominium.id === passVisitor.condominiumId
        )?.condominium.name ?? null)
      : null;

  const openPass: OpenPass | null =
    passVisitor !== null && passCondominiumName !== null
      ? {
          visitor: passVisitor,
          condominiumName: passCondominiumName,
          expired: isPassExpired(passVisitor, todayISODate()),
        }
      : null;

  return {
    openPass,
    showPass,
    closePass,
    sharePass,
    sharing,
    shareNotice,
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
    unitsHint,
    requestRemoval,
    cancelRemoval,
    confirmRemoval,
  };
}

export default useVisitors;
