import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import CondominiumCardList from "@/features/condominiums/components/CondominiumCardList";
import { useCondominiumChoice } from "@/features/condominiums/hooks/useCondominiumChoice";
import HeaderModule from "@/shared/components/HeaderModule";
import { makeStyles } from "@/shared/theme";

/**
 * Tela de escolha de condomínio: apenas composição.
 * Todo o state vem do hook `useCondominiumChoice` (constituição, Princípio I).
 *
 * Aparece em dois momentos com os mesmos cards: depois de entrar, para quem tem dois ou mais
 * condomínios e ainda não escolheu — e aí não há botão de voltar, porque não há para onde —, e a
 * partir da home, para trocar.
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
  })
);

export default function ChooseCondominiumScreen() {
  const styles = useStyles();
  const { state, canDismiss, choose, dismiss, retry, signOut } =
    useCondominiumChoice();

  return (
    <View style={styles.screen}>
      <HeaderModule
        name="Your condominiums"
        onBack={canDismiss ? dismiss : undefined}
      />

      <CondominiumCardList
        state={state}
        onChoose={choose}
        onRetry={retry}
        onSignOut={signOut}
        onCreate={() => router.push("/create-condominium")}
      />
    </View>
  );
}
