import * as ImagePicker from "expo-image-picker";

import {
  SelectedPhoto,
  base64ByteSize,
} from "@/features/lostAndFound/domain/foundItem";

/**
 * Câmera e galeria do aparelho: o ÚNICO arquivo do app que importa `expo-image-picker`.
 *
 * Pedir permissão, as opções do seletor e qualquer diferença entre web e nativo ficam aqui dentro.
 * O resto da feature recebe um `SelectedPhoto` e não sabe qual biblioteca o produziu — trocar de
 * biblioteca é trocar este arquivo.
 */

export type PhotoSource = "camera" | "gallery";

export type PickResult =
  | { outcome: "picked"; photo: SelectedPhoto }
  /** A pessoa fechou o seletor sem escolher. Não é erro e não merece mensagem. */
  | { outcome: "cancelled" }
  /** A permissão foi recusada, ou o aparelho não deixou abrir a câmera/galeria. */
  | { outcome: "denied" };

/**
 * `quality: 0.6` é o que mantém uma foto de celular bem abaixo dos 5 MB sem uma segunda biblioteca
 * para redimensionar (research R-003). `base64: true` porque é assim que a foto viaja para o
 * servidor, dentro do JSON.
 */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.6,
  base64: true,
  allowsMultipleSelection: false,
};

const DATA_URI = /^data:[^;,]*;base64,(.+)$/;

/**
 * Os bytes da foto em base64. No nativo o seletor preenche `base64`; na web ele pode entregar só o
 * endereço, que lá é um `data:` com o base64 dentro. Esta é a diferença entre plataformas que a
 * feature tem, e ela não sai daqui.
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
