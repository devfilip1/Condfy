import { router } from "expo-router";
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
  const { currentMembership, canSwitchCondominium } = useAuth();

  /**
   * O cargo da pessoa NO CONDOMÍNIO EM QUE ELA ESTÁ. Até a feature 009 isto era a união dos cargos
   * de todos os condomínios dela, porque não existia um "atual" para ler; com a escolha, mostrar
   * num prédio um módulo que só o cargo dela em outro permite seria a confusão que a escolha veio
   * tirar.
   *
   * Sem condomínio atual a lista é vazia, e `modulesForRoles` cai na visão de morador.
   */
  const roles = currentMembership ? [currentMembership.role] : [];

  return (
    <>
      <HeaderHome />
      <View style={styles.screen}>
        {/*
          Trocar só é oferecido a quem tem para o que trocar. Para quem tem um condomínio só — quase
          todo mundo — o banner não ganha botão nenhum (FR-025).
        */}
        <Banner
          condominium={currentMembership?.condominium ?? null}
          onSwitch={
            canSwitchCondominium
              ? () => router.push("/choose-condominium")
              : undefined
          }
        />
        <ModuleList modules={modulesForRoles(roles)} />
      </View>
    </>
  );
}
