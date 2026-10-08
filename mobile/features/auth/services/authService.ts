import {
  Credentials,
  Profile,
  Session,
  isCredentials,
  isProfile,
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
  password: string,
  condominiumId: string,
  unitId: string
): Promise<Session> {
  // Cadastrar-se é pedir para entrar: a conta nasce com um pedido para aquela unidade daquele
  // condomínio, e fica esperando quem cuida dele confirmar (feature 016).
  const response = await request("/accounts", {
    method: "POST",
    body: {
      name: name.trim(),
      email: normalizeEmail(email),
      password,
      condominiumId,
      unitId,
    },
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

/**
 * Perfil de quem está autenticado: nome, e-mail e os vínculos com condomínios e unidades.
 *
 * Diferente das quatro chamadas acima, esta EXIGE sessão — por isso não leva `skipAuth`: o cliente
 * anexa o accessToken e, num `401`, renova e repete sozinho.
 */
export async function fetchProfile(): Promise<Profile> {
  const response = await request("/me");
  if (!isProfile(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/* -------------------------------------------------------------------------- */
/* Mudar a própria conta (feature 010)                                        */
/* -------------------------------------------------------------------------- */
//
// As três chamadas agem sobre a conta de QUEM ESTÁ CONECTADO: não levam id nenhum, porque de quem
// é a conta vem do token. E as três levam a password atual, sempre no body.

/** Troca o e-mail e devolve o endereço como ficou gravado — normalizado pelo servidor. */
export async function changeEmail(
  email: string,
  currentPassword: string
): Promise<{ email: string }> {
  const response = await request("/me/email", {
    method: "PATCH",
    body: { email: normalizeEmail(email), currentPassword },
  });
  if (
    typeof response !== "object" ||
    response === null ||
    typeof (response as { email?: unknown }).email !== "string"
  ) {
    throw new HttpError("server", response);
  }
  return { email: (response as { email: string }).email };
}

/**
 * Troca a password e devolve um par NOVO de credenciais: o servidor encerrou todas as sessões da
 * conta e abriu esta. Quem chama precisa guardar o par no lugar do antigo — esquecer disso passa
 * despercebido por uns minutos e depois desconecta a pessoa.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<Credentials> {
  const response = await request("/me/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  });
  if (!isCredentials(response)) {
    throw new HttpError("server", response);
  }
  return response;
}

/** Apaga a conta. A password vai no body de um `DELETE`, nunca na URL. */
export async function deleteAccount(currentPassword: string): Promise<void> {
  await request("/me", { method: "DELETE", body: { currentPassword } });
}

/**
 * A pessoa desiste do próprio pedido de entrada. O servidor apaga o pedido E a conta — sem pedir a
 * password, porque uma conta que só espera não guarda nada. Um `404` quer dizer que o pedido acabou
 * de ser respondido.
 */
export async function withdrawJoinRequest(): Promise<void> {
  await request("/me/join-request", { method: "DELETE" });
}
