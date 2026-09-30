import {
  Credentials,
  Session,
  isCredentials,
  isSession,
  normalizeEmail,
} from "@/features/auth/domain/session";
import { HttpError, request } from "@/features/auth/services/http";

/**
 * Chamadas de conta e sessão. Única camada da feature que faz I/O.
 *
 * As respostas chegam como `unknown` e só são devolvidas depois do narrowing pelos guards do
 * domínio (Constituição, Princípio IV). Erros de `request` sobem sem tradução: quem escolhe a
 * message é o contexto.
 */

/** Abre uma sessão com e-mail e password. */
export async function signIn(email: string, password: string): Promise<Session> {
  const response = await request("/sessions", {
    method: "POST",
    body: { email: normalizeEmail(email), password },
    skipAuth: true,
  });
  if (!isSession(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Cria a conta e já entra (FR-030). A conta nasce sem condomínio (FR-027). */
export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<Session> {
  const response = await request("/accounts", {
    method: "POST",
    body: { name: name.trim(), email: normalizeEmail(email), password },
    skipAuth: true,
  });
  if (!isSession(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Troca a credencial de renovação por um par novo. */
export async function refresh(refreshToken: string): Promise<Credentials> {
  const response = await request("/sessions/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
  });
  if (!isCredentials(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/**
 * Avisa o servidor que a sessão acabou. Nunca lança (FR-017a): signOut não pode depender de rede.
 * O aplicativo já apagou as credentials locais antes de chamar.
 */
export async function signOut(refreshToken: string): Promise<void> {
  try {
    await request("/sessions", {
      method: "DELETE",
      body: { refreshToken },
      skipAuth: true,
    });
  } catch {
    // Ignorado de propósito: a credencial órfã morre por expiração ou no primeiro reúso.
  }
}
