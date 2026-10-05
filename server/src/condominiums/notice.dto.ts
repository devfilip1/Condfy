/**
 * Validação do body de `POST /condominiums/:condominiumId/notices`.
 *
 * As regras e as mensagens são as MESMAS de `mobile/features/newsletter/domain/notice.ts` no app.
 * App e API são projetos separados, então a regra existe nos dois lugares de propósito: a do app
 * para a pessoa saber na hora, a da API para o dado não entrar errado. Ao mudar um, mude o outro.
 */

export interface NewNotice {
  title: string;
  body: string;
  /** Dia de calendário `YYYY-MM-DD`. */
  date: string;
}

export interface FormErrors {
  title?: string;
  body?: string;
  date?: string;
}

export type NoticeValidation =
  | { ok: true; data: NewNotice }
  | { ok: false; errors: FormErrors };

export const TITLE_MAX_LENGTH = 120;
export const BODY_MAX_LENGTH = 5000;

/** Cópia de `isValidISODate` do app (`shared/lib/calendar.ts`): data de calendário real. */
function isValidISODate(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) {
    return false;
  }
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDayOfMonth;
}

function asObject(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function text(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

/**
 * Valida o body recebido como `unknown` (Constituição, Princípio IV).
 *
 * O título é APARADO antes de gravar; o corpo NÃO é. Aparar o corpo comeria a linha em branco que
 * separa dois parágrafos, e preservá-la é requisito (FR-002). O corpo só não pode ser apenas
 * espaço em branco — que é exatamente o que a CHECK do banco também exige.
 */
export function validateNewNotice(body: unknown): NoticeValidation {
  const data = asObject(body);
  const title = text(data, "title").trim();
  const noticeBody = text(data, "body");
  const date = text(data, "date").trim();

  const errors: FormErrors = {};

  if (title.length === 0) {
    errors.title = "Title is required.";
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters.`;
  }

  if (noticeBody.trim().length === 0) {
    errors.body = "Content is required.";
  } else if (noticeBody.length > BODY_MAX_LENGTH) {
    errors.body = `Content must be at most ${BODY_MAX_LENGTH} characters.`;
  }

  if (date.length === 0) {
    errors.date = "Date is required.";
  } else if (!isValidISODate(date)) {
    errors.date = "Enter a real date as DD/MM/YYYY.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { title, body: noticeBody, date } };
}
