import { Stack } from "expo-router";

/** Telas públicas: signIn e signUp. Sem cabeçalho, como o restante do aplicativo. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
