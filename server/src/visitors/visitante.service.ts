import type { Visitante as LinhaVisitante } from "../../generated/prisma/client.ts";
import type { TipoVisita } from "../../generated/prisma/enums.ts";
import { prisma } from "../lib/prisma.ts";
import type { NovoVisitante } from "./visitante.dto.ts";

/**
 * Regras e acesso a dados de visitantes.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 */

/** Visitante no formato do contrato JSON: os mesmos campos e nomes do app. */
export interface Visitante {
  id: string;
  nome: string;
  tipo: TipoVisita;
  /** Dia de calendário `YYYY-MM-DD`, sem horário e sem fuso. */
  dataPrevista: string;
  autorizadoPor: string;
}

/**
 * Converte a linha do banco para o contrato.
 *
 * A coluna `data_prevista` é `DATE`, que o Prisma entrega como `Date` à meia-noite UTC. Ler a data
 * em UTC devolve sempre o dia gravado, sem deslocamento de fuso (research R-007).
 * `criadoEm` e `atualizadoEm` ficam fora do contrato.
 */
export function paraVisitante(linha: LinhaVisitante): Visitante {
  return {
    id: linha.id,
    nome: linha.nome,
    tipo: linha.tipo,
    dataPrevista: linha.dataPrevista.toISOString().slice(0, 10),
    autorizadoPor: linha.autorizadoPor,
  };
}

/**
 * Todos os visitantes, da data prevista mais próxima para a mais distante (FR-016).
 * No empate, vale a ordem de criação, e por fim o `id`, para a ordem ser sempre estável.
 */
export async function listarVisitantes(): Promise<Visitante[]> {
  const linhas = await prisma.visitante.findMany({
    orderBy: [{ dataPrevista: "asc" }, { criadoEm: "asc" }, { id: "asc" }],
  });
  return linhas.map(paraVisitante);
}

/**
 * Grava um visitante já validado e devolve o registro com o `id` gerado pelo banco.
 * A data entra como meia-noite UTC para a coluna `DATE` guardar exatamente o dia informado
 * (research R-007).
 */
export async function criarVisitante(dados: NovoVisitante): Promise<Visitante> {
  const linha = await prisma.visitante.create({
    data: {
      nome: dados.nome,
      tipo: dados.tipo,
      dataPrevista: new Date(`${dados.dataPrevista}T00:00:00.000Z`),
      autorizadoPor: dados.autorizadoPor,
    },
  });
  return paraVisitante(linha);
}

/**
 * Remove o visitante de forma permanente. Remover um `id` que já não existe também é sucesso:
 * a operação é idempotente (FR-012, research R-011).
 */
export async function removerVisitante(id: string): Promise<void> {
  await prisma.visitante.deleteMany({ where: { id } });
}
