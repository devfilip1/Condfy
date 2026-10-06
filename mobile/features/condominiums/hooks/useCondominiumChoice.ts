import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";

import { ProfileMembership, useAuth } from "@/features/auth";

/**
 * Estado da tela de escolha de condomínio.
 *
 * Concentra estado e orquestração; não devolve JSX e não importa componente visual (constituição,
 * Princípio I).
 *
 * Não chama serviço nenhum, e isso é de propósito: os condomínios da pessoa são os vínculos do
 * perfil, que o contexto de autenticação já carregou. A tela serve a dois momentos com os mesmos
 * cards — escolher ao entrar e trocar a partir da home — e a única diferença entre eles é se dá
 * para sair sem escolher, que o contexto já sabe: há ou não há um condomínio atual.
 *
 * A escolha é conveniência de tela, NUNCA permissão: o servidor confere o vínculo a cada pedido,
 * seja qual for o condomínio que o aplicativo tenha selecionado (ADR 0013).
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load your condominiums. Check your connection and try again.";

/** Os três estados são exaustivos: nenhuma combinação renderiza tela em branco (FR-015). */
export type ChoiceState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | {
      status: "ready";
      /** Já na ordem do servidor: por nome do condomínio. */
      memberships: ProfileMembership[];
      /** O condomínio em que a pessoa está, ou `null` quando ainda não escolheu. */
      currentId: string | null;
    };

export interface UseCondominiumChoiceResult {
  state: ChoiceState;
  /** `true` quando há um condomínio atual para onde voltar — a tela foi aberta pela home. */
  canDismiss: boolean;
  /** Entra no condomínio e vai para a home. Um segundo toque é ignorado. */
  choose: (condominiumId: string) => void;
  /** Volta sem mudar nada. Só faz sentido com `canDismiss`. */
  dismiss: () => void;
  /** Tenta carregar o perfil de novo depois de uma falha. */
  retry: () => void;
  signOut: () => void;
}

export function useCondominiumChoice(): UseCondominiumChoiceResult {
  const {
    profile,
    selectedCondominiumId,
    selectCondominium,
    reloadProfile,
    signOut,
  } = useAuth();
  const router = useRouter();
  /** Trava contra o toque duplo: a navegação leva um instante, e o card continua na tela. */
  const choosing = useRef(false);

  let state: ChoiceState;
  if (profile.status === "loading") {
    state = { status: "loading" };
  } else if (profile.status === "failed") {
    state = { status: "failed", message: MESSAGE_LOAD_FAILED };
  } else {
    state = {
      status: "ready",
      memberships: profile.profile.memberships,
      currentId: selectedCondominiumId,
    };
  }

  const canDismiss = selectedCondominiumId !== null;

  const choose = useCallback(
    (condominiumId: string) => {
      if (choosing.current) {
        return;
      }
      choosing.current = true;
      selectCondominium(condominiumId);
      // `dismissTo`, e não `replace`: quando a tela foi aberta pela home, a home já está embaixo na
      // pilha, e trocar esta por outra home deixaria duas — "voltar" da nova cairia na antiga.
      // Sem home embaixo (quem acabou de entrar), `dismissTo` se comporta como `replace`.
      router.dismissTo("/");
    },
    [selectCondominium, router]
  );

  const dismiss = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  return {
    state,
    canDismiss,
    choose,
    dismiss,
    retry: reloadProfile,
    signOut,
  };
}
