import { Prisma } from "../../generated/prisma/client.ts";
import type { Role } from "../../generated/prisma/enums.ts";
import { prisma } from "../lib/prisma.ts";
import { signPath } from "../lib/signedPath.ts";
import type { NewCondominium } from "./condominium.dto.ts";

/**
 * Criação de um condomínio e leitura da foto dele.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code (constituição, seção
 * Backend).
 *
 * **A foto é uma coluna, e NENHUMA consulta daqui a seleciona — fora uma.** Toda leitura de
 * `condominiums` nomeia as colunas que quer, e só `readCondominiumPhoto` lê `photo`. Se um `select`
 * passar a incluí-la, nada quebra: a consulta só fica arrastando megabytes do banco, e é por isso
 * que precisa estar escrito (ADR 0012).
 */

/**
 * Por quanto tempo o caminho da foto vale. 24 horas, e não a 1 hora da foto de um achado: o perfil
 * é lido quando o app abre e fica guardado, então um endereço que morresse em uma hora quebraria o
 * banner numa sessão longa. A fachada de um prédio também é a foto menos privada que o app guarda
 * (research R-006 da 013).
 */
export const CONDOMINIUM_PHOTO_TTL_SECONDS = 24 * 60 * 60;

/** O condomínio como aparece num vínculo do perfil. */
export interface MembershipCondominium {
  id: string;
  name: string;
  /** Endereço `https://` da foto, nos condomínios de exemplo. */
  imageUrl: string | null;
  /** Caminho relativo e assinado da foto ENVIADA, ou `null`. No máximo um dos dois vem. */
  photoPath: string | null;
}

/** O vínculo que nasce junto com o condomínio, no formato de um item de `memberships` do perfil. */
export interface CreatedMembership {
  condominium: MembershipCondominium;
  role: Role;
  /** Sempre vazia: o síndico não mora em unidade nenhuma do condomínio. */
  units: never[];
}

/**
 * O caminho da foto, sem assinatura. É ELE que a assinatura cobre, então a assinatura de um
 * condomínio não abre a foto de outro.
 */
export function photoPathOf(condominiumId: string): string {
  return `/condominiums/${condominiumId}/photo`;
}

/**
 * O caminho assinado da foto enviada, ou `null` quando o condomínio não tem uma. Decide pelo TIPO
 * gravado, que é um texto curto — nunca selecionando os bytes só para saber se existem.
 */
export function signedPhotoPathOf(condominium: {
  id: string;
  photoContentType: string | null;
}): string | null {
  return condominium.photoContentType === null
    ? null
    : signPath(photoPathOf(condominium.id), CONDOMINIUM_PHOTO_TTL_SECONDS);
}

/**
 * Motivo de recusa que o controller traduz em status code.
 *
 * - `alreadyBelongs` → 409. Quem pediu já pertence a um condomínio. O pedido estava bem formado; o
 *   que não permite é o estado da conta.
 * - `pending` → 409. Quem pediu tem um pedido de entrada num condomínio à espera de resposta
 *   (feature 016). Uma conta pendente não tem vínculo — passaria pela contagem acima —, e criar um
 *   condomínio é justamente a única coisa que uma conta sem vínculo consegue fazer.
 */
export type CondominiumFailure = "alreadyBelongs" | "pending";

export class CondominiumError extends Error {
  reason: CondominiumFailure;

  constructor(reason: CondominiumFailure) {
    super(`Condomínio recusado (${reason})`);
    this.name = "CondominiumError";
    this.reason = reason;
  }
}

/**
 * Cria o condomínio, as unidades de cada bloco e o vínculo de quem criou, como SÍNDICO.
 *
 * **Tudo ou nada, numa transação.** São três tabelas, então — diferente de reservar o dia inteiro
 * (feature 011), que era um comando só — aqui não há uma instrução única em que se apoiar. Sem a
 * transação, uma falha no meio deixaria um condomínio sem síndico, ou com metade das unidades
 * (FR-021).
 *
 * O vínculo é gravado POR ÚLTIMO: as chaves estrangeiras precisam do condomínio antes, e a trigger
 * que exige unidade de um morador não se aplica a um síndico.
 *
 * As unidades de cada bloco são numeradas de `1` a `N`, como texto — a coluna `number` é texto
 * porque também guarda coisas como `101`. Um bloco não é uma tabela: é o valor de `block` que as
 * unidades dele compartilham.
 *
 * Quem cria vem do token, nunca do body.
 *
 * **Só cria quem ainda não pertence a condomínio nenhum, e por isso um síndico tem um só** (decisão
 * do dono do produto, 2026-10-07). Criar é o que torna a pessoa síndica; quem já é moradora,
 * administradora ou porteira de algum lugar não cria, e quem já criou o seu não cria outro.
 *
 * São duas travas, e as duas são necessárias:
 *
 * - a contagem de vínculos, dentro da transação, recusa quem já pertence a algum condomínio com
 *   QUALQUER cargo — é a única que pega o morador, o administrador e o porteiro;
 * - o índice único `condominium_members_one_condominium_per_manager_key` recusa o segundo vínculo de
 *   síndico. É ele que segura dois pedidos simultâneos da mesma conta, que passariam os dois pela
 *   contagem. Até esta regra um pedido repetido criava um segundo condomínio, e quem barrava o
 *   toque duplo era só o app.
 *
 * Dois condomínios continuam podendo ter o mesmo nome (RN-CON-01).
 */
export async function createCondominium(
  data: NewCondominium,
  creatorId: string
): Promise<CreatedMembership> {
  const created = await prisma.$transaction(async (transaction) => {
    const memberships = await transaction.condominiumMember.count({
      where: { userId: creatorId },
    });
    if (memberships > 0) {
      throw new CondominiumError("alreadyBelongs");
    }

    const joinRequest = await transaction.joinRequest.findUnique({
      where: { userId: creatorId },
      select: { id: true },
    });
    if (joinRequest) {
      throw new CondominiumError("pending");
    }

    const condominium = await transaction.condominium.create({
      data: {
        name: data.name,
        address: data.address,
        photo: data.photo?.bytes ?? null,
        photoContentType: data.photo?.contentType ?? null,
      },
      // As colunas pelo nome: sem isto o `create` devolveria a linha inteira, foto incluída.
      select: { id: true, name: true, imageUrl: true, photoContentType: true },
    });

    await transaction.unit.createMany({
      data: data.blocks.flatMap((block) =>
        Array.from({ length: block.unitCount }, (_, index) => ({
          condominiumId: condominium.id,
          block: block.code,
          number: String(index + 1),
        }))
      ),
    });

    try {
      await transaction.condominiumMember.create({
        data: {
          userId: creatorId,
          condominiumId: condominium.id,
          role: "manager",
        },
        select: { userId: true },
      });
    } catch (error) {
      // `P2002` aqui só pode ser o índice de "um condomínio por síndico": outro pedido desta mesma
      // conta gravou antes. A transação inteira é desfeita, então não sobra condomínio sem síndico.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new CondominiumError("alreadyBelongs");
      }
      throw error;
    }

    return condominium;
  });

  return {
    condominium: {
      id: created.id,
      name: created.name,
      imageUrl: created.imageUrl,
      photoPath: signedPhotoPathOf(created),
    },
    role: "manager",
    units: [],
  };
}

/**
 * Os bytes e o tipo da foto enviada de um condomínio. É a ÚNICA função que seleciona `photo`.
 *
 * `null` para condomínio inexistente e para condomínio sem foto enviada — quem chama responde igual
 * aos dois.
 */
export async function readCondominiumPhoto(
  condominiumId: string
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const row = await prisma.condominium.findUnique({
    where: { id: condominiumId },
    select: { photo: true, photoContentType: true },
  });

  if (!row || row.photo === null || row.photoContentType === null) {
    return null;
  }

  return { bytes: row.photo, contentType: row.photoContentType };
}
