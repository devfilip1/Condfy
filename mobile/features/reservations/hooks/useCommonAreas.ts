import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import { listCommonAreas } from "@/features/reservations/services/commonAreaService";

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

/**
 * Os quatro estados são exaustivos e mutuamente exclusivos. É isso que torna a FR-010 verificável:
 * não existe combinação de flags que renderize uma tela em branco.
 */
export type CatalogueState =
  | { status: "loading" }
  /** Autenticado, mas sem vínculo com condomínio nenhum. */
  | { status: "noCondominium" }
  /** `areas` vazia é o caso "condomínio sem locais disponíveis", não um erro. */
  | { status: "ready"; areas: CommonArea[] }
  | { status: "failed"; message: string };

export interface UseCommonAreasResult {
  state: CatalogueState;
  reload: () => void;
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
  const { profile, selectedCondominiumId } = useAuth();
  const [state, setState] = useState<CatalogueState>({ status: "loading" });
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

  return { state, reload };
}
