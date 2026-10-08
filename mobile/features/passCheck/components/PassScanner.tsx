import { CameraView } from "expo-camera";
import { StyleSheet, Text, View } from "react-native";

import { makeStyles } from "@/shared/theme";

/**
 * A câmera apontada para o comprovante de um visitante.
 *
 * **Um dos DOIS arquivos do aplicativo que importam `expo-camera`** — o outro é
 * `services/cameraPermission.ts` (ADR 0020).
 *
 * Componente puro: mostra o que a câmera vê e avisa o que leu. NÃO pede permissão, não chama
 * serviço e não decide nada sobre o texto lido — nem sequer se é um comprovante (constituição,
 * Princípio II). Nada do que a câmera vê é guardado ou enviado; só o texto do QR sai daqui.
 *
 * `onScanned` dispara MUITAS vezes por segundo enquanto um código está na frente da câmera. Quem
 * trava a repetição é o hook, com um ref; aqui, `active: false` simplesmente desliga a leitura,
 * para nada ser lido por trás de uma resposta que está na tela.
 */

export interface PassScannerProps {
  /** `false` pausa a leitura: há uma resposta na tela, ou uma conferência em andamento. */
  active: boolean;
  onScanned: (text: string) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // A câmera é escura em qualquer aparência do aplicativo: o fundo acompanha.
      backgroundColor: colors.overlay,
    },
    camera: {
      flex: 1,
    },
    aim: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      paddingHorizontal: 32,
    },
    frame: {
      width: 240,
      height: 240,
      borderRadius: 24,
      borderWidth: 3,
      borderColor: colors.textOnOverlay,
    },
    hint: {
      fontSize: 15,
      fontWeight: "600",
      textAlign: "center",
      color: colors.textOnOverlay,
    },
  })
);

export default function PassScanner({ active, onScanned }: PassScannerProps) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        // Só QR: um código de barras de produto na frente da câmera nem chega a ser lido.
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={active ? (result) => onScanned(result.data) : undefined}
      />
      {/* Por cima da câmera, sem interceptar toque: é só a mira e a instrução. */}
      <View style={styles.aim} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>
          Point the camera at the visitor&apos;s pass.
        </Text>
      </View>
    </View>
  );
}
