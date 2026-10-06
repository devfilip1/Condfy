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
  })
);

export default function CommonAreaCard({ area, onPress }: CommonAreaCardProps) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(area)}
      accessibilityRole="button"
      accessibilityLabel={`${area.name}, tax usage ${formatCurrency(area.usageFee)}`}
    >
      <Photo uri={area.imageUrl} style={styles.image} />

      <View style={styles.texts}>
        {/* Duas linhas no máximo: nome comprido quebra sem empurrar a taxa para fora. */}
        <Text style={styles.name} numberOfLines={2}>
          {area.name}
        </Text>
        <Text style={styles.fee}>
          Tax usage: {formatCurrency(area.usageFee)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
