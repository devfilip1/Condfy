/**
 * Cliente HTTP mínimo da API do condfy.
 *
 * Fica no `services/` da feature porque é I/O, e só Visitantes faz requisições hoje. Vai para
 * `shared/` quando a segunda feature precisar dele (research R-014). Não conhece Visitante e não
 * gera texto de interface: quem decide a mensagem é o hook.
 */

const TEMPO_LIMITE_MS = 10_000;

export type TipoErroHttp = "rede" | "validacao" | "servidor";

/**
 * Falha de uma requisição, já classificada.
 * - `rede`: sem resposta ou tempo esgotado.
 * - `validacao`: `400` com `erros` no corpo.
 * - `servidor`: qualquer outra resposta fora de 2xx, ou resposta fora do formato esperado.
 */
export class ErroHttp extends Error {
  tipo: TipoErroHttp;
  corpo: unknown;

  constructor(tipo: TipoErroHttp, corpo: unknown = undefined) {
    super(`Falha HTTP (${tipo})`);
    this.name = "ErroHttp";
    this.tipo = tipo;
    this.corpo = corpo;
  }
}

export interface OpcoesRequisicao {
  metodo?: "GET" | "POST" | "DELETE";
  corpo?: unknown;
}

function urlBase(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_URL não definida em .env.local");
  }
  return url.replace(/\/+$/, "");
}

function temErros(corpo: unknown): boolean {
  return typeof corpo === "object" && corpo !== null && "erros" in corpo;
}

async function lerJson(resposta: Response): Promise<unknown> {
  const texto = await resposta.text();
  if (texto.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Faz a requisição e devolve o JSON da resposta como `unknown` (ou `undefined` em `204`).
 * Quem chama faz o narrowing com os type guards do domínio.
 */
export async function requisitar(
  caminho: string,
  opcoes: OpcoesRequisicao = {}
): Promise<unknown> {
  const base = urlBase();
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  let resposta: Response;
  try {
    resposta = await fetch(`${base}${caminho}`, {
      method: opcoes.metodo ?? "GET",
      headers:
        opcoes.corpo === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: controlador.signal,
    });
  } catch {
    // Servidor inalcançável, sem conexão ou tempo esgotado (abort).
    throw new ErroHttp("rede");
  } finally {
    clearTimeout(temporizador);
  }

  if (resposta.status === 204) {
    return undefined;
  }

  const corpo = await lerJson(resposta);

  if (resposta.ok) {
    return corpo;
  }
  if (resposta.status === 400 && temErros(corpo)) {
    throw new ErroHttp("validacao", corpo);
  }
  throw new ErroHttp("servidor", corpo);
}
