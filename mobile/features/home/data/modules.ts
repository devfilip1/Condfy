import { Octicons } from "@expo/vector-icons";

/** Rotas que os módulos da home abrem. `null` = módulo anunciado mas ainda sem tela. */
export type ModuleRoute = "/visitors" | "/reservations" | null;

export interface Module {
  icon: React.ComponentProps<typeof Octicons>["name"];
  name: string;
  description: string;
  /**
   * Para onde o card navega. Existe porque antes a lista mandava TODO módulo para `/visitors`,
   * então tocar em Reservas abria Visitantes.
   */
  route: ModuleRoute;
}

const modules: Module[] = [
  {
    icon: "key",
    name: "Visitors",
    description: "Manage your visitors",
    route: "/visitors",
  },
  {
    icon: "calendar",
    name: "Reservations",
    description: "Manage your reservations",
    route: "/reservations",
  },
  {
    icon: "log",
    name: "Newsletter",
    description: "See news",
    route: null,
  },
  {
    icon: "search",
    name: "Lost & Found",
    description: "Find lost items",
    route: null,
  },
];

export default modules;
