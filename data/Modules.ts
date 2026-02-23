import { Octicons } from "@expo/vector-icons";

export interface Module {
  icon: React.ComponentProps<typeof Octicons>["name"];
  name: string;
  description: string;
}

const modules: Module[] = [
  {
    icon: "key",
    name: "Visitors",
    description: "Manage your visitors",
  },
  {
    icon: "calendar",
    name: "Reservations",
    description: "Manage your reservations",
  },
  {
    icon: "log",
    name: "Newsletter",
    description: "See news",
  },
  {
    icon: "search",
    name: "Lost & Found",
    description: "Find lost items",
  },
];

export default modules;
