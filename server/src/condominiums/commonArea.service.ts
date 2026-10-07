import { Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../lib/prisma.ts";
import { managesCondominium } from "../lib/roles.ts";
import { signPath } from "../lib/signedPath.ts";
import type { NewCommonArea } from "./commonArea.dto.ts";

/**
 * Regras e acesso a dados das áreas comuns de um condomínio.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * Contrato e banco usam o mesmo vocabulário em inglês, então não há tradução de nomes — só a
 * conversão do `DECIMAL`, que o banco guarda como número exato e o contrato entrega como texto.
 */

/** Área comum no formato do contrato JSON. */
export interface CommonArea {
  id: string;
  name: string;
  /**
   * Dinheiro como TEXTO, com duas casas: `"0.00"`, `"150.00"`.
   * Um `number` de JavaScript não representa todo decimal com exatidão, e isto é dinheiro
   * (research R-002). Quem exibe formata; o contrato só garante exatidão.
   */
  usageFee: string;
  imageUrl: string | null;
  /**
   * O caminho relativo e assinado da foto ENVIADA ao criar o local, ou `null`. Os locais de
   * exemplo usam `imageUrl`; no máximo um dos dois vem preenchido.
   */
  photoPath: string | null;
  /** `false` — o local está no catálogo, mas não aceita reserva de ninguém (feature 011). */
  isAvailable: boolean;
}

/**
 * Por quanto tempo o caminho da foto de um local vale. O mesmo dia inteiro da foto do condomínio: a
 * fachada de um salão de festas não é segredo, e o catálogo pode ficar aberto por horas.
 */
export const COMMON_AREA_PHOTO_TTL_SECONDS = 24 * 60 * 60;

/** O caminho da foto, sem assinatura. É ELE que a assinatura cobre. */
export function commonAreaPhotoPathOf(
  condominiumId: string,
  commonAreaId: string
): string {
  return `/condominiums/${condominiumId}/common-areas/${commonAreaId}/photo`;
}

/**
 * O caminho assinado da foto enviada, ou `null` quando o local não tem uma. Decide pelo TIPO
 * gravado, que é um texto curto — nunca selecionando os bytes só para saber se existem.
 */
export function signedCommonAreaPhotoPath(
  condominiumId: string,
  commonArea: { id: string; photoContentType: string | null }
): string | null {
  return commonArea.photoContentType === null
    ? null
    : signPath(
        commonAreaPhotoPathOf(condominiumId, commonArea.id),
        COMMON_AREA_PHOTO_TTL_SECONDS
      );
}

/**
 * Motivo da recusa que o controller traduz em status code.
 *
 * - `condominium` → 404. Quem pediu não tem vínculo com o condomínio, ou ele não existe.
 * - `forbidden` → 403. Tem vínculo, mas não é o administrador (ADR 0010).
 * - `commonArea` → 404. O local não existe, ou é de outro condomínio.
 * - `nameTaken` → 400 no campo `name`. Já existe um local com esse nome no condomínio.
 */
export type CommonAreaFailure =
  | "condominium"
  | "forbidden"
  | "commonArea"
  | "nameTaken";

export class CommonAreaError extends Error {
  reason: CommonAreaFailure;

  constructor(reason: CommonAreaFailure) {
    super(`Área comum recusada (${reason})`);
    this.name = "CommonAreaError";
    this.reason = reason;
  }
}

/**
 * As colunas que toda leitura de um local seleciona. `photo` NÃO está aqui, e não pode estar: são
 * megabytes. `photoContentType` é o que diz se há foto enviada.
 */
const COMMON_AREA_COLUMNS = {
  id: true,
  name: true,
  usageFee: true,
  imageUrl: true,
  photoContentType: true,
  isAvailable: true,
} as const;

function toContract(
  condominiumId: string,
  row: {
    id: string;
    name: string;
    usageFee: { toFixed: (digits: number) => string };
    imageUrl: string | null;
    photoContentType: string | null;
    isAvailable: boolean;
  }
): CommonArea {
  return {
    id: row.id,
    name: row.name,
    // `toFixed(2)` fixa as duas casas sem passar por float em momento nenhum.
    usageFee: row.usageFee.toFixed(2),
    imageUrl: row.imageUrl,
    photoPath: signedCommonAreaPhotoPath(condominiumId, row),
    isAvailable: row.isAvailable,
  };
}

/**
 * Catálogo de um condomínio, para quem tem vínculo nele.
 *
 * Condomínio inexistente e condomínio alheio levantam o MESMO erro: responder de formas diferentes
 * permitiria descobrir quais condomínios o sistema atende (mesmo motivo do FR-003 na autenticação
 * e da recusa de `unitId` no ADR 0009).
 *
 * Vêm TODOS os locais, disponíveis ou não, cada um dizendo qual é o caso. Até a feature 011 um
 * local desligado sumia daqui; agora ele fica, e é a tela que o mostra apagado e explica o toque
 * (research R-006). Lista vazia passou a querer dizer uma coisa só: o condomínio não tem local
 * cadastrado. `condominiumId` não volta em cada item: todo item pertence ao condomínio que já está
 * no caminho da rota.
 */
export async function listCommonAreas(
  condominiumId: string,
  requesterId: string
): Promise<CommonArea[]> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { userId: true },
  });

  if (!membership) {
    throw new CommonAreaError("condominium");
  }

  const rows = await prisma.commonArea.findMany({
    where: { condominiumId: condominiumId },
    select: COMMON_AREA_COLUMNS,
    orderBy: { name: "asc" },
  });

  return rows.map((row) => toContract(condominiumId, row));
}

/**
 * Cria um local de reserva. **Só o SÍNDICO do condomínio.**
 *
 * É a primeira regra do sistema que é do síndico SOZINHO, e por isso NÃO chama
 * `managesCondominium`: o administrador liga e desliga um local, mas não cria um. Aqui o cargo é
 * conferido pelo nome dele (ADR 0017).
 *
 * A ordem das recusas é a do ADR 0010: sem vínculo → 404; tem vínculo mas não é o síndico → 403.
 *
 * O local nasce DISPONÍVEL — desligar é o interruptor da tela de reserva. O nome é único dentro do
 * condomínio, e quem garante é o índice único do banco: a violação vira um erro no campo `name`,
 * em vez de um "confere se existe e depois grava" que dois pedidos simultâneos atravessariam.
 */
export async function createCommonArea(
  condominiumId: string,
  requesterId: string,
  data: NewCommonArea
): Promise<CommonArea> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new CommonAreaError("condominium");
  }
  if (membership.role !== "manager") {
    throw new CommonAreaError("forbidden");
  }

  try {
    const row = await prisma.commonArea.create({
      data: {
        condominiumId: condominiumId,
        name: data.name,
        // Texto para o `Decimal`: o valor nunca passa por um float.
        usageFee: data.usageFee,
        photo: data.photo.bytes,
        photoContentType: data.photo.contentType,
      },
      // As colunas pelo nome: sem isto o `create` devolveria a linha inteira, foto incluída.
      select: COMMON_AREA_COLUMNS,
    });
    return toContract(condominiumId, row);
  } catch (error) {
    // `P2002` é violação de índice único, e o único que esta gravação pode violar é o de
    // `(condominium_id, name)`.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new CommonAreaError("nameTaken");
    }
    throw error;
  }
}

/**
 * Os bytes e o tipo da foto enviada de um local. É a ÚNICA função que seleciona `photo`.
 *
 * `null` para local inexistente, de outro condomínio, ou sem foto enviada — quem chama responde
 * igual aos três.
 */
export async function readCommonAreaPhoto(
  condominiumId: string,
  commonAreaId: string
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const row = await prisma.commonArea.findFirst({
    where: { id: commonAreaId, condominiumId: condominiumId },
    select: { photo: true, photoContentType: true },
  });

  if (!row || row.photo === null || row.photoContentType === null) {
    return null;
  }

  return { bytes: row.photo, contentType: row.photoContentType };
}

/**
 * Liga ou desliga um local. Só o administrador do condomínio.
 *
 * A ordem das recusas é a do ADR 0010, e importa:
 *
 * 1. Sem vínculo → 404. Quem é de fora não descobre nada.
 * 2. Tem vínculo mas não é administrador → 403, ANTES de o local ser procurado: quem não pode mudar
 *    nada não fica sabendo se aquele id existe.
 * 3. Só então local inexistente, ou de outro condomínio → 404.
 *
 * **Nenhuma reserva é tocada**, em nenhum dos dois sentidos: desligar não cancela o que já estava
 * marcado, e é por isso que religar devolve o local exatamente como estava (RN-RSV-01).
 *
 * É idempotente: pedir o estado em que o local já está responde igual a mudá-lo. Um toque repetido
 * ou um pedido reenviado não fazem mal.
 */
export async function setCommonAreaAvailability(
  condominiumId: string,
  commonAreaId: string,
  requesterId: string,
  isAvailable: boolean
): Promise<CommonArea> {
  const membership = await prisma.condominiumMember.findUnique({
    where: {
      userId_condominiumId: { userId: requesterId, condominiumId: condominiumId },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new CommonAreaError("condominium");
  }

  if (!managesCondominium(membership.role)) {
    throw new CommonAreaError("forbidden");
  }

  // `updateMany` e não `update`: o filtro leva o condomínio junto, então um id de outro condomínio
  // simplesmente não casa com linha nenhuma.
  const changed = await prisma.commonArea.updateMany({
    where: { id: commonAreaId, condominiumId: condominiumId },
    data: { isAvailable: isAvailable },
  });

  if (changed.count === 0) {
    throw new CommonAreaError("commonArea");
  }

  const row = await prisma.commonArea.findFirst({
    where: { id: commonAreaId, condominiumId: condominiumId },
    select: COMMON_AREA_COLUMNS,
  });

  if (!row) {
    throw new CommonAreaError("commonArea");
  }

  return toContract(condominiumId, row);
}
