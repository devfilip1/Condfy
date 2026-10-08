import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "@/features/auth";
import Banner from "@/features/home/components/Banner";
import HeaderHome from "@/features/home/components/HeaderHome";
import NoCondominiumCard from "@/features/home/components/NoCondominiumCard";
import ModuleList from "@/features/home/components/ModuleList";
import ModuleRow from "@/features/home/components/ModuleRow";
import { modulesForRoles } from "@/features/home/data/modules";
import { LatestNoticeCard, useLatestNotice } from "@/features/newsletter";

/**
 * A home: apenas composição.
 *
 * A ordem, de cima para baixo, desde a feature 017:
 *
 * 1. o cabeçalho e o banner do condomínio;
 * 2. a GRADE, com os módulos do dia a dia;
 * 3. o CARD DO ÚLTIMO AVISO — o que o condomínio disse por último, sem a pessoa abrir nada;
 * 4. as LINHAS dos módulos de administração.
 *
 * O que não existe não deixa buraco: sem aviso, as linhas vêm logo depois da grade.
 *
 * A tela ROLA inteira. Com a grade, o card e até duas linhas, a home de um síndico não cabe numa
 * tela pequena. E não há mais nada flutuando no rodapé: a barra de baixo, com Home e Sign out,
 * deixou de existir, e sair mora em Configurações.
 */

export const styles = StyleSheet.create({
  screen: {
    paddingTop: 20,
    paddingHorizontal: 20,
    // Respiro no fim da rolagem, para a última linha não encostar na borda da tela.
    paddingBottom: 40,
  },
  rows: {
    marginTop: 20,
    gap: 12,
  },
});

export default function HomeScreen() {
  const { profile, currentMembership, canSwitchCondominium } = useAuth();
  // `null` sem condomínio, sem aviso nenhum, ou se a busca falhou: nos três casos não há card.
  const latestNotice = useLatestNotice();

  /**
   * A conta não pertence a condomínio nenhum — é o caso de quem acabou de se cadastrar. Só é
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
   */
  const roles = currentMembership ? [currentMembership.role] : [];

  // QUEM vê cada módulo continua sendo de `modulesForRoles`; aqui só se separa COMO cada um é
  // desenhado, pelo `kind` que o próprio módulo declara.
  const modules = modulesForRoles(roles);
  const everyday = modules.filter((modul) => modul.kind === "everyday");
  const administration = modules.filter(
    (modul) => modul.kind === "administration"
  );

  return (
    <>
      <HeaderHome />
      <ScrollView contentContainerStyle={styles.screen}>
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

        <ModuleList modules={everyday} />

        {/*
          O card pertence à feature de newsletter — é feito do tipo e da regra de prévia do mural — e
          a home só o compõe. Tocar abre o aviso inteiro, na mesma tela a que o módulo leva.
        */}
        {latestNotice ? (
          <LatestNoticeCard
            notice={latestNotice}
            onPress={(notice) =>
              router.push({
                pathname: "/newsletter/[id]",
                params: { id: notice.id },
              })
            }
          />
        ) : null}

        {/* Sempre ABAIXO do card do aviso. Sem linha nenhuma, nem o espaço delas existe. */}
        {administration.length > 0 ? (
          <View style={styles.rows}>
            {administration.map((modul) => (
              <ModuleRow key={modul.name} modul={modul} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
