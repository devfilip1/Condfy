import { Octicons } from "@expo/vector-icons";

import { Role } from "@/features/auth";

/** Rotas que os módulos da home abrem. `null` = módulo anunciado mas ainda sem tela. */
export type ModuleRoute =
  | "/visitors"
  | "/reservations"
  | "/newsletter"
  | "/lost-and-found"
  | "/staff"
  | "/pass-check"
  | "/requests"
  | null;

export interface Module {
  icon: React.ComponentProps<typeof Octicons>["name"];
  name: string;
  description: string;
  /**
   * Para onde o card navega. Existe porque antes a lista mandava TODO módulo para `/visitors`,
   * então tocar em Reservas abria Visitantes.
   */
  route: ModuleRoute;
  /**
   * Cargos que enxergam este módulo.
   *
   * A permissão fica declarada aqui, num lugar só, e não em checagens espalhadas pela interface
   * (constituição, Princípio III). Acrescentar um cargo é editar esta lista, não caçar `if`.
   */
  visibleTo: readonly Role[];
  /**
   * Como a home DESENHA o módulo — uma pergunta diferente de quem o vê (`visibleTo`):
   *
   * - `everyday`: um card da grade. O que a pessoa usa no dia a dia.
   * - `administration`: uma linha baixa, de ponta a ponta, abaixo do card do último aviso. É
   *   ferramenta de quem cuida do prédio, e não um quinto módulo do dia a dia.
   *
   * Mora aqui, ao lado de `visibleTo`, para "quais módulos são linhas" ser um dado deste arquivo e
   * não uma lista de nomes dentro de um componente. Um módulo novo declara o seu (feature 017).
   */
  kind: "everyday" | "administration";
}

const ALL_ROLES: readonly Role[] = ["resident", "admin", "manager", "doorman"];

/**
 * Quem lê achados e perdidos: todo mundo menos o porteiro, que perdeu o módulo na feature 015 — o
 * acesso, e não só o card. O servidor responde `403` a ele (`readsLostAndFound`).
 */
const ROLES_READING_LOST_AND_FOUND: readonly Role[] = ["resident", "admin", "manager"];

const modules: Module[] = [
  {
    icon: "key",
    name: "Visitors",
    description: "Manage your visitors",
    route: "/visitors",
    kind: "everyday",
    // O administrador voltou a ver este módulo: ele acompanha as visitas do condomínio inteiro e
    // também libera pessoas, para a unidade que escolher. O que cada cargo VÊ lá dentro é decidido
    // pelo servidor, não por esta lista. O porteiro entrou na feature 015: vê as visitas do
    // condomínio inteiro, sem liberar nem remover nenhuma.
    visibleTo: ALL_ROLES,
  },
  {
    icon: "calendar",
    name: "Reservations",
    description: "Manage your reservations",
    route: "/reservations",
    kind: "everyday",
    // O porteiro também, mas só para consultar: ele vê os locais e se um dia está cheio, e não
    // reserva nada. O que some para ele é decidido dentro do módulo (`canBook`), e quem recusa de
    // verdade é o servidor.
    visibleTo: ALL_ROLES,
  },
  {
    icon: "log",
    name: "Newsletter",
    description: "See news",
    route: "/newsletter",
    kind: "everyday",
    visibleTo: ALL_ROLES,
  },
  {
    icon: "search",
    name: "Lost & Found",
    description: "Find lost items",
    route: "/lost-and-found",
    kind: "everyday",
    visibleTo: ROLES_READING_LOST_AND_FOUND,
  },
  {
    icon: "people",
    name: "Roles",
    description: "Manage who works here",
    route: "/staff",
    kind: "administration",
    // O primeiro módulo de UM cargo só: trazer o administrador e os porteiros é do síndico, e o
    // administrador não vê este card (feature 014). Na tela o módulo se chama "Roles"; no código,
    // `staff`, porque o que as rotas listam e criam são pessoas.
    visibleTo: ["manager"],
  },
  {
    icon: "shield-check",
    name: "Pass check",
    description: "Check a visitor's pass",
    route: "/pass-check",
    // Do dia a dia, e não administração: é a ferramenta de trabalho do porteiro, e fica na grade.
    kind: "everyday",
    // Só do porteiro: o síndico e o administrador, que já veem todas as visitas, NÃO conferem
    // comprovante — decisão do dono do produto (feature 015).
    visibleTo: ["doorman"],
  },
  {
    icon: "person-add",
    name: "Requests",
    description: "Approve new residents",
    route: "/requests",
    kind: "administration",
    // De quem cuida do condomínio: o administrador e o síndico confirmam quem pediu para entrar
    // como morador (feature 016). Na tela o módulo se chama "Requests"; no código, `joinRequests`,
    // porque `request` já é o nome da função HTTP que toda feature importa.
    visibleTo: ["admin", "manager"],
  },
];

/**
 * Os módulos que esta pessoa enxerga, pela UNIÃO dos cargos dela.
 *
 * União, e não um cargo só, para que um módulo concedido por um dos cargos não suma por causa do
 * outro. Os módulos NÃO são de todos os cargos: "Roles" é só do síndico, "Pass check" é só do
 * porteiro, e o porteiro não tem achados e perdidos. Esconder seria pior que mostrar.
 *
 * Sem vínculo nenhum (conta recém-criada), vale a lista de morador: as telas já sabem dizer que a
 * pessoa ainda não está ligada a condomínio algum.
 */
export function modulesForRoles(roles: readonly Role[]): Module[] {
  const effective: readonly Role[] = roles.length > 0 ? roles : ["resident"];
  return modules.filter((modul) =>
    modul.visibleTo.some((role) => effective.includes(role))
  );
}

export default modules;
