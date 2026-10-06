import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Credentials,
  FormErrors,
  Profile,
  ProfileMembership,
  Session,
  User,
  isFormErrors,
  hasNoErrors,
  validateSignUp,
  validateSignIn,
} from "@/features/auth/domain/session";
import {
  clearSelectedCondominium,
  readSelectedCondominium,
  writeSelectedCondominium,
} from "@/features/auth/services/selectedCondominium";
import {
  clearCredentials,
  writeCredentials,
  readCredentials,
} from "@/features/auth/services/storage";
import {
  changeEmail as trocarEmailNoServico,
  changePassword as trocarPasswordNoServico,
  deleteAccount as apagarContaNoServico,
  signUp as cadastrarNoServico,
  signIn as entrarNoServico,
  fetchProfile as buscarPerfilNoServico,
  refresh as renovarNoServico,
  signOut as sairNoServico,
} from "@/features/auth/services/authService";
import {
  HttpError,
  configureSessionBridge,
} from "@/features/auth/services/http";

/**
 * Estado de sessão do aplicativo: o primeiro state verdadeiramente global (research R-011).
 *
 * `carregando` existe para o tempo entre abrir o aplicativo e saber se há sessão. Enquanto ele
 * durar, nenhuma tela decide nada — é o que evita a tela de input piscar para quem já entrou.
 */
export type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  /**
   * `user` é `null` quando a sessão foi restaurada do armazenamento: a renovação devolve só
   * credentials, e o aplicativo não guarda name nem e-mail no aparelho (data-model). Quando uma
   * tela precisar do perfil, o contrato ganha uma rota para buscá-lo.
   */
  | { status: "authenticated"; user: User | null };

export const MESSAGE_BAD_CREDENTIALS = "E-mail or password is incorrect.";
export const MESSAGE_LOCKED_OUT =
  "Too many attempts. Try again in a few minutes.";
export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";
export const MESSAGE_SERVER_ERROR = "Something went wrong. Try again.";
export const MESSAGE_SESSION_EXPIRED =
  "Your session has expired. Sign in again.";

/**
 * Perfil de quem entrou: quem é, e em quais condomínios e unidades pertence.
 *
 * `null` enquanto está sendo buscado, ou quando a busca falhou — a sessão continua válida nos dois
 * casos. Quem consome decide o que mostrar na ausência; o perfil nunca derruba a sessão.
 */
export type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: Profile }
  | { status: "failed" };

/**
 * Se as rotas do aplicativo podem ser desenhadas, do ponto de vista de "em qual condomínio?".
 *
 * - `resolving` — ainda não dá para saber: o perfil está carregando, ou a escolha guardada no
 *   aparelho ainda está sendo lida. NENHUMA rota é desenhada enquanto isso durar.
 * - `choose` — a pessoa tem dois ou mais condomínios e ainda não escolheu. Só a tela de escolha.
 * - `failed` — o perfil não carregou. Sem ele não dá para saber quantos condomínios ela tem, então
 *   não dá para saber se é preciso perguntar; a tela de escolha mostra o erro para todo mundo.
 * - `open` — nenhum ou um condomínio, ou um escolhido. O aplicativo segue.
 *
 * É um valor derivado, não um state: sai do perfil e da seleção (feature 009, research R-004).
 */
export type CondominiumGate = "resolving" | "choose" | "failed" | "open";

/**
 * O resultado de uma mudança na própria conta — trocar e-mail, trocar password, apagar a conta.
 *
 * São três formas porque o formulário mostra cada uma num lugar: `errors` vai sob os campos
 * (inclusive "password atual incorreta", que o servidor devolve como erro de campo), e `message`
 * vai acima do formulário — sem conexão, tentativas demais, ou uma recusa pelo estado da conta.
 */
export type AccountChangeResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }
  | { ok: false; message: string };

export interface UseAuthResult {
  state: SessionState;
  /** Perfil vindo de `GET /me`. É daqui que outras features leem os vínculos. */
  profile: ProfileState;
  /** Tenta buscar o perfil de novo depois de uma falha de rede. */
  reloadProfile: () => void;
  /**
   * Em qual condomínio a pessoa está olhando. Contexto de sessão, não de uma feature: Reservas e
   * Newsletter leem o mesmo valor, então as duas telas nunca discordam sobre qual prédio é.
   *
   * `null` enquanto o perfil não chegou — e também quando a pessoa tem dois ou mais condomínios e
   * ainda não escolheu: o aplicativo não escolhe por ela (feature 009). O valor guardado no
   * aparelho é um PALPITE, validado contra os vínculos a cada abertura e descartado quando não
   * bate mais.
   *
   * É conveniência de tela e NUNCA permissão: toda rota leva o condomínio no caminho e o servidor
   * confere o vínculo, seja qual for o valor daqui (ADR 0013).
   */
  selectedCondominiumId: string | null;
  /**
   * O vínculo inteiro em que a pessoa está agindo: o condomínio (com a foto), o cargo NELE e as
   * unidades NELE. `null` quando não há condomínio atual.
   */
  currentMembership: ProfileMembership | null;
  /** Se as rotas podem ser desenhadas. Quem obedece é o layout raiz. */
  condominiumGate: CondominiumGate;
  /** `true` para quem tem dois ou mais condomínios: só para essa pessoa trocar faz sentido. */
  canSwitchCondominium: boolean;
  /** Só aceita um condomínio que a pessoa realmente tenha. */
  selectCondominium: (condominiumId: string) => void;
  /**
   * `true` só quando a pessoa é administradora DO CONDOMÍNIO EM TELA — não "é admin em algum
   * lugar". Quem administra um prédio e mora em outro pode num e não no outro.
   *
   * Isto é cortesia de interface: serve para oferecer ou esconder uma ação. Quem recusa de verdade
   * é a API (ADR 0010). Vive aqui desde o segundo uso — Newsletter e Achados e Perdidos.
   */
  isAdminOfSelectedCondominium: boolean;
  /** Operação de input ou cadastro em andamento. */
  submitting: boolean;
  /** Falha que não é de um field (credentials, bloqueio, rede). */
  submitError: string | null;
  formErrors: FormErrors;
  /** Preenchido quando a sessão caiu sozinha, para a tela de input explicar. */
  sessionNotice: string | null;
  signIn: (email: string, password: string) => void;
  signUp: (name: string, email: string, password: string) => void;
  signOut: () => void;
  /** Troca o e-mail. No sucesso o perfil carregado já mostra o novo, sem entrar de novo. */
  changeEmail: (
    email: string,
    currentPassword: string
  ) => Promise<AccountChangeResult>;
  /** Troca a password. Este aparelho continua conectado; os outros, não. */
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<AccountChangeResult>;
  /** Apaga a conta e encerra a sessão. Recusado para quem administra um condomínio. */
  deleteAccount: (currentPassword: string) => Promise<AccountChangeResult>;
}

const AuthContext = createContext<UseAuthResult | null>(null);

/**
 * Aviso de sessão encerrada, stored fora do React.
 *
 * O redirecionamento para a tela de input pode remontar o provider, e um `useState` voltaria
 * ao value inicial — a pessoa cairia na tela de input sem nenhuma explicação (FR-021). Em
 * escopo de módulo, o notice sobrevive à remontagem e some quando alguém entra de novo.
 */
let pendingNotice: string | null = null;

/** Mensagem para uma falha que não é de field. */
function messageFor(error: unknown): string {
  if (!(error instanceof HttpError)) {
    return MESSAGE_SERVER_ERROR;
  }
  if (error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  if (error.type === "session") {
    return MESSAGE_BAD_CREDENTIALS;
  }
  if (error.type === "server" && isLockout(error.body)) {
    return MESSAGE_LOCKED_OUT;
  }
  return MESSAGE_SERVER_ERROR;
}

/** O `429` do bloqueio chega como `servidor`, com a message do contrato no body. */
function isLockout(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string" &&
    (body as { message: string }).message.startsWith("Too many attempts")
  );
}

/** A `message` do corpo de uma resposta, quando ele tem uma. */
function bodyMessage(body: unknown): string | null {
  return typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : null;
}

/**
 * Traduz a falha de uma mudança de conta no que o formulário sabe mostrar.
 *
 * Um `400` com `errors` vai para os campos — é como chega "password atual incorreta", que o
 * servidor NÃO devolve como `401` justamente para não ser confundida com sessão vencida (ADR 0015).
 * Um `409` (a conta não pode ser apagada) e um `429` (tentativas demais) trazem a explicação do
 * servidor, e é ela que aparece.
 */
function accountFailure(error: unknown): AccountChangeResult {
  if (!(error instanceof HttpError)) {
    return { ok: false, message: MESSAGE_SERVER_ERROR };
  }
  if (error.type === "network") {
    return { ok: false, message: MESSAGE_OFFLINE };
  }
  if (error.type === "validation") {
    const body = error.body;
    const errors =
      typeof body === "object" && body !== null && "errors" in body
        ? (body as { errors: unknown }).errors
        : null;
    if (typeof errors === "object" && errors !== null) {
      const fields: Record<string, string> = {};
      for (const [field, message] of Object.entries(errors)) {
        if (typeof message === "string") {
          fields[field] = message;
        }
      }
      return { ok: false, errors: fields };
    }
  }
  return { ok: false, message: bodyMessage(error.body) ?? MESSAGE_SERVER_ERROR };
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [sessionNotice, setSessionNotice] = useState<string | null>(() => pendingNotice);
  const [profile, setProfile] = useState<ProfileState>({ status: "loading" });
  const [selectedCondominiumId, setSelectedCondominiumId] = useState<string | null>(null);
  /**
   * A seleção já foi resolvida para o perfil que está carregado? Ler o palpite do aparelho é
   * assíncrono, e nesse intervalo "sem seleção" ainda não quer dizer "precisa escolher".
   */
  const [selectionResolved, setSelectionResolved] = useState(false);
  /** A seleção em uso, legível dentro de um efeito sem torná-la dependência dele. */
  const selectedRef = useRef<string | null>(null);

  /** Credentials vivem no ref: o cliente HTTP as lê fora do ciclo de render. */
  const credentials = useRef<Credentials | null>(null);
  const submittingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Esquece no APARELHO em qual condomínio a pessoa estava.
   *
   * Não mexe no state de propósito: quem chama zera `selectedCondominiumId` junto com as outras
   * mudanças de sessão, num render só. Zerar aqui, antes, deixaria um instante de "autenticado,
   * com dois condomínios e nenhum escolhido" — e a tela de escolha piscaria para quem está saindo.
   */
  const forgetSelectedCondominium = useCallback(async () => {
    selectedRef.current = null;
    await clearSelectedCondominium();
  }, []);

  const endSession = useCallback(async (notice: string | null) => {
    credentials.current = null;
    await clearCredentials();
    // Sair esquece a escolha: a próxima pessoa a entrar neste aparelho não herda o condomínio de
    // quem saiu, e quem entra de novo é perguntado de novo (FR-007).
    await forgetSelectedCondominium();
    pendingNotice = notice;
    if (mounted.current) {
      setSessionNotice(notice);
      setSelectedCondominiumId(null);
      setProfile({ status: "loading" });
      setState({ status: "anonymous" });
    }
  }, [forgetSelectedCondominium]);

  /**
   * Busca o perfil. Nunca derruba a sessão: uma falha aqui vira `failed`, e a tela que precisa do
   * perfil decide o que dizer. O `401` já é tratado pelo cliente HTTP, que renova e repete.
   */
  const loadProfile = useCallback(async () => {
    try {
      const fresh = await buscarPerfilNoServico();
      if (mounted.current) {
        setProfile({ status: "ready", profile: fresh });
      }
    } catch {
      if (mounted.current) {
        setProfile({ status: "failed" });
      }
    }
  }, []);

  const reloadProfile = useCallback(() => {
    setProfile({ status: "loading" });
    void loadProfile();
  }, [loadProfile]);

  /**
   * Resolve em qual condomínio a pessoa está olhando, sempre que o perfil muda.
   *
   * O que já está em uso vence, desde que ainda seja um vínculo válido. Senão vale o palpite
   * guardado no aparelho — e um palpite que aponta para condomínio que não é mais dela é
   * descartado, em vez de abrir uma tela vazia ou alheia.
   */
  useEffect(() => {
    if (profile.status !== "ready") {
      // Sem perfil não há o que resolver, e o que foi resolvido antes não vale para o próximo.
      setSelectionResolved(false);
      return;
    }

    const memberships = profile.profile.memberships;
    if (memberships.length === 0) {
      selectedRef.current = null;
      setSelectedCondominiumId(null);
      setSelectionResolved(true);
      void clearSelectedCondominium();
      return;
    }

    let cancelled = false;
    void (async () => {
      const belongs = (id: string | null): id is string =>
        id !== null &&
        memberships.some((membership) => membership.condominium.id === id);

      let next: string | null = belongs(selectedRef.current)
        ? selectedRef.current
        : null;

      if (next === null) {
        const stored = await readSelectedCondominium();
        if (cancelled) {
          return;
        }
        if (belongs(stored)) {
          next = stored;
        } else {
          if (stored !== null) {
            await clearSelectedCondominium();
          }
          // Com um condomínio só não há pergunta a fazer: é ele. Com dois ou mais, o aplicativo
          // NÃO escolhe pela pessoa — fica `null`, e é isso que leva à tela de escolha. Até a
          // feature 009 este ramo pegava o primeiro da lista, calado.
          next = memberships.length === 1 ? memberships[0].condominium.id : null;
        }
      }

      if (!cancelled && mounted.current) {
        selectedRef.current = next;
        setSelectedCondominiumId(next);
        setSelectionResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  /** Só aceita um condomínio que a pessoa realmente tenha: a escolha é conveniência de tela. */
  const selectCondominium = useCallback(
    (condominiumId: string) => {
      if (profile.status !== "ready") {
        return;
      }
      const allowed = profile.profile.memberships.some(
        (membership) => membership.condominium.id === condominiumId
      );
      if (!allowed || condominiumId === selectedCondominiumId) {
        return;
      }
      selectedRef.current = condominiumId;
      setSelectedCondominiumId(condominiumId);
      void writeSelectedCondominium(condominiumId);
    },
    [profile, selectedCondominiumId]
  );


  const applySession = useCallback(async (session: Session) => {
    credentials.current = session.credentials;
    await writeCredentials(session.credentials);
    // Este é o caminho de quem DIGITOU as credenciais — entrar e cadastrar. A escolha é esquecida
    // aqui também, e não só ao sair, para "é perguntado ao entrar" valer por construção: uma saída
    // que não conseguiu limpar o aparelho não deixa um condomínio de herança (research R-003).
    // A sessão restaurada na abertura do aplicativo NÃO passa por aqui, e por isso volta ao
    // condomínio em que estava.
    await forgetSelectedCondominium();
    pendingNotice = null;
    if (mounted.current) {
      setSessionNotice(null);
      setFormErrors({});
      setSubmitError(null);
      setSelectedCondominiumId(null);
      // O perfil de quem acabou de entrar ainda não chegou: sem isto, um perfil que tivesse
      // sobrado na memória abriria o bloqueio com os vínculos de outra pessoa.
      setProfile({ status: "loading" });
      setState({ status: "authenticated", user: session.user });
      void loadProfile();
    }
  }, [loadProfile, forgetSelectedCondominium]);

  /** Renova e grava. `false` quando a sessão acabou — quem chama decide o que fazer. */
  const refresh = useCallback(async (): Promise<boolean> => {
    const current = credentials.current;
    if (!current) {
      return false;
    }
    try {
      const fresh = await renovarNoServico(current.refreshToken);
      credentials.current = fresh;
      await writeCredentials(fresh);
      return true;
    } catch (error) {
      // Falha de rede não derruba a sessão: a credencial continua válida (FR-021).
      if (error instanceof HttpError && error.type === "network") {
        return false;
      }
      await endSession(MESSAGE_SESSION_EXPIRED);
      return false;
    }
  }, [endSession]);

  // O cliente HTTP pergunta ao contexto, em vez de guardar credencial por conta própria.
  useEffect(() => {
    configureSessionBridge({
      getAccessToken: () => credentials.current?.accessToken ?? null,
      refresh,
    });
    return () => configureSessionBridge(null);
  }, [refresh]);

  // Abertura do aplicativo: há sessão guardada? Ela ainda vale?
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readCredentials();
      if (cancelled) {
        return;
      }
      if (!stored) {
        setState({ status: "anonymous" });
        return;
      }
      credentials.current = stored;
      try {
        const fresh = await renovarNoServico(stored.refreshToken);
        credentials.current = fresh;
        await writeCredentials(fresh);
        if (!cancelled) {
          setState({ status: "authenticated", user: null });
          // Sessão restaurada não traz nome nem e-mail; o perfil preenche isso e os vínculos.
          void loadProfile();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        credentials.current = null;
        await clearCredentials();
        // Sem rede não dá para saber se a sessão ainda vale; dizer que expirou seria mentira.
        const semRede = error instanceof HttpError && error.type === "network";
        pendingNotice = semRede ? null : MESSAGE_SESSION_EXPIRED;
        setSessionNotice(pendingNotice);
        setState({ status: "anonymous" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(
    (operation: () => Promise<Session>, validation: FormErrors) => {
      if (submittingRef.current) {
        return;
      }
      if (!hasNoErrors(validation)) {
        setFormErrors(validation);
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      setFormErrors({});

      operation()
        .then((session) => applySession(session))
        .catch((error: unknown) => {
          if (!mounted.current) {
            return;
          }
          const errors = fieldErrorsFrom(error);
          if (errors) {
            setFormErrors(errors);
          } else {
            setSubmitError(messageFor(error));
          }
        })
        .finally(() => {
          submittingRef.current = false;
          if (mounted.current) {
            setSubmitting(false);
          }
        });
    },
    [applySession]
  );

  const signIn = useCallback(
    (email: string, password: string) => {
      run(
        () => entrarNoServico(email, password),
        validateSignIn(email, password)
      );
    },
    [run]
  );

  const signUp = useCallback(
    (name: string, email: string, password: string) => {
      run(
        () => cadastrarNoServico(name, email, password),
        validateSignUp(name, email, password)
      );
    },
    [run]
  );

  /**
   * Troca o e-mail e ATUALIZA o perfil que já está carregado, em vez de buscar tudo de novo: a
   * pessoa vê o endereço novo na hora, sem entrar de novo (FR-014). As credenciais não mudam.
   */
  const changeEmail = useCallback(
    async (
      email: string,
      currentPassword: string
    ): Promise<AccountChangeResult> => {
      try {
        const changed = await trocarEmailNoServico(email, currentPassword);
        if (mounted.current) {
          setProfile((current) =>
            current.status === "ready"
              ? {
                  status: "ready",
                  profile: { ...current.profile, email: changed.email },
                }
              : current
          );
          setState((current) =>
            current.status === "authenticated" && current.user
              ? {
                  status: "authenticated",
                  user: { ...current.user, email: changed.email },
                }
              : current
          );
        }
        return { ok: true };
      } catch (error: unknown) {
        return accountFailure(error);
      }
    },
    []
  );

  /**
   * Troca a password e GUARDA o par de credenciais que volta. O servidor encerrou todas as sessões
   * da conta e abriu esta; sem guardar o par novo este aparelho seguiria com uma credencial de
   * renovação que não existe mais, e cairia sozinho em alguns minutos (FR-019).
   */
  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<AccountChangeResult> => {
      try {
        const fresh = await trocarPasswordNoServico(currentPassword, newPassword);
        credentials.current = fresh;
        await writeCredentials(fresh);
        return { ok: true };
      } catch (error: unknown) {
        return accountFailure(error);
      }
    },
    []
  );

  /**
   * Apaga a conta e encerra a sessão local — pelo mesmo caminho de quem sai, menos o aviso ao
   * servidor: não sobrou credencial nenhuma lá para encerrar.
   */
  const deleteAccount = useCallback(
    async (currentPassword: string): Promise<AccountChangeResult> => {
      try {
        await apagarContaNoServico(currentPassword);
        await endSession(null);
        return { ok: true };
      } catch (error: unknown) {
        return accountFailure(error);
      }
    },
    [endSession]
  );

  /** Sair nunca depende de rede: apaga local, vai para anônimo e só então avisa (FR-017a). */
  const signOut = useCallback(() => {
    const refreshToken = credentials.current?.refreshToken;
    void endSession(null).then(() => {
      if (refreshToken) {
        void sairNoServico(refreshToken);
      }
    });
  }, [endSession]);

  const memberships =
    profile.status === "ready" ? profile.profile.memberships : null;

  const currentMembership = useMemo<ProfileMembership | null>(
    () =>
      memberships?.find(
        (membership) => membership.condominium.id === selectedCondominiumId
      ) ?? null,
    [memberships, selectedCondominiumId]
  );

  const isAdminOfSelectedCondominium = currentMembership?.role === "admin";

  const canSwitchCondominium = (memberships?.length ?? 0) >= 2;

  let condominiumGate: CondominiumGate;
  if (profile.status === "failed") {
    condominiumGate = "failed";
  } else if (memberships === null || !selectionResolved) {
    condominiumGate = "resolving";
  } else if (memberships.length >= 2 && currentMembership === null) {
    condominiumGate = "choose";
  } else {
    condominiumGate = "open";
  }

  const value = useMemo<UseAuthResult>(
    () => ({
      state,
      profile,
      reloadProfile,
      selectedCondominiumId,
      currentMembership,
      condominiumGate,
      canSwitchCondominium,
      selectCondominium,
      isAdminOfSelectedCondominium,
      submitting,
      submitError,
      formErrors,
      sessionNotice,
      signIn,
      signUp,
      signOut,
      changeEmail,
      changePassword,
      deleteAccount,
    }),
    [
      state,
      profile,
      reloadProfile,
      selectedCondominiumId,
      currentMembership,
      condominiumGate,
      canSwitchCondominium,
      selectCondominium,
      isAdminOfSelectedCondominium,
      submitting,
      submitError,
      formErrors,
      sessionNotice,
      signIn,
      signUp,
      signOut,
      changeEmail,
      changePassword,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthResult {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return value;
}
