import { HttpError } from "@/features/auth";

/**
 * A frase para uma falha que não é de um campo, comum aos três hooks da feature.
 *
 * Sem conexão tem a frase dela. Fora isso, quando o servidor explicou a recusa — "This person
 * already chose their own password.", "Too many attempts…" — é a explicação dele que aparece; o
 * `fallback` fica para o que veio sem explicação.
 */

export const MESSAGE_OFFLINE =
  "Couldn't reach the server. Check your connection and try again.";

export function failureMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) {
    return fallback;
  }
  if (error.type === "network") {
    return MESSAGE_OFFLINE;
  }
  const body = error.body;
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}
