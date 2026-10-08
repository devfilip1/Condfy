import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { makeStyles, useTheme } from "@/shared/theme";
import {
  VisitType,
  Visitor,
  unitDescription,
} from "@/features/visitors/domain/visitor";
import { toDisplayDate, toDisplayDateTime } from "@/shared/lib/calendar";

export interface VisitorCardProps {
  visitor: Visitor;
  /** Apenas notifica a intenção de remover — a exclusão e a confirmação são de quem consome. */
  onRemove: (visitor: Visitor) => void;
  /**
   * Tocar no card abre o comprovante da visita. Só vale numa visita que veio com `passCode` — isto
   * é, que esta pessoa autorizou. Nas outras o card não é tocável.
   */
  onOpenPass?: (visitor: Visitor) => void;
}

/** Rótulos de interface em inglês para os valores de domínio em português (D-005). */
const TYPE_LABELS: Record<VisitType, string> = {
  visitor: "Visitor",
  delivery: "Delivery",
  service_provider: "Service",
};

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 25,
      marginBottom: 15,
      padding: 20,
      backgroundColor: colors.cardBackground,
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
      color: colors.textPrimary,
    },
    role: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    content: {
      gap: 10,
    },
    // Espaço reservado para a lixeira, que fica POR CIMA do conteúdo e não dentro dele.
    containerUpSideWithRemove: {
      paddingRight: 44,
    },
    removeButton: {
      position: "absolute",
      top: 28,
      right: 14,
      padding: 6,
    },
    footer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    // Quem liberou e para onde, em duas linhas: numa lista com as visitas do condomínio inteiro —
    // a do administrador — é isto que diz de quem é cada uma, e uma linha só cortava o nome.
    authorization: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    authorizedBy: {
      fontSize: 12,
      color: colors.textPrimary,
    },
    unit: {
      fontSize: 12,
      color: colors.textMuted,
    },
    date: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    entered: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "600",
      color: colors.successStrong,
    },
  })
);

/** Card de um visitor, com o controle de remoção visível para quem o autorizou (FR-002, FR-010). */
export default function VisitorCard({
  visitor,
  onRemove,
  onOpenPass,
}: VisitorCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  // O card abre o comprovante quando a visita veio com o código — o servidor só o manda a quem a
  // autorizou. Este componente não confere quem é quem.
  const opensPass = onOpenPass !== undefined && visitor.passCode !== undefined;
  const entered =
    visitor.enteredAt !== null
      ? `Came in · ${toDisplayDateTime(visitor.enteredAt)}`
      : null;

  const content = (
    <View style={styles.content}>
      <View
        style={[
          styles.containerUpSide,
          visitor.canRemove && styles.containerUpSideWithRemove,
        ]}
      >
        <Ionicons
          name="person-circle-outline"
          size={50}
          color={colors.textPrimary}
        />
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {visitor.name}
          </Text>
          <Text style={styles.role}>{TYPE_LABELS[visitor.type]}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.authorization}>
          <Text style={styles.authorizedBy} numberOfLines={1} ellipsizeMode="tail">
            Authorized by {visitor.authorizedBy.name}
          </Text>
          <Text style={styles.unit} numberOfLines={1} ellipsizeMode="tail">
            {unitDescription(visitor.unit)}
          </Text>
        </View>
        <Text style={styles.date}>
          {toDisplayDate(visitor.expectedDate)}
        </Text>
      </View>
      {/*
        O visitante já entrou: o porteiro conferiu o comprovante e ele estava válido. É um INSTANTE,
        lido na hora local de quem olha — ao contrário da data acima, que é um dia de calendário.
      */}
      {entered ? <Text style={styles.entered}>{entered}</Text> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {opensPass ? (
        <Pressable
          onPress={() => onOpenPass(visitor)}
          accessibilityRole="button"
          accessibilityLabel={`${visitor.name}, ${TYPE_LABELS[visitor.type]}, ${toDisplayDate(visitor.expectedDate)}${entered ? `, ${entered}` : ""}`}
          accessibilityHint="Opens the pass"
        >
          {content}
        </Pressable>
      ) : (
        content
      )}

      {/*
        Só quem autorizou a visita a remove. O administrador vê as de todo mundo, mas nas dos
        outros não há lixeira nenhuma, nem desabilitada — e o servidor recusa de qualquer jeito.

        A lixeira é IRMÃ da área tocável, por cima dela, e não filha: um botão dentro de outro é
        HTML inválido na web, e no aparelho o toque na lixeira abriria o comprovante junto.
      */}
      {visitor.canRemove ? (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(visitor)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${visitor.name}`}
        >
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
