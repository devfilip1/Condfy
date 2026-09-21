/**
 * Entidade de domínio Visitante e suas regras puras.
 *
 * Esta camada não importa React nem React Native.
 */

import { ehDataISOValida } from "@/shared/lib/calendario";

export type TipoVisita = "visitante" | "entrega" | "prestador";

export const TIPOS_VISITA: readonly TipoVisita[] = [
  "visitante",
  "entrega",
  "prestador",
];

export interface Visitante {
  id: string;
  nome: string;
  tipo: TipoVisita;
  /** Dia previsto da visita no formato ISO `YYYY-MM-DD`, sem horário. */
  dataPrevista: string;
  autorizadoPor: string;
}

export type NovoVisitante = Omit<Visitante, "id">;

export interface ErrosFormulario {
  nome?: string;
  tipo?: string;
  dataPrevista?: string;
  autorizadoPor?: string;
}

export const LIMITE_NOME = 60;

/**
 * Ordena pela data prevista, da mais próxima para a mais distante (FR-017).
 * Estável em caso de empate e sem alterar o array recebido.
 */
export function ordenarPorDataPrevista(lista: Visitante[]): Visitante[] {
  return lista
    .map((visitante, indice) => ({ visitante, indice }))
    .sort((a, b) => {
      if (a.visitante.dataPrevista === b.visitante.dataPrevista) {
        return a.indice - b.indice;
      }
      return a.visitante.dataPrevista < b.visitante.dataPrevista ? -1 : 1;
    })
    .map((item) => item.visitante);
}

/**
 * Aplica as regras V-01 a V-06 do data-model e devolve os erros por campo.
 * Objeto vazio significa entrada válida.
 */
export function validarNovoVisitante(entrada: NovoVisitante): ErrosFormulario {
  const erros: ErrosFormulario = {};

  const nome = entrada.nome.trim();
  if (nome.length === 0) {
    erros.nome = "Name is required.";
  } else if (nome.length > LIMITE_NOME) {
    erros.nome = `Name must be at most ${LIMITE_NOME} characters.`;
  }

  if (!TIPOS_VISITA.includes(entrada.tipo)) {
    erros.tipo = "Select a visit type.";
  }

  const dataPrevista = entrada.dataPrevista.trim();
  if (dataPrevista.length === 0) {
    erros.dataPrevista = "Expected date is required.";
  } else if (!ehDataISOValida(dataPrevista)) {
    erros.dataPrevista = "Enter a real date as DD/MM/YYYY.";
  }

  if (entrada.autorizadoPor.trim().length === 0) {
    erros.autorizadoPor = "Authorizing resident is required.";
  }

  return erros;
}

/** `true` quando a validação não encontrou nenhum erro. */
export function entradaEhValida(erros: ErrosFormulario): boolean {
  return Object.keys(erros).length === 0;
}
