/**
 * O formulário de criação de um condomínio: o que ele carrega e as regras dele.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * ESTE ARQUIVO TEM UM ESPELHO: as regras e as mensagens de `validateNewCondominium` são as MESMAS
 * de `server/src/condominiums/condominium.dto.ts`. App e API são projetos separados, então a regra
 * existe nos dois lugares de propósito: a daqui para a pessoa saber na hora, a de lá para o dado
 * não entrar errado. Ao mudar um, mude o outro.
 *
 * Uma diferença é da natureza dos dois lados, não descuido: aqui se confere o TAMANHO da foto; só o
 * servidor confere que os bytes são mesmo uma imagem.
 */

export const NAME_MAX_LENGTH = 100;
export const ADDRESS_MAX_LENGTH = 200;
export const MAX_BLOCKS = 50;
export const MAX_UNITS_PER_BLOCK = 500;
export const MAX_UNITS = 2000;
/** 5 MB. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** Quantas letras tem a sigla de um bloco, no máximo. */
export const BLOCK_CODE_MAX_LENGTH = 2;

/** Um bloco como está DIGITADO no formulário. O número é texto até a hora de validar. */
export interface NewBlock {
  code: string;
  unitCount: string;
}

/** A foto escolhida no aparelho, do jeito que o formulário e o envio precisam dela. */
export interface SelectedPhoto {
  /** Os bytes em base64, sem o prefixo `data:`. É o que vai no body. */
  base64: string;
  /** Endereço local para a pré-visualização no formulário. */
  previewUri: string;
  /** Tamanho real da imagem, em bytes. */
  byteSize: number;
}

export interface NewCondominium {
  name: string;
  address: string;
  blocks: NewBlock[];
  /** `null` é "sem foto": a foto é opcional. */
  photo: SelectedPhoto | null;
}

/**
 * Erros por campo, com as MESMAS chaves que o servidor devolve: `name`, `address`, `blocks`,
 * `photo` e, para um bloco, a posição dele — `blocks.0.code`, `blocks.1.unitCount`. Assim a mensagem
 * do servidor cai ao lado da linha certa sem tradução.
 */
export type FormErrors = Record<string, string>;

export function blockCodeErrorKey(index: number): string {
  return `blocks.${index}.code`;
}

export function blockUnitCountErrorKey(index: number): string {
  return `blocks.${index}.unitCount`;
}

const BLOCK_CODE_FORMAT = /^[A-Z]{1,2}$/;

/**
 * A sigla como o campo a MOSTRA enquanto a pessoa digita: em maiúsculas, só letras de A a Z, no
 * máximo duas. "b1" vira "B", "ab c" vira "AB".
 *
 * Normalizar na entrada, em vez de só recusar no fim, é o que faz o campo "aceitar no máximo duas
 * letras e mostrá-las em maiúsculas" — a pessoa nem chega a ver o que seria recusado.
 */
export function normalizeBlockCode(typed: string): string {
  return typed
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, BLOCK_CODE_MAX_LENGTH);
}

/** O número de unidades digitado, ou `null` quando não é um inteiro escrito só com dígitos. */
export function parseUnitCount(typed: string): number | null {
  const text = typed.trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

/** O total de unidades do condomínio, somando só os blocos cujo número já é válido. */
export function totalUnits(blocks: NewBlock[]): number {
  return blocks.reduce((sum, block) => {
    const count = parseUnitCount(block.unitCount);
    return count !== null && count >= 1 && count <= MAX_UNITS_PER_BLOCK
      ? sum + count
      : sum;
  }, 0);
}

export function validateNewCondominium(input: NewCondominium): FormErrors {
  const errors: FormErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  const address = input.address.trim();
  if (address.length === 0) {
    errors.address = "Address is required.";
  } else if (address.length > ADDRESS_MAX_LENGTH) {
    errors.address = `Address must be at most ${ADDRESS_MAX_LENGTH} characters.`;
  }

  if (input.blocks.length === 0) {
    errors.blocks = "Add at least one block.";
  } else if (input.blocks.length > MAX_BLOCKS) {
    errors.blocks = `Add at most ${MAX_BLOCKS} blocks.`;
  } else {
    const seen = new Set<string>();
    let total = 0;

    input.blocks.forEach((block, index) => {
      // Maiúsculas ANTES de conferir, como o servidor: "a" é o bloco "A".
      const code = block.code.trim().toUpperCase();
      if (!BLOCK_CODE_FORMAT.test(code)) {
        errors[blockCodeErrorKey(index)] = "Use one or two letters.";
      } else if (seen.has(code)) {
        errors[blockCodeErrorKey(index)] =
          "This code is already used by another block.";
      } else {
        seen.add(code);
      }

      const unitCount = parseUnitCount(block.unitCount);
      if (unitCount === null || unitCount < 1 || unitCount > MAX_UNITS_PER_BLOCK) {
        errors[blockUnitCountErrorKey(index)] =
          `Enter a number of units from 1 to ${MAX_UNITS_PER_BLOCK}.`;
      } else {
        total += unitCount;
      }
    });

    if (total > MAX_UNITS) {
      errors.blocks = `A condominium can have at most ${MAX_UNITS} units.`;
    }
  }

  if (input.photo !== null && input.photo.byteSize > PHOTO_MAX_BYTES) {
    errors.photo = "The photo must be 5 MB or smaller.";
  }

  return errors;
}

export function hasNoErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * O tamanho em bytes do que um texto base64 representa: três bytes a cada quatro caracteres, menos
 * o preenchimento do fim. Serve para medir a foto que vai ser enviada.
 */
export function base64ByteSize(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/* -------------------------------------------------------------------------- */
/* Type guard: narrowing do JSON que chega da API (Princípio IV).             */
/* -------------------------------------------------------------------------- */

/** `true` quando o value é um objeto de errors por field, no formato do formulário. */
export function isFormErrors(value: unknown): value is FormErrors {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((message) => typeof message === "string")
  );
}
