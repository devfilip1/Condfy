import { Octicons } from "@expo/vector-icons";

import { Role } from "@/features/auth";

/** Rotas que os módulos da home abrem. `null` = módulo anunciado mas ainda sem tela. */
export type ModuleRoute = "/visitors" | "/reservations" | "/newsletter" | null;

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

const ALL_ROLES: readonly Role[] = ["resident", "admin"];

const modules: Module[] = [
  {
    icon: "key",
    name: "Visitors",
    description: "Manage your visitors",
    route: "/visitors",
    // Receber visita é coisa de quem mora. Quem administra não tem unidade e não recebe ninguém.
    visibleTo: ["resident"],
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
    route: null,
    visibleTo: ALL_ROLES,
  },
];

/**
 * Os módulos que esta pessoa enxerga, pela UNIÃO dos cargos dela.
 *
 * União, e não um cargo só, porque a home não tem contexto de condomínio: quem for moradora num
 * prédio e administradora em outro precisa do módulo de visitantes, que só o cargo de moradora
 * concede. Esconder seria pior que mostrar.
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
