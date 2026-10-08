import { Ref } from "react";
import { StyleSheet, Text, View } from "react-native";

import CondfyMark from "@/features/visitors/components/CondfyMark";
import QrCode from "@/features/visitors/components/QrCode";
import {
  Visitor,
  passAuthorizationLine,
  passQrValue,
} from "@/features/visitors/domain/visitor";
import { toDisplayDate } from "@/shared/lib/calendar";
import {
  ThemeProvider,
  fontSizes,
  fonts,
  makeStyles,
  radius,
} from "@/shared/theme";

/**
 * O comprovante de liberação de uma visita: o QUADRADO, que é o que vira imagem ao compartilhar.
 *
 * Puro: recebe a visita e não acessa serviço nem hook de estado (Princípio II). De cima para baixo,
 * na ordem pedida: a saudação ao visitante, quem autoriza e em qual condomínio, o dia em que vale,
 * o QR Code e a marca do Condfy.
 *
 * **Sempre desenhado com a paleta CLARA, qualquer que seja a aparência do aplicativo.** A imagem
 * que sai daqui é aberta no celular de quem não tem o app, e o QR precisa ser escuro sobre claro
 * para ser lido. Isso NÃO é uma cor lida de constante: é o `ThemeProvider` de sempre, montado de
 * novo aqui dentro com `scheme="light"` — ele já é puro e já recebe o esquema por prop. Por isso o
 * conteúdo fica num componente interno: o `makeStyles` dele precisa rodar DENTRO desse provider.
 *
 * O que fica fora do quadrado — o véu, o botão de compartilhar — continua na aparência em uso.
 */

/** Que fração do lado do quadrado o QR ocupa. Fixa: nome comprido não encolhe o código (FR-008). */
const QR_SHARE = 0.44;

export interface VisitorPassProps {
  visitor: Visitor;
  /** Do condomínio DA VISITA, que não é necessariamente o que está em tela. */
  condominiumName: string;
  /** O dia da visita já passou: o comprovante diz que não vale mais. */
  expired: boolean;
  /** Lado do quadrado na tela. A imagem compartilhada tem tamanho próprio, fixo. */
  size: number;
  /** A raiz do quadrado: é o que o serviço de compartilhar captura. */
  ref?: Ref<View>;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    pass: {
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderRadius: radius.card,
      backgroundColor: colors.cardBackground,
    },
    texts: {
      alignSelf: "stretch",
      alignItems: "center",
      gap: 4,
    },
    greeting: {
      fontSize: fontSizes.title,
      fontFamily: fonts.display,
      textAlign: "center",
      color: colors.textPrimary,
    },
    authorization: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      textAlign: "center",
      color: colors.textMuted,
    },
    validity: {
      marginTop: 2,
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      textAlign: "center",
      color: colors.textPrimary,
    },
    validityExpired: {
      color: colors.danger,
    },
  })
);

function PassContent({
  visitor,
  condominiumName,
  expired,
  size,
  ref,
}: VisitorPassProps) {
  const styles = useStyles();
  const date = toDisplayDate(visitor.expectedDate);

  if (!visitor.passCode) {
    return null;
  }

  return (
    <View
      ref={ref}
      style={[styles.pass, { width: size, height: size }]}
      // Sem isto o Android pode "achatar" esta View na hierarquia nativa, e aí não há o que capturar.
      collapsable={false}
    >
      <View style={styles.texts}>
        {/* Encolhe a letra antes de cortar: o nome inteiro tem de caber (FR-008). */}
        <Text
          style={styles.greeting}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          Attention, {visitor.name}
        </Text>
        <Text
          style={styles.authorization}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {passAuthorizationLine(visitor, condominiumName)}
        </Text>
        <Text style={[styles.validity, expired && styles.validityExpired]}>
          {expired ? `No longer valid · ${date}` : `Valid on ${date}`}
        </Text>
      </View>

      <QrCode value={passQrValue(visitor.passCode)} size={size * QR_SHARE} />

      <CondfyMark />
    </View>
  );
}

export default function VisitorPass(props: VisitorPassProps) {
  return (
    <ThemeProvider scheme="light">
      <PassContent {...props} />
    </ThemeProvider>
  );
}
