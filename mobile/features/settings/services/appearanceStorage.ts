import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * A aparência que a pessoa escolheu — clara ou escura —, guardada no aparelho.
 *
 * É do APARELHO, não da conta: vale na tela de entrar, antes de existir sessão, e por isso
 * **não existe função para apagar aqui e nada a apaga ao sair** (FR-026, FR-029). É o contrário do
 * condomínio escolhido, que é esquecido a cada saída — de propósito nos dois casos.
 *
 * Usa o mesmo par SecureStore/localStorage dos outros valores guardados do aplicativo. Nenhuma
 * falha de armazenamento vira erro de tela: sem valor guardado, o aplicativo segue o aparelho.
 */

export type StoredAppearance = "light" | "dark";

const STORAGE_KEY = "condfy.appearance";

const onWeb = Platform.OS === "web";

/** A aparência escolhida, ou `null` se a pessoa nunca escolheu. */
export async function readAppearance(): Promise<StoredAppearance | null> {
  try {
    const stored = onWeb
      ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null)
      : await SecureStore.getItemAsync(STORAGE_KEY);
    // Qualquer coisa que não seja um dos dois valores é tratada como "nunca escolheu".
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export async function writeAppearance(scheme: StoredAppearance): Promise<void> {
  try {
    if (onWeb) {
      globalThis.localStorage?.setItem(STORAGE_KEY, scheme);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, scheme);
  } catch {
    // Sem armazenamento, a escolha vale só enquanto o aplicativo estiver aberto.
  }
}
