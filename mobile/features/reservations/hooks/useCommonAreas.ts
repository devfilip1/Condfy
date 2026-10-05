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

export interface Condominium {
  id: string;
  name: string;
}

export interface UseCommonAreasResult {
  state: CatalogueState;
  /** Todos os condomínios da pessoa. Menos de dois significa não mostrar seletor (FR-020). */
  condominiums: Condominium[];
  /** O que está valendo; `null` enquanto o perfil ainda não chegou. */
  selectedCondominiumId: string | null;
  /** Troca o condomínio em exibição e lembra a escolha (FR-019, FR-022). */
  selectCondominium: (condominiumId: string) => void;
  reload: () => void;
}

function messageFor(error: unknown): string {
  if (error instanceof HttpError && error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  return MESSAGE_LOAD_FAILED;
}

export function useCommonAreas(): UseCommonAreasResult {
  const { profile, selectedCondominiumId, selectCondominium } = useAuth();
  const [state, setState] = useState<CatalogueState>({ status: "loading" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const condominiums: Condominium[] =
    profile.status === "ready"
      ? profile.profile.memberships.map((membership) => membership.condominium)
      : [];

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

  return {
    state,
    condominiums,
    selectedCondominiumId: selectedCondominiumId,
    selectCondominium,
    reload,
  };
}
