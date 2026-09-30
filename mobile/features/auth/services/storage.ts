import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  Credentials,
  isCredentials,
} from "@/features/auth/domain/session";

/**
 * Onde as credentials da sessão ficam stored no aparelho (research R-009).
 *
 * Android e iOS usam `expo-secure-store` (Keystore e Keychain), inacessível a outros
 * aplicativos, como exige o FR-035. No navegador não existe equivalente: fica `localStorage`,
 * legível por qualquer script da mesma origem — garantia mais fraca, aceita porque o alvo web é
 * ambiente de desenvolvimento e verificação.
 *
 * Nenhuma falha de leitura vira error de tela: sem credencial guardada, a pessoa apenas entra de
 * novo.
 */

const STORAGE_KEY = "condfy.credentials";

const onWeb = Platform.OS === "web";

async function ler(): Promise<string | null> {
  if (onWeb) {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function gravar(value: string): Promise<void> {
  if (onWeb) {
    globalThis.localStorage?.setItem(STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

async function apagar(): Promise<void> {
  if (onWeb) {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/** Credentials stored, ou `null` quando não há sessão ou o conteúdo está corrompido. */
export async function readCredentials(): Promise<Credentials | null> {
  try {
    const text = await ler();
    if (!text) {
      return null;
    }
    const value: unknown = JSON.parse(text);
    return isCredentials(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writeCredentials(credentials: Credentials): Promise<void> {
  try {
    await gravar(JSON.stringify(credentials));
  } catch {
    // Sem armazenamento, a sessão vale só enquanto o aplicativo estiver aberto.
  }
}

/** Nunca lança: apagar o que não existe é sucesso (FR-017a). */
export async function clearCredentials(): Promise<void> {
  try {
    await apagar();
  } catch {
    // Ignorado de propósito.
  }
}
