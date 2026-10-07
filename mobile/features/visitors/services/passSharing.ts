import * as Sharing from "expo-sharing";
import { RefObject } from "react";
import { Platform, View } from "react-native";
import { captureRef } from "react-native-view-shot";

/**
 * Transforma o comprovante em imagem e a entrega ao aparelho. É o ÚNICO I/O do comprovante.
 *
 * **Este é o único arquivo que importa `react-native-view-shot` e `expo-sharing`.** O hook chama
 * este módulo e não conhece as bibliotecas (constituição, Princípio I; ADR 0016).
 *
 * A imagem é feita no APARELHO, do que já está desenhado na tela: não há pedido ao servidor, então
 * compartilhar funciona sem conexão e o servidor nunca vê o comprovante pronto.
 *
 * Nunca lança: toda falha vira um desfecho que quem chama sabe dizer à pessoa.
 */

/** A raiz do quadrado do comprovante. */
export type PassTarget = RefObject<View | null>;

/**
 * - `shared` — o aparelho abriu o compartilhamento com a imagem.
 * - `saved` — não dava para compartilhar um arquivo, e a imagem foi salva no lugar (web).
 * - `cancelled` — a pessoa desistiu no meio. Não é erro.
 * - `unavailable` — nem compartilhar nem salvar foi possível, ou a captura falhou.
 */
export type ShareOutcome = "shared" | "saved" | "cancelled" | "unavailable";

/**
 * Lado da imagem, em pixels. Fixo: um celular pequeno e um tablet geram a MESMA imagem, e ela chega
 * legível depois de um aplicativo de conversa comprimi-la de novo.
 */
const PICTURE_SIDE = 1080;

export async function sharePassPicture(
  target: PassTarget,
  fileName: string
): Promise<ShareOutcome> {
  try {
    return Platform.OS === "web"
      ? await shareOnWeb(target, fileName)
      : await shareOnDevice(target);
  } catch {
    return "unavailable";
  }
}

async function shareOnDevice(target: PassTarget): Promise<ShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) {
    return "unavailable";
  }

  // Arquivo temporário: some quando o app fecha, e é o que o compartilhamento do sistema recebe.
  const uri = await captureRef(target, {
    format: "png",
    result: "tmpfile",
    width: PICTURE_SIDE,
    height: PICTURE_SIDE,
  });

  // O sistema não conta se a pessoa mandou ou fechou a folha de compartilhamento, e não precisa:
  // nos dois casos o comprovante continua aberto e nada mais há a fazer.
  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Share the pass",
  });
  return "shared";
}

/**
 * No navegador o `expo-sharing` só compartilha um ENDEREÇO, não um arquivo — a imagem iria como um
 * link que ninguém abre. Então aqui o arquivo é oferecido direto ao navegador; quando ele não
 * aceita compartilhar arquivo (é o caso da maioria no computador), a imagem é baixada.
 */
async function shareOnWeb(
  target: PassTarget,
  fileName: string
): Promise<ShareOutcome> {
  const dataUri = await captureRef(target, {
    format: "png",
    result: "data-uri",
    width: PICTURE_SIDE,
    height: PICTURE_SIDE,
  });

  const blob = await (await fetch(dataUri)).blob();
  const file = new File([blob], fileName, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (error: unknown) {
      // Fechar a janela de compartilhamento do navegador chega como `AbortError`.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Qualquer outra recusa do navegador: cai para salvar, em vez de deixar a pessoa sem nada.
    }
  }

  if (typeof document === "undefined") {
    return "unavailable";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return "saved";
}
