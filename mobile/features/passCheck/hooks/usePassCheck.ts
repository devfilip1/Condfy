import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

import { HttpError, useAuth } from "@/features/auth";
import {
  NOT_RECOGNISED,
  PassCheck,
} from "@/features/passCheck/domain/passCheck";
import {
  CameraAccess,
  readCameraAccess,
  requestCameraAccess,
} from "@/features/passCheck/services/cameraPermission";
import { checkPass } from "@/features/passCheck/services/passCheckService";
import { passCodeOf } from "@/features/visitors";

/**
 * Estado da conferência de comprovante: a permissão da câmera e a máquina de estados da leitura.
 *
 * Concentra estado e orquestração; não devolve JSX e não importa componente visual (constituição,
 * Princípio I).
 *
 * A leitura anda assim, e só assim:
 *
 *     scanning ──lê um QR──► checking ──► answered ──┐
 *         ▲                      └──────► failed ────┤
 *         └──────────── "Check another pass" ◄───────┘
 *
 * `failed` NÃO é uma das quatro respostas e nunca pode parecer com uma: é "não deu para conferir".
 */

export const MESSAGE_CHECK_FAILED =
  "Couldn't check this pass. Check your connection and try again.";
export const MESSAGE_NOT_ALLOWED = "Only a doorman can check a pass.";

/** `asking` é o instante entre abrir a tela e saber se a câmera pode ser usada. */
export type CameraState = "asking" | "granted" | "denied" | "blocked" | "unavailable";

export type Phase =
  | { status: "scanning" }
  | { status: "checking" }
  | { status: "answered"; check: PassCheck }
  | { status: "failed"; message: string };

export interface UsePassCheckResult {
  /**
   * `true` só para o porteiro DO CONDOMÍNIO EM TELA. Compara com `"doorman"` de propósito: conferir
   * comprovante é só dele — o síndico e o administrador não conferem.
   *
   * Cortesia de interface. Quem recusa de verdade é a API.
   */
  canCheck: boolean;
  camera: CameraState;
  /** Pergunta de novo, quando o aparelho ainda deixa. */
  askCamera: () => void;
  /** Abre as configurações do aparelho. `null` onde isso não existe — o navegador. */
  openSettings: (() => void) | null;
  phase: Phase;
  /** O que a câmera leu. Ignorado fora de `scanning`. */
  onScanned: (text: string) => void;
  /** Volta a ler; a resposta anterior some. */
  scanAgain: () => void;
}

function toCameraState(access: CameraAccess): CameraState {
  // `undetermined` só existe entre ler e perguntar; para a tela, ainda é "perguntando".
  return access === "undetermined" ? "asking" : access;
}

export function usePassCheck(): UsePassCheckResult {
  const { selectedCondominiumId, currentMembership } = useAuth();
  const [camera, setCamera] = useState<CameraState>("asking");
  const [phase, setPhase] = useState<Phase>({ status: "scanning" });
  /**
   * A trava da leitura. A câmera avisa o mesmo QR muitas vezes por segundo, e o state só muda no
   * render seguinte: sem um ref, um comprovante viraria dez pedidos — e, como o primeiro "válido"
   * grava a entrada, dez pedidos disputando isso (research R-009).
   */
  const busy = useRef(false);
  /** O número da conferência em curso. Uma resposta que não é da última é descartada. */
  const sequence = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const canCheck = currentMembership?.role === "doorman";

  // A câmera é pedida AO ABRIR esta tela, e nunca antes (FR-023): lê o estado e, se a pessoa nunca
  // foi perguntada, pergunta. Quem não é porteiro não é perguntado de nada.
  useEffect(() => {
    if (!canCheck) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const current = await readCameraAccess();
      const settled =
        current === "undetermined" ? await requestCameraAccess() : current;
      if (!cancelled && mounted.current) {
        setCamera(toCameraState(settled));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canCheck]);

  // Voltou das configurações do aparelho: a permissão pode ter mudado lá. Reler aqui é o que deixa
  // a pessoa liberar a câmera e conferir em seguida, sem sair do aplicativo nem entrar de novo.
  useEffect(() => {
    if (!canCheck) {
      return;
    }
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") {
        return;
      }
      void readCameraAccess().then((access) => {
        // Só o que já foi decidido: perguntar de novo é escolha da pessoa, pelo botão.
        if (mounted.current && access !== "undetermined") {
          setCamera(toCameraState(access));
        }
      });
    });
    return () => subscription.remove();
  }, [canCheck]);

  const askCamera = useCallback(() => {
    void requestCameraAccess().then((access) => {
      if (mounted.current) {
        setCamera(toCameraState(access));
      }
    });
  }, []);

  const openSettings =
    Platform.OS === "web" ? null : () => void Linking.openSettings();

  const onScanned = useCallback(
    (text: string) => {
      if (busy.current || selectedCondominiumId === null) {
        return;
      }
      busy.current = true;
      const current = ++sequence.current;

      // O que não é um comprovante do Condfy é respondido AQUI, sem pedido nenhum: o texto não é
      // enviado, não é aberto e não é mostrado (FR-022, FR-025).
      const code = passCodeOf(text);
      if (code === null) {
        setPhase({ status: "answered", check: NOT_RECOGNISED });
        return;
      }

      setPhase({ status: "checking" });
      checkPass(selectedCondominiumId, code)
        .then((check) => {
          if (mounted.current && sequence.current === current) {
            setPhase({ status: "answered", check });
          }
        })
        .catch((error: unknown) => {
          if (!mounted.current || sequence.current !== current) {
            return;
          }
          // Sem rede, recusa do servidor ou corpo fora do contrato: tudo é "não deu para conferir".
          // O servidor explica a recusa por cargo; o resto fica com a frase geral.
          const body = error instanceof HttpError ? error.body : null;
          const explained =
            error instanceof HttpError &&
            error.type !== "network" &&
            typeof body === "object" &&
            body !== null &&
            "message" in body &&
            (body as { message: unknown }).message === MESSAGE_NOT_ALLOWED;
          setPhase({
            status: "failed",
            message: explained ? MESSAGE_NOT_ALLOWED : MESSAGE_CHECK_FAILED,
          });
        });
    },
    [selectedCondominiumId]
  );

  const scanAgain = useCallback(() => {
    // Invalida uma resposta que ainda esteja a caminho: ela não é mais de ninguém.
    sequence.current += 1;
    busy.current = false;
    setPhase({ status: "scanning" });
  }, []);

  return {
    canCheck,
    camera,
    askCamera,
    openSettings,
    phase,
    onScanned,
    scanAgain,
  };
}
