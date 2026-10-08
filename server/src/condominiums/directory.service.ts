import { prisma } from "../lib/prisma.ts";

/**
 * O diretório: os condomínios que existem e as unidades de cada um (feature 016).
 *
 * **É PÚBLICO.** Quem lê isto ainda não tem conta — é o que alimenta as listas do cadastro, onde a
 * pessoa diz em que condomínio e em que unidade mora. Não recebe quem está pedindo, porque não há
 * quem.
 *
 * Por isso **toda consulta aqui nomeia as colunas que lê**, e nenhuma junta nada sobre pessoas:
 *
 * - de um condomínio saem o nome e o endereço. A FOTO não — nem os bytes, que nenhuma lista pode
 *   selecionar (ADR 0012), nem o caminho assinado, que é permissão de quem já pertence a ele;
 * - de uma unidade saem o bloco e o número. Não sai quem mora nela, quantos moram, nem se alguém
 *   mora.
 *
 * Que os nomes e endereços dos condomínios que usam o aplicativo fiquem visíveis a qualquer um é
 * um custo aceito: não há outro jeito de escolher um condomínio antes de ter conta.
 */

export interface DirectoryCondominium {
  id: string;
  name: string;
  /** `null` nos condomínios anteriores a ter endereço. É o que distingue dois de mesmo nome. */
  address: string | null;
}

export interface DirectoryUnit {
  id: string;
  /** `null` em condomínio sem blocos. */
  block: string | null;
  number: string;
}

/** Todos os condomínios, por nome. O `id` desempata dois de mesmo nome, para a ordem ser estável. */
export async function listDirectoryCondominiums(): Promise<DirectoryCondominium[]> {
  return prisma.condominium.findMany({
    select: { id: true, name: true, address: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

/**
 * Todas as unidades de um condomínio, numa resposta só — no máximo 2000 linhas pequenas. O app as
 * agrupa por bloco e as ordena como NÚMEROS: `number` é texto, e aqui "10" vem antes de "2".
 *
 * Condomínio inexistente devolve lista vazia, e não um erro: a resposta não precisa dizer a um
 * desconhecido se um id existe.
 */
export async function listDirectoryUnits(
  condominiumId: string
): Promise<DirectoryUnit[]> {
  return prisma.unit.findMany({
    where: { condominiumId: condominiumId },
    select: { id: true, block: true, number: true },
    orderBy: [{ block: "asc" }, { number: "asc" }, { id: "asc" }],
  });
}
