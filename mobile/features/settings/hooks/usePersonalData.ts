import { ProfileMembership, useAuth } from "@/features/auth";

/**
 * O que o sistema sabe sobre a pessoa, para ela ver.
 *
 * Não chama serviço nenhum: é o perfil que o contexto de autenticação já carregou. Mostra TODOS os
 * vínculos, e não só o do condomínio em que ela está agora — a pergunta aqui é sobre a conta.
 *
 * A password não faz parte disto de forma nenhuma: o perfil não a traz, nem mascarada (FR-010).
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load your data. Check your connection and try again.";

/** Os três estados são exaustivos: nenhuma combinação renderiza tela em branco. */
export type PersonalDataState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | {
      status: "ready";
      name: string;
      email: string;
      memberships: ProfileMembership[];
    };

export interface UsePersonalDataResult {
  state: PersonalDataState;
  retry: () => void;
}

export function usePersonalData(): UsePersonalDataResult {
  const { profile, reloadProfile } = useAuth();

  let state: PersonalDataState;
  if (profile.status === "loading") {
    state = { status: "loading" };
  } else if (profile.status === "failed") {
    state = { status: "failed", message: MESSAGE_LOAD_FAILED };
  } else {
    state = {
      status: "ready",
      name: profile.profile.name,
      email: profile.profile.email,
      memberships: profile.profile.memberships,
    };
  }

  return { state, retry: reloadProfile };
}
