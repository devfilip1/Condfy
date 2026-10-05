import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Qual condomínio a pessoa escolheu ver, guardado no aparelho.
 *
 * É uma CONVENIÊNCIA, não uma permissão: o que ela pode ver continua sendo decidido pelo servidor,
 * que confere o vínculo a cada chamada. Por isso o value guardado é tratado como palpite — o hook
 * valida contra os vínculos do perfil antes de usar, e descarta quando não bate mais (FR-021).
 *
 * Usa o mesmo par SecureStore/localStorage de `features/auth/services/storage.ts` em vez de trazer
 * o AsyncStorage: seria uma dependência nova, com mais uma superfície de upgrade do Expo, para
 * guardar uma string que não é grande nem secreta (constituição, Princípio V).
 *
 * Nenhuma falha de armazenamento vira error de tela: sem palpite guardado, a pessoa escolhe de novo.
 */

const STORAGE_KEY = "condfy.reservations.condominium";

const onWeb = Platform.OS === "web";

export async function readSelectedCondominium(): Promise<string | null> {
  try {
    if (onWeb) {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    }
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function writeSelectedCondominium(
  condominiumId: string
): Promise<void> {
  try {
    if (onWeb) {
      globalThis.localStorage?.setItem(STORAGE_KEY, condominiumId);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, condominiumId);
  } catch {
    // Sem armazenamento, a escolha vale só enquanto o aplicativo estiver aberto.
  }
}

/** Nunca lança: apagar o que não existe é sucesso. */
export async function clearSelectedCondominium(): Promise<void> {
  try {
    if (onWeb) {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // Ignorado de propósito.
  }
}
