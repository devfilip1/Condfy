import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Colors } from "@/shared/constants/Colors";
import { TipoVisita, Visitante } from "@/features/visitors/domain/visitante";
import { paraDataExibicao } from "@/shared/lib/calendario";

export interface VisitorCardProps {
  visitante: Visitante;
  /** Apenas notifica a intenção de remover — a exclusão e a confirmação são de quem consome. */
  onRemove: (visitante: Visitante) => void;
}

/** Rótulos de interface em inglês para os valores de domínio em português (D-005). */
const ROTULOS_TIPO: Record<TipoVisita, string> = {
  visitante: "Visitor",
  entrega: "Delivery",
  prestador: "Service",
};

export const styles = StyleSheet.create({
  container: {
    marginHorizontal: 25,
    marginBottom: 15,
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    boxShadow: "0px 4px 3px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  containerUpSide: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    boxShadow: "0px 2px 0px rgba(0, 0, 0, 0.1)",
    paddingBottom: 10,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    textTransform: "uppercase",
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  role: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  removeButton: {
    padding: 6,
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  authorizedBy: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  date: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});

/** Card de um visitante, com controle de remoção sempre visível (FR-002, FR-010). */
export default function VisitorCard({ visitante, onRemove }: VisitorCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.containerUpSide}>
        <Ionicons
          name="person-circle-outline"
          size={50}
          color={Colors.textPrimary}
        />
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {visitante.nome}
          </Text>
          <Text style={styles.role}>{ROTULOS_TIPO[visitante.tipo]}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(visitante)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${visitante.nome}`}
        >
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.authorizedBy} numberOfLines={1} ellipsizeMode="tail">
          Access authorized by: {visitante.autorizadoPor}
        </Text>
        <Text style={styles.date}>
          {paraDataExibicao(visitante.dataPrevista)}
        </Text>
      </View>
    </View>
  );
}
