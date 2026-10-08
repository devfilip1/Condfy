import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { HttpError, useAuth } from "@/features/auth";
import {
  StaffMember,
  StaffRole,
  fieldErrorsOf,
  hasAdministrator,
  validateProvisionalPassword,
} from "@/features/staff/domain/staff";
import { failureMessage } from "@/features/staff/hooks/failureMessage";
import {
  changeStaffRole,
  fetchStaff,
  removeStaffMember,
  setProvisionalPassword as definirNoServico,
} from "@/features/staff/services/staffService";

/**
 * Estado da tela de UMA pessoa com cargo: mudar o cargo, definir outra password provisória e
 * tirá-la do condomínio.
 *
 * Concentra estado e orquestração; não devolve JSX e não importa componente visual (constituição,
 * Princípio I). Cada uma das três ações tem o próprio "em andamento" e o próprio erro: uma não
 * trava nem apaga a mensagem da outra.
 */

export const MESSAGE_LOAD_FAILED =
  "Couldn't load this person. Check your connection and try again.";
export const MESSAGE_ROLE_FAILED = "Couldn't change the role. Try again.";
export const MESSAGE_PASSWORD_FAILED = "Couldn't set the password. Try again.";
export const MESSAGE_REMOVE_FAILED = "Couldn't remove this person. Try again.";
export const MESSAGE_PASSWORD_SET =
  "New provisional password set. The previous one no longer works.";

export type StaffMemberState =
  | { status: "loading" }
  | { status: "ready"; member: StaffMember }
  /** A lista carregou e a pessoa não está nela: foi removida, ou nunca teve cargo aqui. */
  | { status: "missing" }
  | { status: "failed"; message: string };

export interface UseStaffMemberResult {
  state: StaffMemberState;
  canManage: boolean;
  reload: () => void;

  /** OUTRA pessoa é a administradora: a opção "Administrator" fica indisponível (FR-034). */
  administratorTaken: boolean;
  changingRole: boolean;
  roleError: string | null;
  changeRole: (role: StaffRole) => void;

  /** O que foi digitado para a nova password provisória. Limpo depois de definida. */
  password: string;
  setPassword: (value: string) => void;
  settingPassword: boolean;
  passwordError: string | null;
  /** Confirmação de que a password foi definida; some quando se digita de novo. */
  passwordNote: string | null;
  submitPassword: () => void;

  confirmingRemoval: boolean;
  removing: boolean;
  removeError: string | null;
  askRemoval: () => void;
  cancelRemoval: () => void;
  confirmRemoval: () => void;
}

export function useStaffMember(userId: string): UseStaffMemberResult {
  const { selectedCondominiumId, currentMembership } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<StaffMemberState>({ status: "loading" });
  const [administratorTaken, setAdministratorTaken] = useState(false);

  const [changingRole, setChangingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [password, setPasswordValue] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNote, setPasswordNote] = useState<string | null>(null);

  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  /** Uma ação por vez: o ref trava na hora, antes do próximo render. */
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canManage = currentMembership?.role === "manager";

  // Não existe rota de "uma pessoa": ela é procurada na lista, que é pequena e já diz também se
  // outra pessoa é a administradora.
  const load = useCallback(
    async (condominiumId: string) => {
      setState({ status: "loading" });
      try {
        const staff = await fetchStaff(condominiumId);
        if (!mounted.current) {
          return;
        }
        const member = staff.find((item) => item.userId === userId);
        setAdministratorTaken(hasAdministrator(staff, userId));
        setState(member ? { status: "ready", member } : { status: "missing" });
      } catch (error: unknown) {
        if (mounted.current) {
          setState({
            status: "failed",
            message: failureMessage(error, MESSAGE_LOAD_FAILED),
          });
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    if (selectedCondominiumId === null || !canManage) {
      return;
    }
    void load(selectedCondominiumId);
  }, [selectedCondominiumId, canManage, load]);

  const reload = useCallback(() => {
    if (selectedCondominiumId !== null) {
      void load(selectedCondominiumId);
    }
  }, [selectedCondominiumId, load]);

  const currentRole = state.status === "ready" ? state.member.role : null;

  const changeRole = useCallback(
    (role: StaffRole) => {
      if (
        running.current ||
        selectedCondominiumId === null ||
        currentRole === null ||
        role === currentRole
      ) {
        return;
      }

      running.current = true;
      setChangingRole(true);
      setRoleError(null);

      changeStaffRole(selectedCondominiumId, userId, role)
        .then((member) => {
          if (mounted.current) {
            setState({ status: "ready", member });
          }
        })
        .catch((error: unknown) => {
          if (!mounted.current) {
            return;
          }
          // "Já existe um administrador" chega como erro do campo `role`.
          const fields =
            error instanceof HttpError && error.type === "validation"
              ? fieldErrorsOf(error.body)
              : null;
          setRoleError(fields?.role ?? failureMessage(error, MESSAGE_ROLE_FAILED));
        })
        .finally(() => {
          running.current = false;
          if (mounted.current) {
            setChangingRole(false);
          }
        });
    },
    [selectedCondominiumId, userId, currentRole]
  );

  const setPassword = useCallback((value: string) => {
    setPasswordValue(value);
    setPasswordNote(null);
  }, []);

  const submitPassword = useCallback(() => {
    if (running.current || selectedCondominiumId === null) {
      return;
    }

    const invalid = validateProvisionalPassword(password);
    if (invalid) {
      setPasswordError(invalid);
      return;
    }

    running.current = true;
    setSettingPassword(true);
    setPasswordError(null);
    setPasswordNote(null);

    definirNoServico(selectedCondominiumId, userId, password)
      .then(() => {
        if (mounted.current) {
          // A password não fica na tela depois de definida (FR-019).
          setPasswordValue("");
          setPasswordNote(MESSAGE_PASSWORD_SET);
        }
      })
      .catch((error: unknown) => {
        if (!mounted.current) {
          return;
        }
        const fields =
          error instanceof HttpError && error.type === "validation"
            ? fieldErrorsOf(error.body)
            : null;
        setPasswordError(
          fields?.password ?? failureMessage(error, MESSAGE_PASSWORD_FAILED)
        );
        // `409`: a pessoa escolheu a própria password no meio do caminho. Recarregar tira o
        // campo da tela, que é o estado certo a partir de agora.
        if (error instanceof HttpError && error.type === "conflict") {
          void load(selectedCondominiumId);
        }
      })
      .finally(() => {
        running.current = false;
        if (mounted.current) {
          setSettingPassword(false);
        }
      });
  }, [selectedCondominiumId, userId, password, load]);

  const askRemoval = useCallback(() => {
    setRemoveError(null);
    setConfirmingRemoval(true);
  }, []);

  const cancelRemoval = useCallback(() => {
    if (!running.current) {
      setConfirmingRemoval(false);
    }
  }, []);

  const confirmRemoval = useCallback(() => {
    if (running.current || selectedCondominiumId === null) {
      return;
    }

    running.current = true;
    setRemoving(true);
    setRemoveError(null);

    removeStaffMember(selectedCondominiumId, userId)
      .then(() => {
        // A lista recarrega sozinha ao voltar a ser a tela da frente.
        router.back();
      })
      .catch((error: unknown) => {
        if (mounted.current) {
          setRemoveError(failureMessage(error, MESSAGE_REMOVE_FAILED));
        }
      })
      .finally(() => {
        running.current = false;
        if (mounted.current) {
          setRemoving(false);
        }
      });
  }, [selectedCondominiumId, userId, router]);

  return {
    state,
    canManage,
    reload,
    administratorTaken,
    changingRole,
    roleError,
    changeRole,
    password,
    setPassword,
    settingPassword,
    passwordError,
    passwordNote,
    submitPassword,
    confirmingRemoval,
    removing,
    removeError,
    askRemoval,
    cancelRemoval,
    confirmRemoval,
  };
}
