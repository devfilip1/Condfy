import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useAuth } from "@/features/auth";
import Banner from "@/features/home/components/Banner";
import HeaderHome from "@/features/home/components/HeaderHome";
import NoCondominiumCard from "@/features/home/components/NoCondominiumCard";
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
  const { profile, currentMembership, canSwitchCondominium } = useAuth();

  /**
   * A conta não pertence a condomínio nenhum: é o caso de quem acabou de se cadastrar. Só é
   * verdade com o perfil CARREGADO — enquanto ele não chega, "sem vínculo" ainda não se sabe, e
   * oferecer criar um condomínio a quem já tem um seria errado.
   */
  const hasNoCondominium =
    profile.status === "ready" && profile.profile.memberships.length === 0;

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
        {/*
          Um botão, e não um redirecionamento: quem só quer morar num condomínio não é empurrado
          para um formulário, e a oferta continua aqui pelo tempo que a conta ficar sem vínculo
          (FR-001, FR-004 da 013).
        */}
        {hasNoCondominium ? (
          <NoCondominiumCard
            onCreate={() => router.push("/create-condominium")}
          />
        ) : null}
        <ModuleList modules={modulesForRoles(roles)} />
      </View>
    </>
  );
}
