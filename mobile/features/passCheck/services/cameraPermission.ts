import { Camera, CameraView } from "expo-camera";
import { Platform } from "react-native";

/**
 * A permissão da câmera, para ler o comprovante de um visitante.
 *
 * **Um dos DOIS arquivos do aplicativo que importam `expo-camera`** — o outro é
 * `components/PassScanner.tsx`, que mostra a câmera (ADR 0020). Perguntar ao aparelho é I/O, e por
 * isso mora em `services/`; o componente não pede permissão nenhuma.
 *
 * Qualquer erro vira `unavailable`: um aparelho ou navegador sem câmera utilizável não deve
 * derrubar a tela, e sim levá-la a dizer isso e apontar para a lista de visitantes.
 */

export type CameraAccess =
  /** Pode ler. */
  | "granted"
  /** Recusada, mas o aparelho ainda deixa perguntar de novo. */
  | "denied"
  /** Recusada de vez: só as configurações do aparelho mudam isso. */
  | "blocked"
  /** Não há câmera que o aplicativo consiga usar. */
  | "unavailable"
  /** Nunca foi perguntado. */
  | "undetermined";

type Response = Awaited<ReturnType<typeof Camera.getCameraPermissionsAsync>>;

function accessOf(response: Response): CameraAccess {
  if (response.granted) {
    return "granted";
  }
  if (response.status === "undetermined") {
    return "undetermined";
  }
  return response.canAskAgain ? "denied" : "blocked";
}

/** No navegador a câmera pode simplesmente não existir; nos aparelhos a pergunta não se aplica. */
async function hasCamera(): Promise<boolean> {
  if (Platform.OS !== "web") {
    return true;
  }
  return CameraView.isAvailableAsync();
}

/** O estado da permissão, SEM perguntar nada à pessoa. */
export async function readCameraAccess(): Promise<CameraAccess> {
  try {
    if (!(await hasCamera())) {
      return "unavailable";
    }
    return accessOf(await Camera.getCameraPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

/** Pergunta à pessoa. Só é chamado com a tela de conferência aberta, nunca antes. */
export async function requestCameraAccess(): Promise<CameraAccess> {
  try {
    if (!(await hasCamera())) {
      return "unavailable";
    }
    return accessOf(await Camera.requestCameraPermissionsAsync());
  } catch {
    return "unavailable";
  }
}
