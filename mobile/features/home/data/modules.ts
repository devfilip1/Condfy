import { Octicons } from "@expo/vector-icons";

import { Role } from "@/features/auth";

/** Rotas que os módulos da home abrem. `null` = módulo anunciado mas ainda sem tela. */
export type ModuleRoute =
  | "/visitors"
  | "/reservations"
  | "/newsletter"
  | "/lost-and-found"
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
}

const ALL_ROLES: readonly Role[] = ["resident", "admin", "manager"];

const modules: Module[] = [
  {
    icon: "key",
    name: "Visitors",
    description: "Manage your visitors",
    route: "/visitors",
    // O administrador voltou a ver este módulo: ele acompanha as visitas do condomínio inteiro e
    // também libera pessoas, para a unidade que escolher. O que cada cargo VÊ lá dentro é decidido
    // pelo servidor, não por esta lista.
    visibleTo: ALL_ROLES,
  },
  {
    icon: "calendar",
    name: "Reservations",
    description: "Manage your reservations",
    route: "/reservations",
    visibleTo: ALL_ROLES,
  },
  {
    icon: "log",
    name: "Newsletter",
    description: "See news",
    route: "/newsletter",
    visibleTo: ALL_ROLES,
  },
  {
    icon: "search",
    name: "Lost & Found",
    description: "Find lost items",
    route: "/lost-and-found",
    visibleTo: ALL_ROLES,
  },
];

/**
 * Os módulos que esta pessoa enxerga, pela UNIÃO dos cargos dela.
 *
 * União, e não um cargo só, para que um módulo concedido por um dos cargos não suma por causa do
 * outro. Hoje todos os módulos são dos dois cargos, então a união não muda nada — ela fica para o
 * primeiro módulo que voltar a ser de um cargo só. Esconder seria pior que mostrar.
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
