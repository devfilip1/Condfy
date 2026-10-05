import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import { listCommonAreas } from "@/features/reservations/services/commonAreaService";
import {
  clearSelectedCondominium,
  readSelectedCondominium,
  writeSelectedCondominium,
} from "@/features/reservations/services/selectedCondominium";

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
  const { profile } = useAuth();
  const [state, setState] = useState<CatalogueState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Enquanto o perfil não chega não dá para pedir catálogo nenhum: é dele que sai o condomínio.
  useEffect(() => {
    if (profile.status === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (profile.status === "failed") {
      setState({ status: "failed", message: MESSAGE_LOAD_FAILED });
      return;
    }

    const memberships = profile.profile.memberships;
    if (memberships.length === 0) {
      setSelectedId(null);
      setState({ status: "noCondominium" });
      // Vínculo que acabou não deve deixar palpite guardado para a próxima vez.
      void clearSelectedCondominium();
      return;
    }

    let cancelled = false;
    void (async () => {
      const belongs = (id: string | null): id is string =>
        id !== null &&
        memberships.some((membership) => membership.condominium.id === id);

      // O que já está em uso vence, desde que ainda seja um vínculo válido.
      let next: string | null = null;
      setSelectedId((current) => {
        next = belongs(current) ? current : null;
        return current;
      });

      if (next === null) {
        const stored = await readSelectedCondominium();
        if (cancelled) {
          return;
        }
        if (belongs(stored)) {
          next = stored;
        } else {
          // Palpite apontando para condomínio que não é mais dela: descarta em vez de mostrar
          // catálogo vazio ou alheio (FR-021).
          if (stored !== null) {
            await clearSelectedCondominium();
          }
          next = memberships[0].condominium.id;
        }
      }

      if (!cancelled) {
        setSelectedId(next);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    if (selectedId === null) {
      return;
    }
    void load(selectedId);
  }, [selectedId, load]);

  const reload = useCallback(() => {
    if (selectedId !== null) {
      void load(selectedId);
    }
  }, [selectedId, load]);

  /**
   * Troca o condomínio em exibição. Só aceita um que a pessoa realmente tenha: a escolha é
   * conveniência de tela, e quem decide o que ela pode ver continua sendo o servidor.
   */
  const selectCondominium = useCallback(
    (condominiumId: string) => {
      const allowed = condominiums.some(
        (condominium) => condominium.id === condominiumId
      );
      if (!allowed || condominiumId === selectedId) {
        return;
      }
      setSelectedId(condominiumId);
      void writeSelectedCondominium(condominiumId);
    },
    [condominiums, selectedId]
  );

  return {
    state,
    condominiums,
    selectedCondominiumId: selectedId,
    selectCondominium,
    reload,
  };
}
