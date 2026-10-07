import * as ImagePicker from "expo-image-picker";

import {
  SelectedPhoto,
  base64ByteSize,
} from "@/features/condominiums/domain/newCondominium";

/**
 * Câmera e galeria do aparelho, para a foto do condomínio.
 *
 * **É o SEGUNDO seletor do app, de propósito** — o primeiro é o de achados e perdidos. Os dois
 * fazem o mesmo I/O com opções diferentes (este pede o recorte em 16:9, que é a proporção do
 * banner), e a constituição não deixa lugar para compartilhá-los: `shared/` não guarda I/O, e uma
 * feature só importa outra pelo `index.ts` dela — o que faria "condomínios" depender de "achados e
 * perdidos" para abrir uma câmera. Dois usos são dois arquivos curtos; um terceiro é a hora de
 * emendar a constituição com um lugar para isso (research R-008 da 013).
 *
 * Pedir permissão, as opções do seletor e a diferença entre web e nativo ficam aqui dentro. O resto
 * da feature recebe um `SelectedPhoto` e não sabe qual biblioteca o produziu.
 */

export type PhotoSource = "camera" | "gallery";

export type PickResult =
  | { outcome: "picked"; photo: SelectedPhoto }
  /** A pessoa fechou o seletor sem escolher. Não é erro e não merece mensagem. */
  | { outcome: "cancelled" }
  /** A permissão foi recusada, ou o aparelho não deixou abrir a câmera/galeria. */
  | { outcome: "denied" };

/**
 * `allowsEditing` com `aspect: [16, 9]` abre o recorte na proporção recomendada, onde a plataforma
 * oferece um — é conselho, não regra: uma foto em outra proporção é aceita e a tela a corta para
 * caber. `quality: 0.6` mantém uma foto de celular bem abaixo dos 5 MB sem uma segunda biblioteca
 * para redimensionar. `base64: true` porque é assim que a foto viaja, dentro do JSON.
 */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [16, 9],
  quality: 0.6,
  base64: true,
  allowsMultipleSelection: false,
};

const DATA_URI = /^data:[^;,]*;base64,(.+)$/;

/**
 * Os bytes da foto em base64. No nativo o seletor preenche `base64`; na web ele pode entregar só o
 * endereço, que lá é um `data:` com o base64 dentro.
 */
function base64Of(asset: ImagePicker.ImagePickerAsset): string | null {
  if (asset.base64) {
    return asset.base64;
  }
  const match = DATA_URI.exec(asset.uri);
  return match ? match[1] : null;
}

function toResult(result: ImagePicker.ImagePickerResult): PickResult {
  if (result.canceled || result.assets.length === 0) {
    return { outcome: "cancelled" };
  }

  const asset = result.assets[0];
  const base64 = base64Of(asset);
  if (base64 === null) {
    // Sem os bytes não há o que enviar. Para quem usa, é o mesmo que não ter conseguido abrir.
    return { outcome: "denied" };
  }

  return {
    outcome: "picked",
    photo: {
      base64: base64,
      previewUri: asset.uri,
      // O tamanho medido nos bytes que vão ser enviados, e não `fileSize`: com `quality` abaixo de
      // 1 o seletor recomprime, e o arquivo original pode ser bem maior que o que sai daqui.
      byteSize: base64ByteSize(base64),
    },
  };
}

/** Abre a câmera ou a galeria e devolve a foto escolhida. Nunca lança. */
export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  try {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { outcome: "denied" };
    }

    return toResult(
      source === "camera"
        ? await ImagePicker.launchCameraAsync(OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(OPTIONS)
    );
  } catch {
    // Aparelho sem câmera, navegador que bloqueou, seletor que falhou ao abrir.
    return { outcome: "denied" };
  }
}
