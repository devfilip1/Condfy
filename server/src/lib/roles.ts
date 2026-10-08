import type { Role } from "../../generated/prisma/enums.ts";

/**
 * Quem cuida de um condomínio: o administrador ou o síndico.
 *
 * **Este é o ÚNICO lugar que responde a essa pergunta.** Toda regra que até a feature 013 dizia
 * "só o administrador" passou a dizer "o síndico ou o administrador", e eram doze comparações com
 * `"admin"` espalhadas por sete arquivos. Elas chamam esta função agora — nunca compare um cargo com
 * `"admin"` para decidir permissão (ADR 0017).
 *
 * Os dois cargos são mantidos separados de propósito, para poderem divergir: o síndico é quem criou
 * o condomínio, e as próximas telas dele vão trazer coisas que só ele faz. No dia em que uma regra
 * virar só do síndico, ela deixa de chamar esta função e passa a perguntar pelo cargo dele.
 */
export function managesCondominium(role: Role): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Quem AGE num condomínio: libera visitante, remove a visita que liberou, abre o comprovante dela,
 * reserva local. Todo mundo, menos o porteiro.
 *
 * Liberar visita e reservar local são abertos a qualquer vínculo, então precisam perguntar aqui —
 * sem isso o porteiro liberaria visita para qualquer unidade.
 *
 * Desde a feature 015 o porteiro deixou de "só ler", e difere do morador em TRÊS direções ao mesmo
 * tempo: vê mais visitas (`seesEveryVisit`), lê menos (`readsLostAndFound`) e continua sem
 * escrever nada (esta função). Cada direção é uma pergunta com nome, neste arquivo — nunca uma
 * comparação com `"doorman"` espalhada por um service. A única pergunta feita pelo nome do cargo
 * é "só o porteiro confere comprovante", em `passCheck.service.ts`.
 *
 * Um `switch` de propósito: um quinto cargo não compila enquanto alguém não decidir por ele.
 */
export function actsInCondominium(role: Role): boolean {
  switch (role) {
    case "resident":
    case "admin":
    case "manager":
      return true;
    case "doorman":
      return false;
  }
}

/** Os cargos que agem, para filtros de consulta. Tem de acompanhar `actsInCondominium`. */
export const ACTING_ROLES: Role[] = ["resident", "admin", "manager"];

/**
 * Quem vê TODAS as visitas do condomínio, de qualquer unidade e liberadas por qualquer pessoa:
 * quem cuida dele e, desde a feature 015, o porteiro. O morador vê só as que ele mesmo liberou.
 *
 * Ver não é remover, nem receber o código do comprovante — isso é de quem liberou a visita.
 */
export function seesEveryVisit(role: Role): boolean {
  switch (role) {
    case "admin":
    case "manager":
    case "doorman":
      return true;
    case "resident":
      return false;
  }
}

/** Os mesmos cargos de `seesEveryVisit`, para filtros de consulta. */
export const ROLES_SEEING_EVERY_VISIT: Role[] = ["admin", "manager", "doorman"];

/**
 * Quem lê achados e perdidos: todo mundo, menos o porteiro. O dono do produto tirou o módulo dele
 * na feature 015, com o acesso junto — não é só o card que some da home.
 */
export function readsLostAndFound(role: Role): boolean {
  switch (role) {
    case "resident":
    case "admin":
    case "manager":
      return true;
    case "doorman":
      return false;
  }
}

/** Os cargos que cuidam de um condomínio, para filtros de consulta (`role: { in: … }`). */
export const MANAGING_ROLES: Role[] = ["admin", "manager"];
