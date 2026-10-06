/**
 * Cliente HTTP mínimo da API do condfy.
 *
 * Vive na feature de autenticação porque, a partir da feature 004, ele anexa a credencial de
 * accessToken, renova quando ela vence e repete a requisição — isso é comportamento de sessão, não
 * infraestrutura neutra (research R-010). Outras features o consomem por `@/features/auth`.
 *
 * Não conhece Visitor e não gera text de interface: quem decide a message é quem chama.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export type HttpErrorKind =
  | "network"
  | "validation"
  | "session"
  | "conflict"
  | "server";

/**
 * Falha de uma requisição, já classificada.
 * - `rede`: sem response ou tempo esgotado.
 * - `validation`: `400` com `errors` no body.
 * - `session`: `401` que a renovação não resolveu — a sessão acabou (FR-021).
 * - `conflict`: `409`. O pedido estava certo quando foi escrito e não está mais quando chegou —
 *   alguém reservou o horário no meio do caminho. É a ÚNICA falha cuja resposta certa é "mostre
 *   esta message e recarregue", e não "algo deu errado, tente de novo"; por isso tem tipo próprio
 *   em vez de cair no `server` junto com os 500 (feature 007, research R-005).
 * - `servidor`: qualquer outra response fora de 2xx, ou response fora do formato esperado.
 */
export class HttpError extends Error {
  type: HttpErrorKind;
  body: unknown;

  constructor(type: HttpErrorKind, body: unknown = undefined) {
    super(`Falha HTTP (${type})`);
    this.name = "HttpError";
    this.type = type;
    this.body = body;
  }
}

export interface RequestOptions {
  /** `PATCH` entrou com a troca de status de um item de achados e perdidos (feature 008). */
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /**
   * Quanto esperar antes de desistir. O padrão de 10 segundos serve para JSON de poucos kilobytes;
   * um envio com foto, numa rede de celular, precisa de mais — sem isto um envio CERTO numa rede
   * lenta seria relatado como "sem conexão".
   */
  timeoutMs?: number;
  /**
   * Não anexa credencial e não tenta refresh em caso de `401`. É o que as próprias rotas de
   * sessão usam — sem isso, refresh uma sessão vencida chamaria renovação de novo, em recursão.
   */
  skipAuth?: boolean;
}

/**
 * Ligação com o state de sessão, fornecida pelo `AuthProvider` na montagem.
 *
 * O cliente não guarda credencial: ele pergunta. Assim existe uma única fonte da verdade, que é
 * o contexto, e este módulo continua sem state de domínio.
 */
export interface SessionBridge {
  /** Credencial de accessToken current, ou `null` quando não há sessão. */
  getAccessToken: () => string | null;
  /** Renova e grava o novo par. `false` quando a sessão acabou. */
  refresh: () => Promise<boolean>;
}

let bridge: SessionBridge | null = null;
let refreshInFlight: Promise<boolean> | null = null;

/** Chamado pelo `AuthProvider`. Passar `null` desliga a autenticação automática. */
export function configureSessionBridge(nova: SessionBridge | null): void {
  bridge = nova;
}

/**
 * Garante uma renovação por vez (FR-013): chamadas concorrentes que receberam `401` aguardam a
 * mesma promessa, em vez de disparar renovações paralelas que derrubariam a sessão por reúso.
 */
function refreshOnce(): Promise<boolean> {
  if (!bridge) {
    return Promise.resolve(false);
  }
  refreshInFlight ??= bridge.refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function baseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_URL não definida em .env.local");
  }
  return url.replace(/\/+$/, "");
}

/**
 * Um caminho da API como endereço completo, para o que não passa por `request` — hoje, a foto de
 * um item de achados e perdidos, que o componente de imagem busca sozinho.
 *
 * O servidor devolve esse caminho RELATIVO porque não sabe por qual endereço o aparelho o alcança.
 */
export function apiUrl(path: string): string {
  return `${baseUrl()}${path}`;
}

function hasFieldErrors(body: unknown): boolean {
  return typeof body === "object" && body !== null && "errors" in body;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const base = baseUrl();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  const accessToken = options.skipAuth ? null : bridge?.getAccessToken() ?? null;
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    // Servidor inalcançável, sem conexão ou tempo esgotado (abort).
    throw new HttpError("network");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Faz a requisição e devolve o JSON da response como `unknown` (ou `undefined` em `204`).
 * Quem chama faz o narrowing com os type guards do domínio.
 *
 * Em `401`, renova uma vez e repete a requisição. Se a renovação não resolver, a sessão acabou:
 * o error sobe como `session` e o contexto leva a pessoa à tela de input (FR-021).
 */
export async function request(
  path: string,
  options: RequestOptions = {}
): Promise<unknown> {
  let response = await send(path, options);

  if (response.status === 401 && !options.skipAuth) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      response = await send(path, options);
    }
  }

  if (response.status === 204) {
    return undefined;
  }

  const body = await readJson(response);

  if (response.ok) {
    return body;
  }
  if (response.status === 400 && hasFieldErrors(body)) {
    throw new HttpError("validation", body);
  }
  if (response.status === 401) {
    throw new HttpError("session", body);
  }
  // Antes do `server`, de propósito: um 409 tem resposta de interface diferente de um 500.
  if (response.status === 409) {
    throw new HttpError("conflict", body);
  }
  throw new HttpError("server", body);
}
