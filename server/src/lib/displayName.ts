import type { Role } from "../../generated/prisma/enums.ts";

/**
 * O nome com que uma pessoa aparece PARA OS OUTROS dentro de um condomínio.
 *
 * Quem administra um condomínio aparece nele como "Administrator", e não com o nome pessoal: quem
 * liberou uma visita ou publicou um aviso, nesse caso, foi o cargo falando. No condomínio onde a
 * mesma pessoa é só moradora, ela aparece com o próprio nome — o cargo é por condomínio, então o
 * nome exibido também é.
 *
 * Vale o cargo DE AGORA, não o da época do registro: um aviso publicado por quem deixou de ser
 * administrador passa a mostrar o nome da pessoa.
 *
 * O perfil da própria pessoa (`GET /me`) NÃO passa por aqui: lá o nome é dado da conta dela, que
 * ela precisa ver como é. O app troca o que mostra no cabeçalho por conta própria.
 */
export const ADMINISTRATOR_DISPLAY_NAME = "Administrator";

/**
 * O síndico aparece pelo cargo, do mesmo jeito (feature 013). "Manager" é a palavra em inglês que o
 * cargo tinha antes de sair, na feature 007; é uma suposição da spec, e mora só aqui e no
 * cabeçalho da home do app.
 */
export const MANAGER_DISPLAY_NAME = "Manager";

/**
 * `role` é `null` quando a pessoa NÃO pertence mais ao condomínio — o autor de um aviso que foi
 * removido pelo síndico (feature 014). Ela aparece com o próprio nome, que é o que já acontecia com
 * quem deixou de ser administrador e ficou.
 */
export function displayNameOf(member: { role: Role | null; name: string }): string {
  // Um `switch` e não a função de `roles.ts`, de propósito: aqui os dois cargos NÃO são a mesma
  // coisa — cada um tem a sua palavra.
  switch (member.role) {
    case "admin":
      return ADMINISTRATOR_DISPLAY_NAME;
    case "manager":
      return MANAGER_DISPLAY_NAME;
    // O porteiro aparece com o próprio nome: não publica nada que o morador leia como "o cargo
    // falando".
    case "doorman":
    case "resident":
    case null:
      return member.name;
  }
}
