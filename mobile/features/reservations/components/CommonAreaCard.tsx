import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CommonArea } from "@/features/reservations/domain/commonArea";
import Photo from "@/shared/components/Photo";
import { makeStyles } from "@/shared/theme";
import { formatCurrency } from "@/shared/lib/currency";

/**
 * Card de uma área comum: foto arredondada à esquerda, nome em caixa alta, taxa abaixo.
 *
 * Componente puro: recebe dados e callback por props, não acessa serviço, storage nem navegação
 * (constituição, Princípio II). Quem decide o que o toque significa é a tela.
 */

const IMAGE_SIZE = 72;

export interface CommonAreaCardProps {
  area: CommonArea;
  /**
   * Endereço completo da foto, já montado por quem conhece o endereço da API, ou `null`. O card é
   * puro: não sabe que a foto tem duas origens possíveis.
   */
  photoUri: string | null;
  onPress: (area: CommonArea) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    // Tamanho fixo: a foto ausente, lenta ou quebrada ocupa o mesmo espaço, então a linha nunca
    // muda de altura nem empurra as vizinhas (FR-002b).
    image: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      borderRadius: 16,
    },
    texts: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
      textTransform: "uppercase",
    },
    fee: {
      marginTop: 4,
      fontSize: 14,
      color: colors.textSecondary,
    },
    // Apagado, mas não invisível: o local continua na lista de propósito (FR-011). Só a foto e os
    // textos esmaecem — o rótulo abaixo fica com a cor cheia, porque é ele que explica.
    muted: {
      opacity: 0.45,
    },
    // A diferença não pode ser só de cor (FR-012): a palavra diz o que o esmaecido sugere.
    unavailable: {
      alignSelf: "flex-start",
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.chipBackground,
    },
    unavailableText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
  })
);

export default function CommonAreaCard({
  area,
  photoUri,
  onPress,
}: CommonAreaCardProps) {
  const styles = useStyles();
  const unavailable = !area.isAvailable;

  // O card de um local indisponível CONTINUA tocável: para o morador o toque explica por que não
  // abre, para o administrador ele abre a tela onde o local é religado. Quem decide é a tela.
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(area)}
      accessibilityRole="button"
      accessibilityLabel={`${area.name}, tax usage ${formatCurrency(area.usageFee)}${unavailable ? ", unavailable" : ""}`}
    >
      {/* O `id` como chave de cache: o caminho de uma foto enviada é assinado e muda a cada carga. */}
      <Photo
        uri={photoUri}
        cacheKey={area.id}
        style={[styles.image, unavailable && styles.muted]}
      />

      <View style={styles.texts}>
        {/* Duas linhas no máximo: nome comprido quebra sem empurrar a taxa para fora. */}
        <Text style={[styles.name, unavailable && styles.muted]} numberOfLines={2}>
          {area.name}
        </Text>
        <Text style={[styles.fee, unavailable && styles.muted]}>
          Tax usage: {formatCurrency(area.usageFee)}
        </Text>
        {unavailable ? (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableText}>Unavailable</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
