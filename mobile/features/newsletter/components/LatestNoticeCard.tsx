import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Notice, previewOf } from "@/features/newsletter/domain/notice";
import { toDisplayDayMonth } from "@/shared/lib/calendar";
import { ThemeProvider, makeStyles } from "@/shared/theme";

/**
 * O card do último aviso, na home: o título, o começo do texto e a data, sobre o fundo de ondas.
 *
 * Componente puro: recebe o aviso e o callback por props (constituição, Princípio II). Não busca e
 * não navega — quem faz as duas coisas é a tela que o usa.
 *
 * **Sempre desenhado com a paleta ESCURA, qualquer que seja a aparência do aplicativo** — é assim
 * que ele foi desenhado. Isso NÃO é uma cor lida de constante: é o `ThemeProvider` de sempre,
 * montado de novo aqui dentro com `scheme="dark"`, do mesmo jeito que o comprovante de visita se
 * monta com `scheme="light"` (ADR 0014). Por isso o conteúdo fica num componente interno: o
 * `makeStyles` dele precisa rodar DENTRO desse provider. Chamado no componente de fora, ele leria a
 * aparência em uso, e o card ficaria claro quando o aplicativo está claro.
 *
 * A imagem de ondas vai por baixo do texto, esmaecida, sobre uma base escura: é o que mantém a data
 * e o "See more" legíveis em cima da parte mais clara dela — e, se a imagem não carregar, o que
 * sobra é um card escuro perfeitamente legível.
 */

export interface LatestNoticeCardProps {
  notice: Notice;
  onPress: (notice: Notice) => void;
}

/** A imagem que o dono do produto forneceu com o desenho. O único asset empacotado do projeto. */
const WAVES = require("@/assets/images/notice-card-waves.png");

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      marginTop: 20,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: colors.screenBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    waves: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      opacity: 0.45,
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 18,
      gap: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 12,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 17,
      fontWeight: "bold",
      color: colors.textOnOverlay,
    },
    label: {
      fontSize: 11,
      letterSpacing: 0.5,
      color: colors.textOnOverlay,
    },
    preview: {
      fontSize: 14,
      lineHeight: 20,
      // Reserva as duas linhas: um aviso curto não deixa o card mais baixo que os outros.
      minHeight: 40,
      color: colors.successStrong,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    date: {
      fontSize: 13,
      color: colors.successStrong,
    },
    cue: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textOnOverlay,
    },
  })
);

function CardContent({ notice, onPress }: LatestNoticeCardProps) {
  const styles = useStyles();
  const date = toDisplayDayMonth(notice.date);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(notice)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}, ${date}. Opens the notice.`}
    >
      <Image
        source={WAVES}
        style={styles.waves}
        contentFit="cover"
        contentPosition="bottom"
        // Decoração: o leitor de tela não precisa passar por ela.
        accessible={false}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          {/* Uma linha só: um título longo é cortado, em vez de empurrar o rótulo para fora. */}
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {notice.title.toUpperCase()}
          </Text>
          <Text style={styles.label}>NEWSLETTER</Text>
        </View>

        {/*
          Duas linhas de CONTEÚDO: `previewOf` junta os parágrafos em texto corrido, senão a segunda
          linha seria gasta com a linha em branco entre eles.
        */}
        <Text style={styles.preview} numberOfLines={2} ellipsizeMode="tail">
          {previewOf(notice.body)}
        </Text>

        <View style={styles.footer}>
          {/* Dia de calendário, cortado do texto — nunca convertido por fuso. */}
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.cue}>See more</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LatestNoticeCard(props: LatestNoticeCardProps) {
  return (
    <ThemeProvider scheme="dark">
      <CardContent {...props} />
    </ThemeProvider>
  );
}
