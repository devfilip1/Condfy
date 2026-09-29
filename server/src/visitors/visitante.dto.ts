import type { TipoVisita } from "../../generated/prisma/enums.ts";

/**
 * Validação do body de `POST /visitantes`.
 *
 * As regras e as mensagens são as MESMAS de `features/visitors/domain/visitante.ts` no app
 * (`validarNovoVisitante`). App e API são projetos separados, então a regra existe nos dois
 * lugares de propósito (research R-006): ao mudar um, mude o outro.
 */

export interface NovoVisitante {
  nome: string;
  tipo: TipoVisita;
  dataPrevista: string;
  autorizadoPor: string;
}

/** Erros por campo, no mesmo formato que o formulário do app exibe. */
export interface ErrosFormulario {
  nome?: string;
  tipo?: string;
  dataPrevista?: string;
  autorizadoPor?: string;
}

export type ResultadoValidacao =
  | { ok: true; dados: NovoVisitante }
  | { ok: false; erros: ErrosFormulario };

const LIMITE_NOME = 60;
const TIPOS_VISITA: readonly string[] = ["visitante", "entrega", "prestador"];

/** Cópia de `ehDataISOValida` do app (`shared/lib/calendario.ts`): data de calendário real. */
function ehDataISOValida(valor: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) {
    return false;
  }
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1) {
    return false;
  }
  // Dia 0 do mês seguinte é o último dia do mês corrente (em UTC, sem depender do fuso).
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return dia <= ultimoDiaDoMes;
}

function ehTipoVisita(valor: string): valor is TipoVisita {
  return TIPOS_VISITA.includes(valor);
}

/** Campo ausente ou de tipo errado conta como texto vazio. */
function texto(corpo: Record<string, unknown>, campo: string): string {
  const valor = corpo[campo];
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Valida o body recebido como `unknown` (Constituição, Princípio IV).
 * Campos extras e um eventual `id` são ignorados: o id é sempre gerado pelo banco (FR-014).
 */
export function validarNovoVisitante(corpo: unknown): ResultadoValidacao {
  const objeto: Record<string, unknown> =
    typeof corpo === "object" && corpo !== null && !Array.isArray(corpo)
      ? (corpo as Record<string, unknown>)
      : {};

  const nome = texto(objeto, "nome");
  const tipo = texto(objeto, "tipo");
  const dataPrevista = texto(objeto, "dataPrevista");
  const autorizadoPor = texto(objeto, "autorizadoPor");

  const erros: ErrosFormulario = {};

  if (nome.length === 0) {
    erros.nome = "Name is required.";
  } else if (nome.length > LIMITE_NOME) {
    erros.nome = `Name must be at most ${LIMITE_NOME} characters.`;
  }

  if (!ehTipoVisita(tipo)) {
    erros.tipo = "Select a visit type.";
  }

  if (dataPrevista.length === 0) {
    erros.dataPrevista = "Expected date is required.";
  } else if (!ehDataISOValida(dataPrevista)) {
    erros.dataPrevista = "Enter a real date as DD/MM/YYYY.";
  }

  if (autorizadoPor.length === 0) {
    erros.autorizadoPor = "Authorizing resident is required.";
  }

  if (Object.keys(erros).length > 0 || !ehTipoVisita(tipo)) {
    return { ok: false, erros };
  }

  return { ok: true, dados: { nome, tipo, dataPrevista, autorizadoPor } };
}
