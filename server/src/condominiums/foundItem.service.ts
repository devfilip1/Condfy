import type { FoundItemStatus, Role } from "../../generated/prisma/enums.ts";
import type { ImageContentType } from "../lib/imageType.ts";
import { prisma } from "../lib/prisma.ts";
import { managesCondominium, readsLostAndFound } from "../lib/roles.ts";
import { signPath } from "../lib/signedPath.ts";

/**
 * Regras e acesso a dados dos achados e perdidos de um condomínio.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * A regra de permissão é a do ADR 0010, aplicada pela terceira vez: o banco garante *vínculo* — a
 * FK composta exige a linha de `condominium_members` — e este módulo garante *cargo*, porque uma FK
 * não consegue exigir que `role` valha `admin`.
 *
 * **Nenhuma listagem daqui seleciona `photo`.** A foto mora na linha do item (ADR 0012) e pode ter
 * megabytes; ela só sai por `readFoundItemPhoto`. Se um `select` passar a incluí-la, nada quebra —
 * a lista só fica arrastando megabytes do banco a cada carga, e é por isso que precisa estar
 * escrito.
 */

/** Por quanto tempo o caminho da foto vale, em segundos (research R-005). */
const PHOTO_PATH_TTL_SECONDS = 60 * 60;

/** Item no formato do contrato JSON. */
export interface FoundItem {
  id: string;
  description: string;
  /** Onde foi encontrado. */
  place: string;
  status: FoundItemStatus;
  /**
   * INSTANTE ISO 8601 em UTC: `"2026-10-05T23:10:00.000Z"`. É a única data do contrato que não é um
   * dia de calendário — o app a mostra no horário local de quem lê.
   */
  postedAt: string;
  /**
   * Caminho assinado da foto, relativo ao endereço da API e válido por uma hora. Não é coluna: é
   * derivado a cada resposta, e por isso muda a cada resposta.
   */
  photoPath: string;
}

/**
 * Motivos de recusa que o controller traduz em status code.
 *
 * - `condominium` → 404. Quem pediu não tem vínculo com o condomínio, ou ele não existe.
 * - `forbidden` → 403. Tem vínculo, mas não é o administrador. Ela lê a lista todo dia, então
 *   dizer "não encontrado" seria mentira.
 * - `item` → 404. O item não existe neste condomínio — ou quem pediu é de fora, que recebe a mesma
 *   resposta.
 */
export type FoundItemFailure = "condominium" | "forbidden" | "item";

export class FoundItemError extends Error {
  reason: FoundItemFailure;

  constructor(reason: FoundItemFailure) {
    super(`Item encontrado recusado (${reason})`);
    this.name = "FoundItemError";
    this.reason = reason;
  }
}

/** O que o serviço precisa gravar. Já validado pelo dto, foto incluída. */
export interface NewFoundItem {
  description: string;
  place: string;
  photo: Uint8Array<ArrayBuffer>;
  photoContentType: ImageContentType;
}

/** As colunas que viajam. `photo` fica FORA, de propósito. */
const CONTRACT_COLUMNS = {
  id: true,
  condominiumId: true,
  description: true,
  place: true,
  status: true,
  postedAt: true,
} as const;

/** O caminho da foto de um item, ainda sem assinatura. É este texto que a assinatura cobre. */
export function photoPathOf(condominiumId: string, itemId: string): string {
  return `/condominiums/${condominiumId}/found-items/${itemId}/photo`;
}

/** Converte a row para o contrato. `postedById` e os bytes da foto nunca saem daqui. */
function toFoundItem(row: {
  id: string;
  condominiumId: string;
  description: string;
  place: string;
  status: FoundItemStatus;
  postedAt: Date;
}): FoundItem {
  return {
    id: row.id,
    description: row.description,
    place: row.place,
    status: row.status,
    // Um instante vai inteiro. O contrário das colunas `DATE`, que são cortadas no dia.
    postedAt: row.postedAt.toISOString(),
    photoPath: signPath(photoPathOf(row.condominiumId, row.id), PHOTO_PATH_TTL_SECONDS),
  };
}

/** Vínculo de quem está pedindo, com o cargo. `null` quando não é membro. */
async function membershipOf(
  condominiumId: string,
  userId: string
): Promise<{ role: Role } | null> {
  return prisma.condominiumMember.findUnique({
    where: { userId_condominiumId: { userId: userId, condominiumId: condominiumId } },
    select: { role: true },
  });
}

/* -------------------------------------------------------------------------- */
/* Ler                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Tudo o que foi encontrado num condomínio, para quem tem vínculo nele — qualquer cargo, menos o
 * porteiro (`readsLostAndFound`).
 *
 * Os devolvidos vêm junto: marcar como devolvido não tira da lista (FR-014). Mais recente primeiro,
 * com `id` desempatando para dois itens do mesmo instante não trocarem de lugar entre visitas
 * (FR-015).
 */
export async function listFoundItems(
  condominiumId: string,
  requesterId: string
): Promise<FoundItem[]> {
  const membership = await membershipOf(condominiumId, requesterId);
  if (!membership) {
    throw new FoundItemError("condominium");
  }
  // O porteiro perdeu achados e perdidos na feature 015 — o acesso, e não só o card da home. Ele
  // pertence ao condomínio, então ouve que não pode (403), em vez do 404 de quem é de fora.
  //
  // A rota da FOTO não muda e não precisa: a permissão dela é o caminho assinado, que só é
  // entregue por esta lista (ADR 0012). Recusado aqui, o porteiro não recebe caminho nenhum; um
  // caminho que ele já tinha morre sozinho em uma hora.
  if (!readsLostAndFound(membership.role)) {
    throw new FoundItemError("forbidden");
  }

  const rows = await prisma.foundItem.findMany({
    where: { condominiumId: condominiumId },
    select: CONTRACT_COLUMNS,
    orderBy: [{ postedAt: "desc" }, { id: "desc" }],
  });

  return rows.map(toFoundItem);
}

/**
 * Os bytes da foto de um item, ou `null` se o item não existe naquele condomínio.
 *
 * **Não confere vínculo, e isso é de propósito.** Quem chama já conferiu a assinatura do caminho,
 * e a assinatura É a permissão: ela só é entregue dentro de `listFoundItems`, que só responde a um
 * membro (research R-005). É a única função deste módulo que seleciona `photo`.
 */
export async function readFoundItemPhoto(
  condominiumId: string,
  itemId: string
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const row = await prisma.foundItem.findFirst({
    where: { id: itemId, condominiumId: condominiumId },
    select: { photo: true, photoContentType: true },
  });

  if (!row) {
    return null;
  }
  return { bytes: row.photo, contentType: row.photoContentType };
}

/* -------------------------------------------------------------------------- */
/* Postar                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Posta um item. Só o administrador daquele condomínio consegue.
 *
 * `status` e `postedAt` não são informados: o banco preenche os dois, com `found` e com o relógio
 * dele (FR-004, FR-005). Quem posta vem do token, e o condomínio vem do caminho da rota — o body
 * não escolhe nenhum dos dois (FR-024).
 *
 * A foto vai na MESMA escrita que o texto: ou o item existe inteiro, ou não existe.
 */
export async function postFoundItem(
  condominiumId: string,
  postedById: string,
  data: NewFoundItem
): Promise<FoundItem> {
  const membership = await membershipOf(condominiumId, postedById);

  if (!membership) {
    throw new FoundItemError("condominium");
  }
  if (!managesCondominium(membership.role)) {
    throw new FoundItemError("forbidden");
  }

  const row = await prisma.foundItem.create({
    data: {
      condominiumId: condominiumId,
      postedById: postedById,
      description: data.description,
      place: data.place,
      photo: data.photo,
      photoContentType: data.photoContentType,
    },
    select: CONTRACT_COLUMNS,
  });

  return toFoundItem(row);
}

/* -------------------------------------------------------------------------- */
/* Trocar o status                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Marca um item como devolvido, ou de volta como encontrado. Só o administrador consegue.
 *
 * A ordem das recusas é a do ADR 0010, e importa:
 *
 * 1. Sem vínculo → `item` (404). Quem é de fora não descobre nada — nem que o condomínio existe.
 * 2. Tem vínculo mas não é administrador → `forbidden` (403).
 * 3. Só então o item é procurado: inexistente, ou de outro condomínio → `item` (404).
 *
 * O 2 vem antes do 3 de propósito: quem não pode mudar nada recebe a mesma resposta exista o id ou
 * não. E um administrador de OUTRO condomínio cai no 1, porque não é membro deste.
 *
 * Só `status` muda. A função não recebe mais nada, então não há como descrição, local, momento da
 * postagem ou foto serem tocados por aqui (FR-030). Pedir o status que o item já tem é uma
 * atualização comum, que não muda nada (FR-031); e duas trocas simultâneas são dois `UPDATE`s — a
 * última vence, e o item está sempre num dos dois estados.
 */
export async function changeFoundItemStatus(
  condominiumId: string,
  itemId: string,
  requesterId: string,
  status: FoundItemStatus
): Promise<FoundItem> {
  const membership = await membershipOf(condominiumId, requesterId);

  if (!membership) {
    throw new FoundItemError("item");
  }
  if (!managesCondominium(membership.role)) {
    throw new FoundItemError("forbidden");
  }

  const existing = await prisma.foundItem.findFirst({
    where: { id: itemId, condominiumId: condominiumId },
    select: { id: true },
  });
  if (!existing) {
    throw new FoundItemError("item");
  }

  const row = await prisma.foundItem.update({
    where: { id: existing.id },
    data: { status: status },
    select: CONTRACT_COLUMNS,
  });

  return toFoundItem(row);
}
