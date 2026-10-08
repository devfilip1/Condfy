import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth";
import { StaffMember } from "@/features/staff/domain/staff";
import { failureMessage } from "@/features/staff/hooks/failureMessage";
import { fetchStaff } from "@/features/staff/services/staffService";

/**
 * Estado da lista de cargos do condomínio em tela.
 *
 * Concentra busca e estado; não devolve JSX e não importa componente visual (constituição,
 * Princípio I).
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load roles. Check your connection and try again.";

/** `failed` é diferente de uma lista vazia: "ninguém tem cargo" só vale para uma resposta certa. */
export type StaffListState =
  | { status: "loading" }
  | { status: "ready"; staff: StaffMember[] }
  | { status: "failed"; message: string };

export interface UseStaffResult {
  state: StaffListState;
  /**
   * `true` só para o síndico DO CONDOMÍNIO EM TELA. Compara com `"manager"` de propósito, e não com
   * `managesCondominium`: mexer nos cargos é só dele, o administrador não pode (FR-001).
   *
   * Isto é cortesia de interface. Quem recusa de verdade é a API.
   */
  canManage: boolean;
  reload: () => void;
}

export function useStaff(): UseStaffResult {
  const { selectedCondominiumId, currentMembership } = useAuth();
  const [state, setState] = useState<StaffListState>({ status: "loading" });
  const mounted = useRef(true);
  /** Já houve uma lista na tela: a volta do formulário atualiza sem piscar o carregamento. */
  const loadedOnce = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canManage = currentMembership?.role === "manager";

  const load = useCallback(async (condominiumId: string, quiet: boolean) => {
    if (!quiet) {
      setState({ status: "loading" });
    }
    try {
      const staff = await fetchStaff(condominiumId);
      if (mounted.current) {
        loadedOnce.current = true;
        setState({ status: "ready", staff });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        loadedOnce.current = false;
        setState({
          status: "failed",
          message: failureMessage(error, MESSAGE_LOAD_FAILED),
        });
      }
    }
  }, []);

  // A cada vez que a tela volta a ser a da frente: quem acabou de ser trazido, removido ou teve o
  // cargo trocado numa das outras duas telas aparece na volta.
  useFocusEffect(
    useCallback(() => {
      if (selectedCondominiumId === null || !canManage) {
        return;
      }
      void load(selectedCondominiumId, loadedOnce.current);
    }, [selectedCondominiumId, canManage, load])
  );

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null) {
      void load(selectedCondominiumId, false);
    }
  }, [selectedCondominiumId, load]);

  return { state, canManage, reload };
}
