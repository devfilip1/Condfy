import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, apiUrl, useAuth } from "@/features/auth";
import {
  FormErrors,
  FoundItem,
  SelectedPhoto,
  hasNoErrors,
  isFormErrors,
  nextStatus,
  validateNewFoundItem,
} from "@/features/lostAndFound/domain/foundItem";
import {
  changeFoundItemStatus,
  listFoundItems,
  postFoundItem,
} from "@/features/lostAndFound/services/foundItemService";
import {
  PhotoSource,
  pickPhoto as pickPhotoOnDevice,
} from "@/features/lostAndFound/services/photoPicker";

/**
 * Estado da prateleira de achados e perdidos.
 *
 * Concentra busca, estado e derivação; não devolve JSX e não importa componente visual
 * (constituição, Princípio I).
 *
 * **Duas coisas que este hook de propósito NÃO decide:**
 *
 * - *Quem pode postar ou trocar o status.* `canManage` só serve para a tela oferecer ou esconder a
 *   ação. Quem recusa de verdade é a API, que responde `403` a um morador que chegue na rota por
 *   outro caminho (FR-025, FR-032).
 * - *Se a foto é mesmo uma imagem.* Aqui se confere que há uma e o tamanho dela; os bytes só o
 *   servidor confere.
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load the items. Check your connection and try again.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_POST_FAILED = "Couldn't post the item. Try again.";
export const MESSAGE_STATUS_FAILED = "Couldn't change the status. Try again.";
export const MESSAGE_PHOTO_DENIED =
  "Allow access to the camera or photos to add a picture.";

/** Os quatro estados são exaustivos: nenhuma combinação renderiza tela em branco (FR-017). */
export type ShelfState =
  | { status: "loading" }
  /** Autenticado, mas sem vínculo com condomínio nenhum. */
  | { status: "noCondominium" }
  /** `items` vazia é a prateleira sem nada encontrado, não um erro. */
  | { status: "ready"; items: FoundItem[] }
  | { status: "failed"; message: string };

export interface UseFoundItemsResult {
  state: ShelfState;
  /** `true` só para o administrador DO CONDOMÍNIO EM TELA. Cortesia de interface. */
  canManage: boolean;
  /**
   * `false` para o porteiro, que perdeu achados e perdidos na feature 015. A tela o manda de volta
   * para a home e nenhum pedido é feito. Cortesia: a lista responde `403` a ele de qualquer jeito.
   */
  canRead: boolean;
  reload: () => void;
  /**
   * O endereço completo da foto de um item. O servidor manda um caminho relativo, porque não sabe
   * por qual endereço o aparelho o alcança; juntar os dois é daqui, não de um componente.
   */
  photoUriOf: (item: FoundItem) => string;

  /** O item cuja foto está aberta sozinha, ou `null`. */
  viewingItem: FoundItem | null;
  openPhoto: (item: FoundItem) => void;
  closePhoto: () => void;

  formOpen: boolean;
  /** A foto já escolhida para o item em preenchimento, ou `null`. */
  formPhoto: SelectedPhoto | null;
  formErrors: FormErrors;
  submitting: boolean;
  submitError: string | null;
  openForm: () => void;
  closeForm: () => void;
  /** Abre a câmera ou a galeria e guarda a foto escolhida no formulário. */
  pickPhoto: (source: PhotoSource) => void;
  /** A foto vem de `formPhoto`; o formulário só entrega o texto. */
  post: (input: { description: string; place: string }) => void;

  /** O id do item cuja troca de status está em voo, ou `null`. */
  changingId: string | null;
  /** Recusa de uma troca de status, mostrada acima da lista até a próxima ação. */
  notice: string | null;
  toggleStatus: (item: FoundItem) => void;
}

function photoUriOf(item: FoundItem): string {
  return apiUrl(item.photoPath);
}

function messageFor(error: unknown, fallback: string): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  return fallback;
}

/** Os errors de field que o servidor devolveu num `400`, ou `null` se a falha foi outra. */
function fieldErrorsFrom(error: unknown): FormErrors | null {
  if (!(error instanceof HttpError) || error.type !== "validation") {
    return null;
  }
  const body = error.body;
  if (typeof body !== "object" || body === null || !("errors" in body)) {
    return null;
  }
  const errors = (body as { errors: unknown }).errors;
  return isFormErrors(errors) ? errors : null;
}

export function useFoundItems(): UseFoundItemsResult {
  // Em qual condomínio a pessoa está é decidido uma vez, para o aplicativo inteiro, na tela de
  // escolha (feature 009). Aqui ele só é lido.
  const {
    profile,
    selectedCondominiumId,
    currentMembership,
    managesSelectedCondominium,
  } = useAuth();
  // Só o porteiro não lê a prateleira. Sem vínculo carregado ainda, não há o que recusar.
  const canRead = currentMembership?.role !== "doorman";
  const [state, setState] = useState<ShelfState>({ status: "loading" });
  const [viewingItem, setViewingItem] = useState<FoundItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formPhoto, setFormPhoto] = useState<SelectedPhoto | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const changingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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
      const items = await listFoundItems(condominiumId);
      if (mounted.current) {
        setState({ status: "ready", items });
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
    if (selectedCondominiumId === null || !canRead) {
      return;
    }
    // A recusa falava do condomínio que a pessoa acabou de deixar.
    setNotice(null);
    void load(selectedCondominiumId);
  }, [selectedCondominiumId, canRead, load]);

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null) {
      setNotice(null);
      void load(selectedCondominiumId);
    }
  }, [selectedCondominiumId, load]);

  /* ------------------------------------------------------------------------ */
  /* Ver a foto                                                               */
  /* ------------------------------------------------------------------------ */

  const openPhoto = useCallback((item: FoundItem) => {
    setViewingItem(item);
  }, []);

  const closePhoto = useCallback(() => {
    setViewingItem(null);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Postar                                                                   */
  /* ------------------------------------------------------------------------ */

  const openForm = useCallback(() => {
    setFormPhoto(null);
    setFormErrors({});
    setSubmitError(null);
    setNotice(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (!submittingRef.current) {
      setFormOpen(false);
    }
  }, []);

  const pickPhoto = useCallback((source: PhotoSource) => {
    if (submittingRef.current) {
      return;
    }
    void pickPhotoOnDevice(source).then((result) => {
      if (!mounted.current) {
        return;
      }
      // Fechar o seletor sem escolher não é erro: fica o que já estava.
      if (result.outcome === "cancelled") {
        return;
      }
      if (result.outcome === "denied") {
        setFormErrors((current) => ({
          ...current,
          photo: MESSAGE_PHOTO_DENIED,
        }));
        return;
      }
      setFormPhoto(result.photo);
      // A mensagem de foto que estava na tela falava da ausência ou da foto anterior.
      setFormErrors((current) => {
        const { photo: _photo, ...rest } = current;
        return rest;
      });
    });
  }, []);

  /**
   * Posta e põe o item no topo da lista local, sem buscar tudo de novo: ele é o mais recente por
   * definição, porque o momento da postagem é o relógio do servidor agora (FR-026).
   *
   * Uma falha deixa o formulário aberto com tudo o que estava nele (FR-027).
   */
  const post = useCallback(
    (input: { description: string; place: string }) => {
      if (submittingRef.current || selectedCondominiumId === null) {
        return;
      }

      const errors = validateNewFoundItem({ ...input, photo: formPhoto });
      if (!hasNoErrors(errors) || formPhoto === null) {
        setFormErrors(errors);
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setFormErrors({});

      postFoundItem(selectedCondominiumId, {
        description: input.description.trim(),
        place: input.place.trim(),
        photo: formPhoto.base64,
      })
        .then((created) => {
          if (!mounted.current) {
            return;
          }
          setState((current) =>
            current.status === "ready"
              ? { status: "ready", items: [created, ...current.items] }
              : current
          );
          setFormOpen(false);
        })
        .catch((error: unknown) => {
          if (!mounted.current) {
            return;
          }
          // O servidor confere o que o app não consegue — que os bytes são uma imagem. Quando ele
          // recusa um field, a mensagem dele vai para o lugar do field.
          const serverErrors = fieldErrorsFrom(error);
          if (serverErrors) {
            setFormErrors(serverErrors);
          } else {
            setSubmitError(messageFor(error, MESSAGE_POST_FAILED));
          }
        })
        .finally(() => {
          submittingRef.current = false;
          if (mounted.current) {
            setSubmitting(false);
          }
        });
    },
    [selectedCondominiumId, formPhoto]
  );

  /* ------------------------------------------------------------------------ */
  /* Trocar o status                                                          */
  /* ------------------------------------------------------------------------ */

  /**
   * Leva o item para o outro status e troca SÓ ele na lista, no mesmo lugar, pelo que o servidor
   * devolveu (FR-033). A ordem é por momento de postagem, que a troca não mexe.
   *
   * Uma troca por vez: duas em voo sobre o mesmo item terminariam na ordem em que chegassem, e a
   * tela mostraria o resultado de uma delas sem a pessoa saber de qual.
   */
  const toggleStatus = useCallback(
    (item: FoundItem) => {
      if (changingRef.current || selectedCondominiumId === null) {
        return;
      }
      const condominiumId = selectedCondominiumId;

      changingRef.current = true;
      setChangingId(item.id);
      setNotice(null);

      changeFoundItemStatus(condominiumId, item.id, nextStatus(item.status))
        .then((updated) => {
          if (!mounted.current) {
            return;
          }
          setState((current) =>
            current.status === "ready"
              ? {
                  status: "ready",
                  items: current.items.map((existing) =>
                    existing.id === updated.id ? updated : existing
                  ),
                }
              : current
          );
        })
        .catch(async (error: unknown) => {
          if (!mounted.current) {
            return;
          }
          const message = messageFor(error, MESSAGE_STATUS_FAILED);
          // Fora a falha de rede, uma recusa aqui quer dizer que a tela estava velha — o item sumiu,
          // ou a pessoa deixou de ser administradora. Recarregar junto evita convidar a tentar de
          // novo a mesma coisa.
          if (!(error instanceof HttpError && error.type === "network")) {
            await load(condominiumId);
          }
          if (mounted.current) {
            setNotice(message);
          }
        })
        .finally(() => {
          changingRef.current = false;
          if (mounted.current) {
            setChangingId(null);
          }
        });
    },
    [selectedCondominiumId, load]
  );

  return {
    state,
    canManage: managesSelectedCondominium,
    canRead,
    reload,
    photoUriOf,
    viewingItem,
    openPhoto,
    closePhoto,
    formOpen,
    formPhoto,
    formErrors,
    submitting,
    submitError,
    openForm,
    closeForm,
    pickPhoto,
    post,
    changingId,
    notice,
    toggleStatus,
  };
}
