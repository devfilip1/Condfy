import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { AuthProvider, useAuth } from "@/features/auth";
import { AppearanceProvider } from "@/features/settings";
import LoadingState from "@/shared/components/LoadingState";
import { fontFiles, makeStyles, useTheme } from "@/shared/theme";

// A tela de abertura fica até a letra carregar: sem isto o primeiro quadro sairia na letra do
// sistema e trocaria de letra na frente da pessoa.
SplashScreen.preventAutoHideAsync();

/**
 * Decide o que a pessoa vê conforme o state da sessão — e, desde a feature 009, conforme ela já
 * saiba em qual condomínio está.
 *
 * Enquanto está `carregando` não renderiza rota nem redireciona: é o que evita a tela de input
 * piscar para quem já tem sessão guardada (research R-011).
 *
 * O bloqueio do condomínio mora AQUI, e não em cada tela, porque este é o único lugar por onde toda
 * rota passa. Uma checagem dentro da home cobriria a navegação e deixaria passar um link direto
 * para `/reservations` (FR-004).
 *
 * Desde a feature 014 há um segundo bloqueio, que vem ANTES do condomínio: a conta criada pelo
 * síndico só alcança a tela de escolher a própria password, até escolher. Mora aqui pelo mesmo
 * motivo. É cortesia de tela — o servidor recusa todas as outras rotas a essa conta de qualquer
 * jeito (ADR 0018).
 *
 * E desde a feature 016 há um terceiro, entre os dois: quem se cadastrou e espera a aprovação de
 * quem cuida do condomínio só alcança a tela de espera. A ordem é: password provisória, pedido
 * pendente, escolha de condomínio. Os três têm a mesma forma — e o mesmo jeito de trancar todo
 * mundo, se a condição for invertida.
 */
function Navegacao() {
  const styles = useStyles();
  const { scheme } = useTheme();
  const { state, condominiumGate, mustChoosePassword, pendingRequest } =
    useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  const status = state.status;
  const emTelaPublica = segmentos[0] === "(auth)";
  /**
   * Só a tela de escolha. Até a regra de "um condomínio por síndico" a de criar também contava,
   * porque a tela de escolha tinha um botão para ela; quem chega à escolha pertence a dois ou mais
   * condomínios, e quem pertence a algum não cria outro — então o botão saiu, e a rota com ele.
   */
  const naEscolha = segmentos[0] === "choose-condominium";

  const naPrimeiraPassword = segmentos[0] === "first-password";

  /** A password ainda é a que o síndico definiu: só a tela de escolher a própria serve. */
  const deveTrocarPassword = status === "authenticated" && mustChoosePassword;

  const naEspera = segmentos[0] === "awaiting-approval";

  /** O pedido de entrada ainda não foi respondido: só a tela de espera serve. */
  const deveEsperar = status === "authenticated" && pendingRequest !== null;

  /** Falta escolher, ou o perfil nem carregou para saber se falta: só a tela de escolha serve. */
  const deveEscolher =
    status === "authenticated" &&
    (condominiumGate === "choose" || condominiumGate === "failed");

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "anonymous") {
      if (!emTelaPublica) {
        router.replace("/sign-in");
      }
      return;
    }
    // Autenticado. Enquanto o bloqueio resolve não há para onde mandar ninguém.
    if (condominiumGate === "resolving") {
      return;
    }
    // Antes do condomínio: com a password provisória não há condomínio a escolher ainda.
    if (deveTrocarPassword) {
      if (!naPrimeiraPassword) {
        router.replace("/first-password");
      }
      return;
    }
    // A password foi escolhida — ou nunca foi provisória, e alguém digitou o endereço na mão.
    if (naPrimeiraPassword) {
      router.replace("/");
      return;
    }
    // Depois da password e antes do condomínio: quem espera não tem condomínio a escolher.
    if (deveEsperar) {
      if (!naEspera) {
        router.replace("/awaiting-approval");
      }
      return;
    }
    // O pedido foi aprovado — ou nunca houve um, e alguém digitou o endereço na mão.
    if (naEspera) {
      router.replace("/");
      return;
    }
    if (deveEscolher) {
      if (!naEscolha) {
        router.replace("/choose-condominium");
      }
      return;
    }
    if (emTelaPublica) {
      router.replace("/");
    }
  }, [
    status,
    condominiumGate,
    deveTrocarPassword,
    naPrimeiraPassword,
    deveEsperar,
    naEspera,
    deveEscolher,
    emTelaPublica,
    naEscolha,
    router,
  ]);

  // Os ícones da barra do sistema no contrário do fundo: claros na aparência escura.
  const barra = <StatusBar style={scheme === "dark" ? "light" : "dark"} />;

  if (status === "loading") {
    return (
      <View style={styles.raiz}>
        {barra}
        <LoadingState />
      </View>
    );
  }

  /**
   * NENHUMA rota é desenhada enquanto não se sabe em qual condomínio a pessoa está.
   *
   * Até a feature 009 a home aparecia enquanto o perfil carregava. Com a escolha, isso mostraria a
   * home — por um instante — a quem está prestes a ser perguntado.
   */
  if (status === "authenticated" && condominiumGate === "resolving") {
    return (
      <View style={styles.raiz}>
        {barra}
        <LoadingState />
      </View>
    );
  }

  /**
   * Falta escolher — o condomínio ou a password — e a rota atual ainda não é a que serve: o redirecionamento do efeito acima
   * acontece logo depois deste render. Nesse intervalo o navegador PRECISA estar montado — não dá
   * para navegar sem ele —, então a rota existe, mas coberta: nada dela chega a ser visto.
   */
  const cobrir =
    (deveTrocarPassword && !naPrimeiraPassword) ||
    (!deveTrocarPassword && deveEsperar && !naEspera) ||
    (!deveTrocarPassword && !deveEsperar && deveEscolher && !naEscolha);

  return (
    <View style={styles.raiz}>
      {barra}
      {/*
        O fundo de TODA tela vem daqui. Uma tela que não pinta o próprio fundo — a home, por
        exemplo — ficaria branca na aparência escura, com texto claro em cima.
      */}
      <Stack
        screenOptions={{ headerShown: false, contentStyle: styles.conteudo }}
      />
      {cobrir ? (
        <View style={styles.cobertura}>
          <LoadingState />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    raiz: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    conteudo: {
      backgroundColor: colors.screenBackground,
    },
    cobertura: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.screenBackground,
    },
  })
);

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts(fontFiles);
  // Um erro também encerra a espera: o aplicativo abre na letra do sistema, em vez de ficar preso
  // na tela de abertura por causa de um arquivo de fonte.
  const fontsSettled = fontsLoaded || fontsError !== null;

  useEffect(() => {
    if (fontsSettled) {
      SplashScreen.hideAsync();
    }
  }, [fontsSettled]);

  if (!fontsSettled) {
    return null;
  }

  return (
    // A aparência fica POR FORA da sessão: a tela de entrar também tem tema, e a escolha é do
    // aparelho, não de quem entrou (feature 010, FR-029).
    <AppearanceProvider>
      <AuthProvider>
        <Navegacao />
      </AuthProvider>
    </AppearanceProvider>
  );
}
