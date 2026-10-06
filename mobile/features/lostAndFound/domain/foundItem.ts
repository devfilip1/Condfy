/**
 * Entidade de domínio FoundItem — algo encontrado no condomínio, à espera do dono.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * ESTE ARQUIVO TEM UM ESPELHO: as regras e as mensagens de `validateNewFoundItem` são as MESMAS de
 * `server/src/condominiums/foundItem.dto.ts`. App e API são projetos separados, então a regra
 * existe nos dois lugares de propósito: a daqui para a pessoa saber na hora, a de lá para o dado não
 * entrar errado. Ao mudar um, mude o outro.
 *
 * Uma diferença é da natureza dos dois lados, não descuido: aqui se confere que HÁ uma foto e o
 * tamanho dela; só o servidor confere que os bytes são mesmo uma imagem.
 */

/** `found` — à espera do dono. `returned` — devolvido. São dois valores e mais nenhum. */
export type FoundItemStatus = "found" | "returned";

export interface FoundItem {
  id: string;
  description: string;
  /** Onde foi encontrado. */
  place: string;
  status: FoundItemStatus;
  /**
   * INSTANTE ISO 8601 em UTC. É a única data do app que não é um dia de calendário: quem exibe usa
   * `toDisplayDateTime`, que converte para o horário local.
   */
  postedAt: string;
  /**
   * Caminho assinado da foto, relativo ao endereço da API e válido por uma hora. Muda a cada carga
   * da lista: não guarde nem compare. Quem exibe junta com `apiUrl` e usa o `id` como chave de
   * cache.
   */
  photoPath: string;
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

/** O que o formulário entrega. `photo` é `null` enquanto nenhuma foi escolhida. */
export interface NewFoundItem {
  description: string;
  place: string;
  photo: SelectedPhoto | null;
}

export interface FormErrors {
  description?: string;
  place?: string;
  photo?: string;
}

export const DESCRIPTION_MAX_LENGTH = 200;
export const PLACE_MAX_LENGTH = 120;
/** 5 MB. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function validateNewFoundItem(input: NewFoundItem): FormErrors {
  const errors: FormErrors = {};

  const description = input.description.trim();
  if (description.length === 0) {
    errors.description = "Describe the item.";
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Use up to ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  const place = input.place.trim();
  if (place.length === 0) {
    errors.place = "Say where it was found.";
  } else if (place.length > PLACE_MAX_LENGTH) {
    errors.place = `Use up to ${PLACE_MAX_LENGTH} characters.`;
  }

  if (input.photo === null || input.photo.base64.length === 0) {
    errors.photo = "Add a photo of the item.";
  } else if (input.photo.byteSize > PHOTO_MAX_BYTES) {
    errors.photo = "The photo must be 5 MB or smaller.";
  }

  return errors;
}

export function hasNoErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * O status para o qual o botão leva: o outro. Com dois valores e as duas direções permitidas, esta
 * é toda a "máquina de estados" do item.
 */
export function nextStatus(status: FoundItemStatus): FoundItemStatus {
  return status === "found" ? "returned" : "found";
}

/**
 * O tamanho em bytes do que um texto base64 representa: três bytes a cada quatro caracteres, menos
 * o preenchimento do fim. Serve para quando o seletor de fotos não informa o tamanho do arquivo.
 */
export function base64ByteSize(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Princípio IV).            */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `true` quando o value tem exatamente a forma de um `FoundItem` válido. */
export function isFoundItem(value: unknown): value is FoundItem {
  if (!isObject(value)) {
    return false;
  }
  // Um terceiro status é resposta fora do contrato, não um item a exibir de qualquer jeito.
  if (value.status !== "found" && value.status !== "returned") {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.place === "string" &&
    typeof value.postedAt === "string" &&
    typeof value.photoPath === "string"
  );
}

/** `true` quando o value é uma list em que todo item é um `FoundItem`. */
export function isFoundItemList(value: unknown): value is FoundItem[] {
  return Array.isArray(value) && value.every(isFoundItem);
}

/** Os errors de field de um `400`, quando o body veio no formato do contrato. */
export function isFormErrors(value: unknown): value is FormErrors {
  if (!isObject(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([field, message]) =>
      (field === "description" || field === "place" || field === "photo") &&
      typeof message === "string"
  );
}
