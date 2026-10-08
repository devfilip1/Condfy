/**
 * O diretório: os condomínios que existem e as unidades de cada um, como o cadastro os mostra a
 * quem ainda não tem conta (feature 016).
 *
 * Regras puras: esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * Aqui só há prédios e números — nunca pessoas. O servidor não manda quem mora onde, e estas
 * funções não teriam o que fazer com isso.
 */

export interface DirectoryCondominium {
  id: string;
  name: string;
  /** `null` nos condomínios anteriores a ter endereço. */
  address: string | null;
}

export interface DirectoryUnit {
  id: string;
  /** `null` em condomínio sem blocos. */
  block: string | null;
  number: string;
}

/**
 * Ordem natural: "2" antes de "10", "A" antes de "B".
 *
 * O número de uma unidade é TEXTO — também guarda coisas como `101A` —, e o servidor ordena como
 * texto, o que daria `1, 10, 11, …, 2, 20` numa lista que a pessoa percorre com o dedo. A ordem é
 * acertada aqui, onde ela é mostrada.
 */
function natural(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Os blocos de um condomínio, sem repetição, em ordem. Vazio quando ele não tem blocos. */
export function blocksOf(units: readonly DirectoryUnit[]): string[] {
  const blocks = new Set<string>();
  for (const unit of units) {
    if (unit.block !== null) {
      blocks.add(unit.block);
    }
  }
  return [...blocks].sort(natural);
}

/**
 * As unidades de UM bloco, em ordem. Com `block` nulo, as unidades sem bloco — que, num condomínio
 * sem blocos, são todas.
 */
export function unitsOf(
  units: readonly DirectoryUnit[],
  block: string | null
): DirectoryUnit[] {
  return units
    .filter((unit) => unit.block === block)
    .sort((a, b) => natural(a.number, b.number));
}

/**
 * O condomínio como aparece na lista: o nome e, quando há, o endereço. Dois prédios podem ter o
 * mesmo nome; o endereço é o que os distingue.
 */
export function condominiumLabel(condominium: DirectoryCondominium): string {
  return condominium.address === null
    ? condominium.name
    : `${condominium.name} — ${condominium.address}`;
}

/* -------------------------------------------------------------------------- */
/* Type guards: narrowing do JSON que chega da API (Constituição, Princípio IV). */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDirectoryCondominium(value: unknown): value is DirectoryCondominium {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.address === null || typeof value.address === "string")
  );
}

function isDirectoryUnit(value: unknown): value is DirectoryUnit {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    (value.block === null || typeof value.block === "string") &&
    typeof value.number === "string"
  );
}

export function isDirectoryCondominiumList(
  value: unknown
): value is DirectoryCondominium[] {
  return Array.isArray(value) && value.every(isDirectoryCondominium);
}

export function isDirectoryUnitList(value: unknown): value is DirectoryUnit[] {
  return Array.isArray(value) && value.every(isDirectoryUnit);
}
