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

/** Os cargos que cuidam de um condomínio, para filtros de consulta (`role: { in: … }`). */
export const MANAGING_ROLES: Role[] = ["admin", "manager"];
