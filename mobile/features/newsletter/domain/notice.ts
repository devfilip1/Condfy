/**
 * Entidade de domínio Notice — o aviso do mural do condomínio.
 *
 * Esta camada não importa React nem React Native.
 *
 * As regras e as mensagens de `validateNewNotice` são as MESMAS de
 * `server/src/condominiums/notice.dto.ts`. App e API são projetos separados, então a regra existe
 * nos dois lugares de propósito: a daqui para a pessoa saber na hora, a de lá para o dado não
 * entrar errado. Ao mudar uma, mude a outra — texto incluído.
 */

export interface Notice {
  id: string;
  title: string;
  /**
   * Texto completo, quebras de linha incluídas. A lista corta em duas linhas na hora de desenhar;
   * o valor aqui nunca é truncado, e é ele que a tela de detalhe mostra inteiro.
   */
  body: string;
  /** Dia a que o aviso se refere, no formato ISO `YYYY-MM-DD`, sem horário. */
  date: string;
}

/** O que o formulário envia. `publishedById` não existe aqui: vem do token no servidor. */
export interface NewNotice {
  title: string;
  body: string;
  date: string;
}

export interface FormErrors {
  title?: string;
  body?: string;
  date?: string;
}

export const TITLE_MAX_LENGTH = 120;
export const BODY_MAX_LENGTH = 5000;

/**
 * Aplica as mesmas regras do `notice.dto.ts` e devolve os errors por field.
 * Objeto vazio significa entrada válida.
 *
 * O título é aparado; o corpo NÃO. Aparar o corpo comeria a linha em branco entre dois parágrafos,
 * e preservá-la é requisito (FR-002). O corpo só não pode ser apenas espaço em branco.
 */
export function validateNewNotice(input: NewNotice): FormErrors {
  const errors: FormErrors = {};

  const title = input.title.trim();
  if (title.length === 0) {
    errors.title = "Title is required.";
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters.`;
  }

  if (input.body.trim().length === 0) {
    errors.body = "Content is required.";
  } else if (input.body.length > BODY_MAX_LENGTH) {
    errors.body = `Content must be at most ${BODY_MAX_LENGTH} characters.`;
  }

  if (input.date.trim().length === 0) {
    errors.date = "Date is required.";
  }

  return errors;
}

/** `true` quando a validação não encontrou nenhum error. */
export function hasNoErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNotice(value: unknown): value is Notice {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.date === "string"
  );
}

export function isNoticeList(value: unknown): value is Notice[] {
  return Array.isArray(value) && value.every(isNotice);
}

/**
 * O trecho do corpo que a lista mostra: o mesmo texto, com as quebras de linha achatadas em
 * espaços.
 *
 * Sem isto, o corte de duas linhas gasta a segunda com a linha em branco que separa os parágrafos,
 * e a pessoa vê uma linha de texto e outra só com reticências. O enunciado pede duas linhas DE
 * CONTEÚDO.
 *
 * Só afeta a prévia. O corpo guardado continua com as quebras intactas, que é o que a tela de
 * detalhe mostra (FR-002).
 */
export function previewOf(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}
