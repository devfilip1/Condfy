import {
  MESSAGE_PHOTO_NOT_IMAGE,
  decodeUploadedPhoto,
  type UploadedPhoto,
} from "../lib/uploadedPhoto.ts";

/**
 * Validação do body de `POST /condominiums`.
 *
 * ESTE ARQUIVO TEM UM ESPELHO: as regras e as mensagens são as MESMAS de
 * `mobile/features/condominiums/domain/newCondominium.ts`. App e API são projetos separados, então
 * a regra existe nos dois lugares de propósito. Ao mudar um, mude o outro.
 *
 * Uma diferença é da natureza dos dois lados, não descuido: só o servidor olha os BYTES da foto
 * para saber se ela é mesmo uma imagem.
 *
 * **A regra "sigla de uma ou duas letras" mora AQUI, e não numa CHECK do banco — ao contrário do
 * costume do projeto.** Os dados de exemplo têm blocos chamados `T1` e unidades sem bloco, e eles
 * continuam valendo; uma CHECK os recusaria. A regra é sobre o que o FORMULÁRIO cria, então é
 * conferida onde o formulário é recebido (research R-004 da 013).
 */

export const NAME_MAX_LENGTH = 100;
export const ADDRESS_MAX_LENGTH = 200;
export const MAX_BLOCKS = 50;
export const MAX_UNITS_PER_BLOCK = 500;
export const MAX_UNITS = 2000;
export interface NewBlock {
  /** Uma ou duas letras de A a Z, já em maiúsculas. */
  code: string;
  unitCount: number;
}

/** Dados já validados e normalizados. Quem cria vem do token, nunca daqui. */
export interface NewCondominium {
  name: string;
  address: string;
  blocks: NewBlock[];
  /** `null` é "sem foto": o condomínio mostra o placeholder. */
  photo: UploadedPhoto | null;
}

/**
 * Erros por campo. Os de um bloco são endereçados pela POSIÇÃO — `blocks.0.code`,
 * `blocks.1.unitCount` — para o app pôr a mensagem ao lado da linha certa.
 */
export type FormErrors = Record<string, string>;

export type NewCondominiumValidation =
  | { ok: true; data: NewCondominium }
  | { ok: false; errors: FormErrors };

const BLOCK_CODE_FORMAT = /^[A-Z]{1,2}$/;

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Campo ausente ou de tipo errado conta como texto vazio. */
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Valida o body recebido como `unknown` (Constituição, Princípio IV).
 *
 * Só quatro campos são lidos: `name`, `address`, `blocks` e `photo`. Um `role`, um `managerId` ou
 * um `id` no body são ignorados — o síndico é quem está autenticado, e o resto é do banco.
 */
export function validateNewCondominium(body: unknown): NewCondominiumValidation {
  const data = asObject(body);
  const errors: FormErrors = {};

  const name = text(data.name);
  if (name.length === 0) {
    errors.name = "Name is required.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }

  const address = text(data.address);
  if (address.length === 0) {
    errors.address = "Address is required.";
  } else if (address.length > ADDRESS_MAX_LENGTH) {
    errors.address = `Address must be at most ${ADDRESS_MAX_LENGTH} characters.`;
  }

  const rawBlocks = Array.isArray(data.blocks) ? data.blocks : [];
  const blocks: NewBlock[] = [];

  if (rawBlocks.length === 0) {
    errors.blocks = "Add at least one block.";
  } else if (rawBlocks.length > MAX_BLOCKS) {
    errors.blocks = `Add at most ${MAX_BLOCKS} blocks.`;
  } else {
    const seen = new Set<string>();
    let total = 0;

    rawBlocks.forEach((raw, index) => {
      const block = asObject(raw);

      // Maiúsculas ANTES de conferir: "a" é o bloco "A", e é assim que ele é gravado.
      const code = text(block.code).toUpperCase();
      if (!BLOCK_CODE_FORMAT.test(code)) {
        errors[`blocks.${index}.code`] = "Use one or two letters.";
      } else if (seen.has(code)) {
        errors[`blocks.${index}.code`] =
          "This code is already used by another block.";
      } else {
        seen.add(code);
      }

      const unitCount = block.unitCount;
      if (
        typeof unitCount !== "number" ||
        !Number.isInteger(unitCount) ||
        unitCount < 1 ||
        unitCount > MAX_UNITS_PER_BLOCK
      ) {
        errors[`blocks.${index}.unitCount`] =
          `Enter a number of units from 1 to ${MAX_UNITS_PER_BLOCK}.`;
      } else {
        total += unitCount;
        blocks.push({ code: code, unitCount: unitCount });
      }
    });

    if (total > MAX_UNITS) {
      errors.blocks = `A condominium can have at most ${MAX_UNITS} units.`;
    }
  }

  // Ausente, `null` e texto vazio são "sem foto" — ela é opcional.
  let photo: NewCondominium["photo"] = null;
  if (typeof data.photo === "string" && data.photo.length > 0) {
    const decoded = decodeUploadedPhoto(data.photo);
    if (typeof decoded === "string") {
      errors.photo = decoded;
    } else {
      photo = decoded;
    }
  } else if (data.photo !== undefined && data.photo !== null && data.photo !== "") {
    errors.photo = MESSAGE_PHOTO_NOT_IMAGE;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, address, blocks, photo } };
}
