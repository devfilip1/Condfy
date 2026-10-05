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
  Session,
  User,
  isFormErrors,
  hasNoErrors,
  validateSignUp,
  validateSignIn,
} from "@/features/auth/domain/session";
import {
  clearCredentials,
  writeCredentials,
  readCredentials,
} from "@/features/auth/services/storage";
import {
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

export interface UseAuthResult {
  state: SessionState;
  /** Perfil vindo de `GET /me`. É daqui que outras features leem os vínculos. */
  profile: ProfileState;
  /** Tenta buscar o perfil de novo depois de uma falha de rede. */
  reloadProfile: () => void;
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

  const endSession = useCallback(async (notice: string | null) => {
    credentials.current = null;
    await clearCredentials();
    pendingNotice = notice;
    if (mounted.current) {
      setSessionNotice(notice);
      setProfile({ status: "loading" });
      setState({ status: "anonymous" });
    }
  }, []);

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

  const applySession = useCallback(async (session: Session) => {
    credentials.current = session.credentials;
    await writeCredentials(session.credentials);
    pendingNotice = null;
    if (mounted.current) {
      setSessionNotice(null);
      setFormErrors({});
      setSubmitError(null);
      setState({ status: "authenticated", user: session.user });
      void loadProfile();
    }
  }, [loadProfile]);

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

  /** Sair nunca depende de rede: apaga local, vai para anônimo e só então avisa (FR-017a). */
  const signOut = useCallback(() => {
    const refreshToken = credentials.current?.refreshToken;
    void endSession(null).then(() => {
      if (refreshToken) {
        void sairNoServico(refreshToken);
      }
    });
  }, [endSession]);

  const value = useMemo<UseAuthResult>(
    () => ({
      state,
      profile,
      reloadProfile,
      submitting,
      submitError,
      formErrors,
      sessionNotice,
      signIn,
      signUp,
      signOut,
    }),
    [
      state,
      profile,
      reloadProfile,
      submitting,
      submitError,
      formErrors,
      sessionNotice,
      signIn,
      signUp,
      signOut,
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
