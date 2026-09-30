import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/features/auth";
import LoadingState from "@/shared/components/LoadingState";

/**
 * Decide o que a pessoa vê conforme o state da sessão.
 *
 * Enquanto está `carregando` não renderiza rota nem redireciona: é o que evita a tela de input
 * piscar para quem já tem sessão guardada (research R-011).
 */
function Navegacao() {
  const { state } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  const status = state.status;
  const emTelaPublica = segmentos[0] === "(auth)";

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "anonymous" && !emTelaPublica) {
      router.replace("/sign-in");
    } else if (status === "authenticated" && emTelaPublica) {
      router.replace("/");
    }
  }, [status, emTelaPublica, router]);

  if (status === "loading") {
    return <LoadingState />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Navegacao />
    </AuthProvider>
  );
}
