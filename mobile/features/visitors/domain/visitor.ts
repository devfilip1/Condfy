/**
 * Entidade de domínio Visitor e suas regras puras.
 *
 * Esta camada não importa React nem React Native.
 */

import { isValidISODate } from "@/shared/lib/calendar";

/** Os mesmos três valores do enum do banco e do contrato. Em inglês (ADR 0008). */
export type VisitType = "visitor" | "delivery" | "service_provider";

export const VISIT_TYPES: readonly VisitType[] = [
  "visitor",
  "delivery",
  "service_provider",
];

/** Unidade visitada. `block` é `null` em condomínio sem blocos. */
export interface VisitorUnit {
  id: string;
  block: string | null;
  number: string;
}

/** Quem autorizou a visita — vem do token no servidor, nunca do formulário. */
export interface VisitorAuthorizer {
  id: string;
  name: string;
  /**
   * O cargo de quem autorizou, no condomínio da visita. É o que deixa o comprovante dizer
   * "Resident …" ou "Administrator" sem adivinhar pelo nome.
   */
  role: "resident" | "admin" | "manager";
}

export interface Visitor {
  id: string;
  name: string;
  type: VisitType;
  /** Dia previsto da visita no formato ISO `YYYY-MM-DD`, sem horário. */
  expectedDate: string;
  condominiumId: string;
  unit: VisitorUnit;
  authorizedBy: VisitorAuthorizer;
  /**
   * Esta pessoa pode remover a visita: foi ela quem a autorizou. Vem do servidor. Para o
   * administrador é `false` nas visitas dos outros — ele as vê, mas não as apaga —, e o card só
   * mostra a lixeira onde isto vem `true`.
   */
  canRemove: boolean;
  /**
   * O código do comprovante desta visita. Só vem numa visita que ESTA pessoa autorizou: o
   * administrador vê as dos outros, mas sem o código. Um card é tocável quando isto está aqui — a
   * tela não decide quem pode abrir comprovante de quem.
   */
  passCode?: string;
}

/**
 * O que o formulário envia. NÃO é `Omit<Visitor, "id">`: o corpo manda só a unidade, e o
 * condomínio sai dela enquanto quem autorizou sai do token (ADR 0009). O formulário não escolhe
 * nenhum dos dois.
 */
export interface NewVisitor {
  name: string;
  type: VisitType;
  expectedDate: string;
  unitId: string;
}

export interface FormErrors {
  name?: string;
  type?: string;
  expectedDate?: string;
  unitId?: string;
}

export const NAME_MAX_LENGTH = 60;

/** Os ids do banco são uuid v4. Mesmo teste de `server/src/visitors/visitor.dto.ts`. */
const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ordena pela data prevista, da mais próxima para a mais distante (FR-017).
 * Estável em caso de empate e sem alterar o array recebido.
 */
export function sortByExpectedDate(list: Visitor[]): Visitor[] {
  return list
    .map((visitor, index) => ({ visitor, index }))
    .sort((a, b) => {
      if (a.visitor.expectedDate === b.visitor.expectedDate) {
        return a.index - b.index;
      }
      return a.visitor.expectedDate < b.visitor.expectedDate ? -1 : 1;
    })
    .map((item) => item.visitor);
}

/**
 * Aplica as regras V-01 a V-06 do data-model e devolve os errors por field.
 * Objeto empty significa input válida.
 */
export function validateNewVisitor(input: NewVisitor): FormErrors {
  const errors: FormErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  if (!VISIT_TYPES.includes(input.type)) {
    errors.type = "Select a visit type.";
  }

  const expectedDate = input.expectedDate.trim();
  if (expectedDate.length === 0) {
    errors.expectedDate = "Expected date is required.";
  } else if (!isValidISODate(expectedDate)) {
    errors.expectedDate = "Enter a real date as DD/MM/YYYY.";
  }

  // Só a forma é conferida aqui. Se a unidade existe, e se quem autoriza pertence àquele
  // condomínio, quem confere é o servidor — depende do banco e da identidade do token.
  // Mesma mensagem de `visitor.dto.ts`, que o formulário exibe sem traduzir.
  if (!UUID_FORMAT.test(input.unitId.trim())) {
    errors.unitId = "Select a unit.";
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

function isVisitorUnit(value: unknown): value is VisitorUnit {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    (value.block === null || typeof value.block === "string") &&
    typeof value.number === "string"
  );
}

function isVisitorAuthorizer(value: unknown): value is VisitorAuthorizer {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.role === "resident" || value.role === "admin" || value.role === "manager")
  );
}

/** `true` quando o value tem exatamente a forma de um `Visitor` válido. */
export function isVisitor(value: unknown): value is Visitor {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.condominiumId === "string" &&
    isVisitorUnit(value.unit) &&
    isVisitorAuthorizer(value.authorizedBy) &&
    typeof value.canRemove === "boolean" &&
    // Ausente é válido — é o caso de toda visita que outra pessoa autorizou.
    (value.passCode === undefined || typeof value.passCode === "string") &&
    typeof value.type === "string" &&
    (VISIT_TYPES as readonly string[]).includes(value.type) &&
    typeof value.expectedDate === "string" &&
    isValidISODate(value.expectedDate)
  );
}

/** `true` quando o value é a lista de unidades de um condomínio, como o administrador a recebe. */
export function isVisitorUnitList(value: unknown): value is VisitorUnit[] {
  return Array.isArray(value) && value.every(isVisitorUnit);
}

/**
 * A unidade por extenso, para dizer onde a visita vai: `Block A · Apt 101`, ou só `Apt 101` em
 * condomínio sem blocos. Mora aqui, e não no card, porque é apresentação de uma entidade do
 * domínio e não pertence a componente nenhum.
 */
export function unitDescription(unit: VisitorUnit): string {
  return unit.block === null
    ? `Apt ${unit.number}`
    : `Block ${unit.block} · Apt ${unit.number}`;
}

/* -------------------------------------------------------------------------- */
/* O comprovante de liberação: textos e regras, sem React.                    */
/* -------------------------------------------------------------------------- */

/** O comprovante que está aberto na tela: a visita e o que falta para desenhá-lo. */
export interface OpenPass {
  visitor: Visitor;
  /** Do condomínio DA VISITA, vindo do perfil — não do condomínio em exibição. */
  condominiumName: string;
  /** O dia da visita já passou. */
  expired: boolean;
}

const PASS_QR_PREFIX = "condfy:pass:";

/**
 * O texto que o QR do comprovante carrega: um prefixo fixo e o código da visita, e mais nada —
 * nenhum nome, nenhuma data.
 *
 * NÃO é um endereço web, de propósito: um endereço convida o celular a abri-lo, e não existe página
 * pública para abrir. O prefixo serve para um leitor futuro reconhecer um comprovante do Condfy
 * antes de perguntar qualquer coisa ao servidor (research R-002 da 012).
 */
export function passQrValue(passCode: string): string {
  return `${PASS_QR_PREFIX}${passCode}`;
}

/**
 * A frase de quem autoriza. O administrador aparece pelo cargo, sem nome pessoal (RN-MEM-04); o
 * servidor já manda "Administrator" em `name`, e o cargo vem em `role` para a frase não depender de
 * comparar esse texto.
 */
export function passAuthorizationLine(
  visitor: Visitor,
  condominiumName: string
): string {
  // Um `switch`, e não a função que junta os dois cargos: aqui cada um tem a sua palavra.
  switch (visitor.authorizedBy.role) {
    case "admin":
      return `Administrator authorizes your entry to ${condominiumName}.`;
    case "manager":
      return `Manager authorizes your entry to ${condominiumName}.`;
    case "resident":
      return `Resident ${visitor.authorizedBy.name} authorizes your entry to ${condominiumName}.`;
  }
}

/**
 * O comprovante vale para o dia da visita e só para ele. Recebe hoje como parâmetro em vez de ler o
 * relógio: função pura é função que dá para conferir sem esperar a virada do dia.
 *
 * Quem decide aqui é o aparelho, e não o servidor, porque ainda não existe leitor: nada é aceito ou
 * recusado com base nisto, só um rótulo aparece e um botão some (research R-008 da 012).
 */
export function isPassExpired(visitor: Visitor, todayISO: string): boolean {
  // `YYYY-MM-DD` ordena como texto igual à data que representa.
  return visitor.expectedDate < todayISO;
}

/** `true` quando o value é uma list em que todo item é um `Visitor`. */
export function isVisitorList(value: unknown): value is Visitor[] {
  return Array.isArray(value) && value.every(isVisitor);
}

const FORM_FIELDS: readonly (keyof FormErrors)[] = [
  "name",
  "type",
  "expectedDate",
  "unitId",
];

/** `true` quando o value é um objeto de errors por field, no formato do formulário. */
export function isFormErrors(value: unknown): value is FormErrors {
  if (!isObject(value)) {
    return false;
  }
  return FORM_FIELDS.every(
    (field) => value[field] === undefined || typeof value[field] === "string"
  );
}
