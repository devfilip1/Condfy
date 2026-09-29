/**
 * Datas de calendário no formato ISO `YYYY-MM-DD`: validação, conversão para exibição
 * e a grade mensal usada pelo seletor de data.
 *
 * Funções puras, sem React: não pertencem a nenhuma feature e podem ser usadas por todas.
 */

/** Verifica se o texto é uma data de calendário real no formato `YYYY-MM-DD`. */
export function ehDataISOValida(valor: string): boolean {
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

  // Dia 0 do mês seguinte é o último dia do mês corrente.
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  return dia <= ultimoDiaDoMes;
}

/**
 * Converte a data digitada (`DD/MM/AAAA`) para o formato ISO usado pela entidade.
 * Quando o texto não tem o formato esperado, devolve o próprio texto sem espaços das pontas,
 * para que a validação distinga "campo vazio" de "data inválida".
 */
export function paraDataISO(textoDigitado: string): string {
  const texto = textoDigitado.trim();
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) {
    return texto;
  }
  return `${partes[3]}-${partes[2]}-${partes[1]}`;
}

/** Converte a data da entidade (`YYYY-MM-DD`) para exibição (`DD/MM/AAAA`). */
export function paraDataExibicao(dataISO: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO);
  if (!partes) {
    return dataISO;
  }
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/* -------------------------------------------------------------------------- */
/* Calendário: regras puras usadas pelo seletor de data prevista.              */
/* Todo cálculo usa o fuso local do aparelho; nenhuma conversão UTC é feita,   */
/* porque a data prevista é um dia de calendário, não um instante no tempo.    */
/* -------------------------------------------------------------------------- */

/** Rótulos dos meses, na ordem de `Date.getMonth()` (janeiro = índice 0). */
export const NOMES_MESES: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Iniciais dos dias da semana, começando no domingo (`Date.getDay()` = 0). */
export const INICIAIS_DIAS_SEMANA: readonly string[] = [
  "S",
  "M",
  "T",
  "W",
  "T",
  "F",
  "S",
];

/** Mês de calendário identificado por ano e mês 1-12 (não 0-11). */
export interface MesCalendario {
  ano: number;
  /** 1 = janeiro, 12 = dezembro. */
  mes: number;
}

function comDoisDigitos(valor: number): string {
  return valor < 10 ? `0${valor}` : String(valor);
}

/** Monta `YYYY-MM-DD` a partir de ano, mês (1-12) e dia. */
export function montarDataISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${comDoisDigitos(mes)}-${comDoisDigitos(dia)}`;
}

/** Data de hoje no fuso do aparelho, em `YYYY-MM-DD`. */
export function dataISODeHoje(): string {
  const agora = new Date();
  return montarDataISO(
    agora.getFullYear(),
    agora.getMonth() + 1,
    agora.getDate()
  );
}

/**
 * Soma dias a uma data ISO e devolve outra data ISO.
 * Datas inválidas voltam inalteradas, para não inventar valor sobre entrada ruim.
 */
export function somarDias(dataISO: string, dias: number): string {
  if (!ehDataISOValida(dataISO)) {
    return dataISO;
  }

  const data = new Date(
    Number(dataISO.slice(0, 4)),
    Number(dataISO.slice(5, 7)) - 1,
    Number(dataISO.slice(8, 10)) + dias
  );
  return montarDataISO(data.getFullYear(), data.getMonth() + 1, data.getDate());
}

/** Mês a que pertence a data ISO, ou `null` quando o texto não é uma data válida. */
export function mesDaDataISO(dataISO: string): MesCalendario | null {
  if (!ehDataISOValida(dataISO)) {
    return null;
  }
  return { ano: Number(dataISO.slice(0, 4)), mes: Number(dataISO.slice(5, 7)) };
}

/** Mês exibido quando o formulário abre: o da data escolhida ou o mês corrente. */
export function mesInicialDoCalendario(dataISO: string): MesCalendario {
  return mesDaDataISO(dataISO) ?? mesDaDataISO(dataISODeHoje())!;
}

/** Avança (`+1`) ou retrocede (`-1`) meses, virando o ano quando necessário. */
export function deslocarMes(
  mesAtual: MesCalendario,
  deslocamento: number
): MesCalendario {
  const referencia = new Date(mesAtual.ano, mesAtual.mes - 1 + deslocamento, 1);
  return { ano: referencia.getFullYear(), mes: referencia.getMonth() + 1 };
}

/** Título do cabeçalho do calendário, por exemplo `August 2026`. */
export function rotuloDoMes(mesAtual: MesCalendario): string {
  return `${NOMES_MESES[mesAtual.mes - 1]} ${mesAtual.ano}`;
}

/**
 * Grade do mês em semanas de 7 posições, começando no domingo.
 * Posições fora do mês recebem `null`, para que a View apenas renderize.
 */
export function montarGradeDoMes(mesAtual: MesCalendario): (number | null)[][] {
  const primeiroDiaDaSemana = new Date(
    mesAtual.ano,
    mesAtual.mes - 1,
    1
  ).getDay();
  const totalDeDias = new Date(mesAtual.ano, mesAtual.mes, 0).getDate();

  const celulas: (number | null)[] = [];
  for (let vazia = 0; vazia < primeiroDiaDaSemana; vazia += 1) {
    celulas.push(null);
  }
  for (let dia = 1; dia <= totalDeDias; dia += 1) {
    celulas.push(dia);
  }
  while (celulas.length % 7 !== 0) {
    celulas.push(null);
  }

  const semanas: (number | null)[][] = [];
  for (let inicio = 0; inicio < celulas.length; inicio += 7) {
    semanas.push(celulas.slice(inicio, inicio + 7));
  }
  return semanas;
}
