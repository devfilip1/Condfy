import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { AuthProvider, useAuth } from "@/features/auth";
import { AppearanceProvider } from "@/features/settings";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles, useTheme } from "@/shared/theme";

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
 */
function Navegacao() {
  const styles = useStyles();
  const { scheme } = useTheme();
  const { state, condominiumGate } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  const status = state.status;
  const emTelaPublica = segmentos[0] === "(auth)";
  const naEscolha = segmentos[0] === "choose-condominium";

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
    if (deveEscolher) {
      if (!naEscolha) {
        router.replace("/choose-condominium");
      }
      return;
    }
    if (emTelaPublica) {
      router.replace("/");
    }
  }, [status, condominiumGate, deveEscolher, emTelaPublica, naEscolha, router]);

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
   * Falta escolher e a rota atual ainda não é a de escolha: o redirecionamento do efeito acima
   * acontece logo depois deste render. Nesse intervalo o navegador PRECISA estar montado — não dá
   * para navegar sem ele —, então a rota existe, mas coberta: nada dela chega a ser visto.
   */
  const cobrir = deveEscolher && !naEscolha;

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
