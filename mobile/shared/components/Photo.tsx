import { Octicons } from "@expo/vector-icons";
import { Image, ImageStyle } from "expo-image";
import { StyleProp, StyleSheet, View } from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";

/**
 * Uma foto, ou o placeholder dela no MESMO espaço.
 *
 * Promovido para `shared/` no terceiro uso (card do catálogo, tela de reserva, item de achados e
 * perdidos), como manda o Princípio II. O tamanho e o raio vêm de quem usa, pelo `style`, e valem
 * para os dois ramos — é isso que impede a linha de mudar de altura quando a foto falta, demora
 * ou quebra.
 *
 * Componente puro: não busca nada além do que o `expo-image` busca pelo endereço recebido.
 */

export interface PhotoProps {
  /** Endereço da foto, ou `null` para mostrar o placeholder. */
  uri: string | null;
  /** Largura, altura, raio e margens. Aplicado igualmente à foto e ao placeholder. */
  style: StyleProp<ImageStyle>;
  /** Tamanho do ícone do placeholder. */
  iconSize?: number;
  /**
   * Chave do cache quando o endereço muda mas a imagem não — é o caso de um endereço assinado, que
   * é outro a cada carga da lista.
   */
  cacheKey?: string;
  accessibilityLabel?: string;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    // Fundo também na foto: é o que aparece enquanto ela carrega.
    frame: {
      backgroundColor: colors.chipBackground,
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
    },
  })
);

export default function Photo({
  uri,
  style,
  iconSize = 26,
  cacheKey,
  accessibilityLabel,
}: PhotoProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!uri) {
    return (
      <View style={[styles.frame, styles.placeholder, style]}>
        <Octicons name="image" size={iconSize} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Image
      style={[styles.frame, style]}
      source={cacheKey ? { uri: uri, cacheKey: cacheKey } : uri}
      contentFit="cover"
      transition={200}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
