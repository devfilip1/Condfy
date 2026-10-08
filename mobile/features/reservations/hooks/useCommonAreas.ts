import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, actsInCondominium, useAuth } from "@/features/auth";
import {
  PhotoSource,
  SelectedPhoto,
  pickPhoto as pickPhotoOnDevice,
} from "@/features/condominiums";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import {
  FormErrors,
  hasNoErrors,
  isFormErrors,
  normalizeUsageFee,
  validateNewCommonArea,
} from "@/features/reservations/domain/newCommonArea";
import {
  commonAreaPhotoUri,
  createCommonArea,
  listCommonAreas,
} from "@/features/reservations/services/commonAreaService";

/**
 * Estado do catálogo de áreas comuns.
 *
 * Concentra busca, estado e derivação; não devolve JSX e não importa componente visual
 * (constituição, Princípio I).
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load the places. Check your connection and try again.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_CREATE_OFFLINE =
  "Place not created. Check your connection and try again.";
export const MESSAGE_CREATE_FAILED =
  "Place not created. Something went wrong on the server.";
export const MESSAGE_PHOTO_DENIED =
  "Allow access to the camera or photos to add a picture.";

/**
 * Os quatro estados são exaustivos e mutuamente exclusivos. É isso que torna a FR-010 verificável:
 * não existe combinação de flags que renderize uma tela em branco.
 */
export type CatalogueState =
  | { status: "loading" }
  /** Autenticado, mas sem vínculo com condomínio nenhum. */
  | { status: "noCondominium" }
  /** `areas` vazia é o caso "condomínio sem local cadastrado", não um erro. */
  | { status: "ready"; areas: CommonArea[] }
  | { status: "failed"; message: string };

export interface UseCommonAreasResult {
  state: CatalogueState;
  /**
   * `true` para o administrador DO CONDOMÍNIO EM TELA. Serve a uma decisão só: o toque num local
   * indisponível abre a tela de reserva (para ele religar) ou explica que não dá. É cortesia de
   * interface — a rota de reserva recusa quem não é administrador de qualquer jeito.
   */
  canManage: boolean;
  /** O endereço completo da foto de um local, já resolvido entre as duas origens possíveis. */
  photoUriOf: (area: CommonArea) => string | null;
  reload: () => void;

  /**
   * `true` só para o SÍNDICO do condomínio em tela: criar um local é dele, e não do administrador.
   * Cortesia de interface — a tela oferece ou esconde o botão; quem recusa de verdade é a API.
   */
  canCreate: boolean;
  /**
   * A pessoa pode RESERVAR no condomínio em tela. `false` para o porteiro, que entra neste módulo
   * só para consultar — ver os locais e se um dia está cheio. Com `false` a tela não mostra "minhas
   * reservas": ele não reserva, então não tem nenhuma para listar.
   *
   * Cortesia de interface. Quem recusa de verdade é a API.
   */
  canBook: boolean;
  formOpen: boolean;
  /** A foto já escolhida para o local em preenchimento, ou `null`. */
  formPhoto: SelectedPhoto | null;
  formErrors: FormErrors;
  /** Envio em andamento: bloqueia um segundo envio. */
  submitting: boolean;
  /** Falha que não é de um field (rede ou servidor). */
  submitError: string | null;
  openForm: () => void;
  closeForm: () => void;
  /** Abre a câmera ou a galeria e guarda a foto escolhida no formulário. */
  pickPhoto: (source: PhotoSource) => void;
  removePhoto: () => void;
  /** A foto vem de `formPhoto`; o formulário só entrega o texto. */
  create: (input: { name: string; usageFee: string }) => void;
}

/** Os errors de field de um `400`, quando o body veio no formato do contrato. */
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

function messageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  return MESSAGE_LOAD_FAILED;
}

export function useCommonAreas(): UseCommonAreasResult {
  // Em qual condomínio a pessoa está é decidido uma vez, para o aplicativo inteiro, na tela de
  // escolha (feature 009). Aqui ele só é lido — a faixa de troca que esta tela tinha saiu.
  const {
    profile,
    selectedCondominiumId,
    currentMembership,
    managesSelectedCondominium,
  } = useAuth();
  const [state, setState] = useState<CatalogueState>({ status: "loading" });
  const [formOpen, setFormOpen] = useState(false);
  const [formPhoto, setFormPhoto] = useState<SelectedPhoto | null>(null);
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

  // A escolha do condomínio vive no contexto de autenticação desde a feature 006: aqui só sobra
  // refletir o que o perfil diz sobre carregar, falhar ou não ter vínculo nenhum.
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
      const areas = await listCommonAreas(condominiumId);
      if (mounted.current) {
        setState({ status: "ready", areas });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        setState({ status: "failed", message: messageFor(error) });
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

  /* ------------------------------------------------------------------------ */
  /* Criar um local                                                           */
  /* ------------------------------------------------------------------------ */

  const openForm = useCallback(() => {
    setFormPhoto(null);
    setFormErrors({});
    setSubmitError(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    // Com o envio em andamento, o formulário só fecha quando a resposta chegar.
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
      setFormErrors((current) => {
        const { photo: _photo, ...rest } = current;
        return rest;
      });
    });
  }, []);

  const removePhoto = useCallback(() => {
    if (!submittingRef.current) {
      setFormPhoto(null);
    }
  }, []);

  /**
   * Cria o local e RECARREGA o catálogo, em vez de encaixar o item na lista à mão: a ordem é por
   * nome e quem ordena é o servidor, e um estado montado aqui seria uma segunda verdade sobre ela.
   *
   * Uma falha deixa o formulário aberto com o que estava nele, a foto incluída. O ref barra o
   * segundo toque antes mesmo de o state re-renderizar.
   */
  const create = useCallback(
    (input: { name: string; usageFee: string }) => {
      if (submittingRef.current || selectedCondominiumId === null) {
        return;
      }

      const errors = validateNewCommonArea({ ...input, photo: formPhoto });
      if (!hasNoErrors(errors) || formPhoto === null) {
        setFormErrors(errors);
        return;
      }

      const condominiumId = selectedCondominiumId;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setFormErrors({});

      createCommonArea(condominiumId, {
        name: input.name.trim(),
        usageFee: normalizeUsageFee(input.usageFee),
        photo: formPhoto.base64,
      })
        .then(async () => {
          if (!mounted.current) {
            return;
          }
          setFormOpen(false);
          await load(condominiumId);
        })
        .catch((error: unknown) => {
          if (!mounted.current) {
            return;
          }
          // O servidor confere o que o app não consegue — que os bytes são uma imagem, e que o nome
          // ainda não existe no condomínio. Quando ele recusa um field, a mensagem dele vai para o
          // lugar do field.
          const serverErrors = fieldErrorsFrom(error);
          if (serverErrors) {
            setFormErrors(serverErrors);
          } else if (error instanceof HttpError && error.type === "session") {
            // Quem reage é o AuthProvider, levando à tela de entrada: nada a mostrar aqui.
          } else if (error instanceof HttpError && error.type === "network") {
            setSubmitError(MESSAGE_CREATE_OFFLINE);
          } else {
            setSubmitError(MESSAGE_CREATE_FAILED);
          }
        })
        .finally(() => {
          submittingRef.current = false;
          if (mounted.current) {
            setSubmitting(false);
          }
        });
    },
    [selectedCondominiumId, formPhoto, load]
  );

  return {
    state,
    canManage: managesSelectedCondominium,
    photoUriOf: commonAreaPhotoUri,
    reload,
    // Pelo NOME do cargo, e não por `managesCondominium`: criar um local é só do síndico (ADR 0017).
    canCreate: currentMembership?.role === "manager",
    canBook:
      currentMembership !== null && actsInCondominium(currentMembership.role),
    formOpen,
    formPhoto,
    formErrors,
    submitting,
    submitError,
    openForm,
    closeForm,
    pickPhoto,
    removePhoto,
    create,
  };
}
