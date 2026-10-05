import { Image } from "expo-image";
import { Octicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CommonArea } from "@/features/reservations/domain/commonArea";
import { Colors } from "@/shared/constants/Colors";
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

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  // Tamanho fixo: a foto ausente, lenta ou quebrada ocupa o mesmo espaço, então a linha nunca
  // muda de altura nem empurra as vizinhas (FR-002b).
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    backgroundColor: Colors.chipBackground,
  },
  placeholder: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    backgroundColor: Colors.chipBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.textPrimary,
    textTransform: "uppercase",
  },
  fee: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default function CommonAreaCard({ area, onPress }: CommonAreaCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(area)}
      accessibilityRole="button"
      accessibilityLabel={`${area.name}, tax usage ${formatCurrency(area.usageFee)}`}
    >
      {area.imageUrl ? (
        <Image
          style={styles.image}
          source={area.imageUrl}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.placeholder}>
          <Octicons name="image" size={26} color={Colors.textSecondary} />
        </View>
      )}

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
