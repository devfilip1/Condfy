import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { AccountChangeResult, useAuth } from "@/features/auth";
import {
  FieldErrors,
  hasNoErrors,
  validateAccountDeletion,
  validateEmailChange,
  validatePasswordChange,
} from "@/features/settings/domain/account";

/**
 * Estado dos três formulários que mexem na própria conta.
 *
 * Concentram estado e orquestração; não devolvem JSX e não importam componente visual
 * (constituição, Princípio I). Os três têm a mesma forma — campos, erros sob os campos, um erro
 * geral, e "enviando" — e por isso dividem `useSubmit`.
 *
 * Nenhum deles decide se a password atual está certa, se o e-mail está livre ou se a conta pode ser
 * apagada: isso é do servidor. Aqui só se evita enviar o que já se sabe que será recusado.
 */

interface Submission {
  errors: FieldErrors;
  /** Recusa que não é de um campo: sem conexão, tentativas demais, conta que não pode ser apagada. */
  submitError: string | null;
  submitting: boolean;
}

/**
 * O que os três formulários têm em comum: validar, travar o segundo toque, chamar a ação e pôr
 * cada tipo de falha no lugar dela. Uma falha deixa os campos como estavam — eles são de quem
 * chama.
 */
function useSubmit() {
  const [state, setState] = useState<Submission>({
    errors: {},
    submitError: null,
    submitting: false,
  });
  const running = useRef(false);

  const run = useCallback(
    async (
      validation: FieldErrors,
      action: () => Promise<AccountChangeResult>
    ): Promise<boolean> => {
      if (running.current) {
        return false;
      }
      if (!hasNoErrors(validation)) {
        setState({ errors: validation, submitError: null, submitting: false });
        return false;
      }

      running.current = true;
      setState({ errors: {}, submitError: null, submitting: true });
      const result = await action();
      running.current = false;

      if (result.ok) {
        setState({ errors: {}, submitError: null, submitting: false });
        return true;
      }
      setState({
        errors: "errors" in result ? result.errors : {},
        submitError: "message" in result ? result.message : null,
        submitting: false,
      });
      return false;
    },
    []
  );

  return { ...state, run };
}

/* -------------------------------------------------------------------------- */
/* Trocar o e-mail                                                            */
/* -------------------------------------------------------------------------- */

export interface UseChangeEmailResult extends Submission {
  /** O e-mail que a conta tem hoje, para a tela mostrar. Vazio enquanto o perfil não chegou. */
  currentEmail: string;
  email: string;
  currentPassword: string;
  setEmail: (value: string) => void;
  setCurrentPassword: (value: string) => void;
  submit: () => void;
}

export function useChangeEmail(): UseChangeEmailResult {
  const { profile, changeEmail } = useAuth();
  const router = useRouter();
  const { run, ...submission } = useSubmit();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const currentEmail =
    profile.status === "ready" ? profile.profile.email : "";

  const submit = useCallback(() => {
    void run(
      validateEmailChange({ email, currentPassword, currentEmail }),
      () => changeEmail(email, currentPassword)
    ).then((changed) => {
      // O contexto já pôs o endereço novo no perfil: a tela de dados pessoais o mostra na volta.
      if (changed) {
        router.back();
      }
    });
  }, [run, email, currentPassword, currentEmail, changeEmail, router]);

  return {
    ...submission,
    currentEmail,
    email,
    currentPassword,
    setEmail,
    setCurrentPassword,
    submit,
  };
}

/* -------------------------------------------------------------------------- */
/* Trocar a password                                                          */
/* -------------------------------------------------------------------------- */

export interface UseChangePasswordResult extends Submission {
  currentPassword: string;
  newPassword: string;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  submit: () => void;
}

export function useChangePassword(): UseChangePasswordResult {
  const { changePassword } = useAuth();
  const router = useRouter();
  const { run, ...submission } = useSubmit();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const submit = useCallback(() => {
    void run(validatePasswordChange({ currentPassword, newPassword }), () =>
      changePassword(currentPassword, newPassword)
    ).then((changed) => {
      if (changed) {
        router.back();
      }
    });
  }, [run, currentPassword, newPassword, changePassword, router]);

  return {
    ...submission,
    currentPassword,
    newPassword,
    setCurrentPassword,
    setNewPassword,
    submit,
  };
}

/* -------------------------------------------------------------------------- */
/* Apagar a conta                                                             */
/* -------------------------------------------------------------------------- */

export interface UseDeleteAccountResult extends Submission {
  /**
   * A pessoa administra algum condomínio, então a conta não pode ser apagada. A tela diz isso ANTES
   * de pedir a password (FR-038a). É cortesia: quem recusa de verdade é o servidor.
   */
  isAdministrator: boolean;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  /** O diálogo de confirmação está aberto. */
  confirming: boolean;
  /** Confere que há uma password digitada e abre a confirmação. Nada é enviado ainda. */
  askConfirmation: () => void;
  cancel: () => void;
  /** Apaga. Depois disso a sessão acabou e o layout raiz leva à tela de entrar. */
  confirm: () => void;
}

export function useDeleteAccount(): UseDeleteAccountResult {
  const { profile, deleteAccount } = useAuth();
  const { run, ...submission } = useSubmit();
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  const isAdministrator =
    profile.status === "ready" &&
    profile.profile.memberships.some(
      (membership) => membership.role === "admin"
    );

  const askConfirmation = useCallback(() => {
    const validation = validateAccountDeletion({ currentPassword });
    if (!hasNoErrors(validation)) {
      // Passa pelo mesmo caminho só para pôr a mensagem sob o campo; a ação nunca é chamada.
      void run(validation, async () => ({ ok: true }));
      return;
    }
    setConfirming(true);
  }, [currentPassword, run]);

  const cancel = useCallback(() => setConfirming(false), []);

  const confirm = useCallback(() => {
    void run({}, () => deleteAccount(currentPassword)).then((deleted) => {
      // No sucesso não há o que fechar: a sessão terminou e esta tela vai embora com ela. Numa
      // recusa o diálogo fecha, e a explicação aparece na tela, sob o campo ou acima dele.
      if (!deleted) {
        setConfirming(false);
      }
    });
  }, [run, deleteAccount, currentPassword]);

  return {
    ...submission,
    isAdministrator,
    currentPassword,
    setCurrentPassword,
    confirming,
    askConfirmation,
    cancel,
    confirm,
  };
}
