import { ProfileUnit, Role, unitLabel } from "@/features/auth";

/**
 * O que o card de um condomínio diz sobre o vínculo da pessoa com ele.
 *
 * Esta camada não importa React nem React Native (constituição, Princípio I).
 *
 * As duas funções devolvem `null` quando não há o que dizer, e isso é o ponto delas: "mostrar o
 * cargo só quando não for morador" e "não mostrar linha de unidade para quem não tem unidade" são
 * regras fáceis de implementar pela metade — um rótulo vazio, um traço, um "Resident". Com `null`
 * o componente não tem o que desenhar (FR-011, FR-012).
 */

/**
 * O cargo como a pessoa o lê, ou `null` para morador.
 *
 * Morador é o caso comum e não leva rótulo nenhum; o rótulo existe para avisar que NESTE
 * condomínio ela entra com outro papel. Um cargo novo aparece do mesmo jeito: acrescente a linha.
 */
export function roleLabel(role: Role): string | null {
  switch (role) {
    case "admin":
      return "Administrator";
    // O síndico tem a palavra DELE: são dois cargos, e o card diz qual (FR-027 da 013).
    case "manager":
      return "Manager";
    case "doorman":
      return "Doorman";
    case "resident":
      return null;
  }
}

/**
 * Onde a pessoa mora naquele condomínio: `Unit A-101`, `Units A-101, A-102`, ou `null` para quem
 * tem vínculo sem morar em unidade nenhuma — o administrador e o síndico.
 */
export function unitsLine(units: readonly ProfileUnit[]): string | null {
  if (units.length === 0) {
    return null;
  }
  const labels = units.map(unitLabel).join(", ");
  return units.length === 1 ? `Unit ${labels}` : `Units ${labels}`;
}
