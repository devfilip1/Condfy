/**
 * Validação do body da conferência de um comprovante.
 *
 * **Não tem espelho de mensagens no app**, e não é descuido: nada é digitado. O que chega é o que a
 * câmera leu, e o app já separa o que é comprovante do que não é (`passCodeOf`, em
 * `mobile/features/visitors/domain/visitor.ts`).
 *
 * **`null` quer dizer "não reconhecido", e não "pedido malformado".** `pass_code` é uma coluna
 * `uuid`: perguntar ao Postgres por um texto que não é UUID é um erro, não um resultado vazio. Por
 * isso a forma é conferida aqui, antes da consulta — e o que não passa recebe a MESMA resposta de
 * um código que não existe, em vez de um `400` que diria a quem pergunta que errou o formato.
 */

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O código do comprovante, em minúsculas, ou `null` quando o body não traz um UUID em `code`. */
export function validatePassCheck(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }
  const code = (body as Record<string, unknown>).code;
  if (typeof code !== "string") {
    return null;
  }
  const trimmed = code.trim();
  return UUID_FORMAT.test(trimmed) ? trimmed.toLowerCase() : null;
}
