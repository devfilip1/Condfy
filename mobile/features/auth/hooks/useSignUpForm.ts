import { useCallback, useEffect, useRef, useState } from "react";

import {
  DirectoryCondominium,
  DirectoryUnit,
  blocksOf,
  unitsOf,
} from "@/features/auth/domain/directory";
import {
  fetchDirectoryCondominiums,
  fetchDirectoryUnits,
} from "@/features/auth/services/directoryService";

/**
 * As três escolhas do cadastro — condomínio, bloco e apartamento — e as listas por trás delas.
 *
 * Concentra estado e busca; não devolve JSX e não importa componente visual (constituição,
 * Princípio I). Nome, e-mail e password continuam na tela, como sempre foram; enviar continua
 * sendo `useAuth().signUp`.
 *
 * Cada escolha depende da de cima: trocar o condomínio apaga o bloco e o apartamento, e trocar o
 * bloco apaga o apartamento. Um apartamento de outro prédio nunca fica guardado (FR-003).
 */

export const MESSAGE_CONDOMINIUMS_FAILED =
  "Couldn't load the condominiums. Check your connection and try again.";
export const MESSAGE_UNITS_FAILED =
  "Couldn't load the apartments. Check your connection and try again.";

export type CondominiumsState =
  | { status: "loading" }
  | { status: "ready"; condominiums: DirectoryCondominium[] }
  | { status: "failed" };

/** `idle` é "nenhum condomínio escolhido ainda": não há o que buscar. */
export type UnitsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; units: DirectoryUnit[] }
  | { status: "failed" };

export interface UseSignUpFormResult {
  condominiums: CondominiumsState;
  reloadCondominiums: () => void;
  units: UnitsState;
  reloadUnits: () => void;

  condominiumId: string | null;
  block: string | null;
  unitId: string | null;
  chooseCondominium: (id: string) => void;
  chooseBlock: (block: string) => void;
  chooseUnit: (id: string) => void;

  /** Os blocos do condomínio escolhido, em ordem. Vazio se ele não tem blocos. */
  blocks: string[];
  /** Os apartamentos do bloco escolhido — ou todos, num condomínio sem blocos. */
  apartments: DirectoryUnit[];
  /** O condomínio escolhido tem blocos, então o bloco precisa ser escolhido antes do apartamento. */
  needsBlock: boolean;
  /** As listas de que o formulário depende chegaram: sem isso a conta não pode ser criada. */
  canSubmit: boolean;
}

export function useSignUpForm(): UseSignUpFormResult {
  const [condominiums, setCondominiums] = useState<CondominiumsState>({
    status: "loading",
  });
  const [units, setUnits] = useState<UnitsState>({ status: "idle" });
  const [condominiumId, setCondominiumId] = useState<string | null>(null);
  const [block, setBlock] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const mounted = useRef(true);
  /** O condomínio cujas unidades estão sendo buscadas: uma resposta de outro é descartada. */
  const wanted = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadCondominiums = useCallback(() => {
    setCondominiums({ status: "loading" });
    fetchDirectoryCondominiums()
      .then((list) => {
        if (mounted.current) {
          setCondominiums({ status: "ready", condominiums: list });
        }
      })
      .catch(() => {
        if (mounted.current) {
          setCondominiums({ status: "failed" });
        }
      });
  }, []);

  useEffect(() => {
    loadCondominiums();
  }, [loadCondominiums]);

  const loadUnits = useCallback((id: string) => {
    wanted.current = id;
    setUnits({ status: "loading" });
    fetchDirectoryUnits(id)
      .then((list) => {
        // A pessoa pode ter trocado de condomínio enquanto esta resposta vinha.
        if (mounted.current && wanted.current === id) {
          setUnits({ status: "ready", units: list });
        }
      })
      .catch(() => {
        if (mounted.current && wanted.current === id) {
          setUnits({ status: "failed" });
        }
      });
  }, []);

  const chooseCondominium = useCallback(
    (id: string) => {
      setCondominiumId(id);
      // O que dependia do condomínio anterior não vale para este.
      setBlock(null);
      setUnitId(null);
      loadUnits(id);
    },
    [loadUnits]
  );

  const chooseBlock = useCallback((next: string) => {
    setBlock(next);
    setUnitId(null);
  }, []);

  const chooseUnit = useCallback((id: string) => {
    setUnitId(id);
  }, []);

  const reloadUnits = useCallback(() => {
    if (condominiumId !== null) {
      loadUnits(condominiumId);
    }
  }, [condominiumId, loadUnits]);

  const loadedUnits = units.status === "ready" ? units.units : [];
  const blocks = blocksOf(loadedUnits);
  const needsBlock = blocks.length > 0;
  // Sem blocos, as unidades são as de bloco nulo — todas. Com blocos, só depois de escolher um.
  const apartments = needsBlock
    ? block === null
      ? []
      : unitsOf(loadedUnits, block)
    : unitsOf(loadedUnits, null);

  return {
    condominiums,
    reloadCondominiums: loadCondominiums,
    units,
    reloadUnits,
    condominiumId,
    block,
    unitId,
    chooseCondominium,
    chooseBlock,
    chooseUnit,
    blocks,
    apartments,
    needsBlock,
    canSubmit: condominiums.status === "ready",
  };
}
