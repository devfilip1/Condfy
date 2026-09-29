import type { Visitor as LinhaVisitante } from "../../generated/prisma/client.ts";
import type { VisitType } from "../../generated/prisma/enums.ts";
import { prisma } from "../lib/prisma.ts";
import type { NovoVisitante, TipoVisita } from "./visitante.dto.ts";

/**
 * Regras e acesso a dados de visitantes.
 *
 * Não conhece HTTP: não recebe objetos de requisição e não escolhe status code. Por isso pode ser
 * chamado por rotas, scripts e testes (constituição, seção Backend).
 *
 * O banco é em inglês e o contrato JSON em português (constituição v3.0.0, III): este service é
 * o único lugar que traduz entre os dois.
 */

const PARA_VISIT_TYPE: Record<TipoVisita, VisitType> = {
  visitante: "visitor",
  entrega: "delivery",
  prestador: "service_provider",
};

const PARA_TIPO_VISITA: Record<VisitType, TipoVisita> = {
  visitor: "visitante",
  delivery: "entrega",
  service_provider: "prestador",
};

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
 * A coluna `expected_date` é `DATE`, que o Prisma entrega como `Date` à meia-noite UTC. Ler a data
 * em UTC devolve sempre o dia gravado, sem deslocamento de fuso (research R-007).
 * `createdAt` e `updatedAt` ficam fora do contrato.
 */
export function paraVisitante(linha: LinhaVisitante): Visitante {
  return {
    id: linha.id,
    nome: linha.name,
    tipo: PARA_TIPO_VISITA[linha.type],
    dataPrevista: linha.expectedDate.toISOString().slice(0, 10),
    autorizadoPor: linha.authorizedBy,
  };
}

/**
 * Todos os visitantes, da data prevista mais próxima para a mais distante (FR-016).
 * No empate, vale a ordem de criação, e por fim o `id`, para a ordem ser sempre estável.
 */
export async function listarVisitantes(): Promise<Visitante[]> {
  const linhas = await prisma.visitor.findMany({
    orderBy: [{ expectedDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  return linhas.map(paraVisitante);
}

/**
 * Grava um visitante já validado e devolve o registro com o `id` gerado pelo banco.
 * A data entra como meia-noite UTC para a coluna `DATE` guardar exatamente o dia informado
 * (research R-007).
 */
export async function criarVisitante(dados: NovoVisitante): Promise<Visitante> {
  const linha = await prisma.visitor.create({
    data: {
      name: dados.nome,
      type: PARA_VISIT_TYPE[dados.tipo],
      expectedDate: new Date(`${dados.dataPrevista}T00:00:00.000Z`),
      authorizedBy: dados.autorizadoPor,
    },
  });
  return paraVisitante(linha);
}

/**
 * Remove o visitante de forma permanente. Remover um `id` que já não existe também é sucesso:
 * a operação é idempotente (FR-012, research R-011).
 */
export async function removerVisitante(id: string): Promise<void> {
  await prisma.visitor.deleteMany({ where: { id } });
}
