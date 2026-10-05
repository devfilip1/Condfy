import { StyleSheet, View } from "react-native";

import { useAuth } from "@/features/auth";
import Banner from "@/features/home/components/Banner";
import HeaderHome from "@/features/home/components/HeaderHome";
import ModuleList from "@/features/home/components/ModuleList";
import { modulesForRoles } from "@/features/home/data/modules";

export const styles = StyleSheet.create({
  screen: {
    display: "flex",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
});

export default function HomeScreen() {
  const { profile } = useAuth();

  /**
   * Cargos da pessoa, de todos os condomínios dela. Enquanto o perfil não chega a lista é vazia, e
   * `modulesForRoles` cai na visão de morador — a mais completa. Mostrar e tirar é menos ruim que
   * piscar um módulo que a pessoa não deveria ver.
   */
  const roles =
    profile.status === "ready"
      ? profile.profile.memberships.map((membership) => membership.role)
      : [];

  return (
    <>
      <HeaderHome />
      <View style={styles.screen}>
        <Banner />
        <ModuleList modules={modulesForRoles(roles)} />
      </View>
    </>
  );
}
