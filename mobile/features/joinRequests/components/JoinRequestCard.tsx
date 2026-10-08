import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  JoinRequest,
  apartmentText,
} from "@/features/joinRequests/domain/joinRequest";
import { toDisplayDateTime } from "@/shared/lib/calendar";
import { makeStyles } from "@/shared/theme";

/**
 * Card de um pedido de entrada: quem pede, para qual unidade, desde quando — e as duas respostas.
 *
 * Componente puro: recebe o pedido e os callbacks por props (constituição, Princípio II). Os
 * botões só PEDEM a resposta; quem confirma é o diálogo da tela.
 *
 * O nome e o e-mail aparecem inteiros de propósito: é com eles que quem cuida do condomínio confere
 * se aquela pessoa mora mesmo ali.
 */

export interface JoinRequestCardProps {
  request: JoinRequest;
  onApprove: (request: JoinRequest) => void;
  onReject: (request: JoinRequest) => void;
  /** Há uma resposta em andamento: os dois botões ficam travados. */
  disabled?: boolean;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
    },
    name: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    email: {
      fontSize: 14,
      color: colors.textMuted,
    },
    apartment: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    asked: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    button: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    approve: {
      backgroundColor: colors.accent,
    },
    approveLabel: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.textOnAccent,
    },
    reject: {
      borderWidth: 1,
      borderColor: colors.danger,
    },
    rejectLabel: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.danger,
    },
    disabled: {
      opacity: 0.5,
    },
  })
);

export default function JoinRequestCard({
  request,
  onApprove,
  onReject,
  disabled = false,
}: JoinRequestCardProps) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
        {request.name}
      </Text>
      <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
        {request.email}
      </Text>
      <Text style={styles.apartment}>{apartmentText(request.unit)}</Text>
      {/* Um INSTANTE, na hora local de quem olha. */}
      <Text style={styles.asked}>
        Asked {toDisplayDateTime(request.requestedAt)}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.reject, disabled && styles.disabled]}
          onPress={() => onReject(request)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityLabel={`Reject ${request.name}`}
        >
          <Text style={styles.rejectLabel}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.approve, disabled && styles.disabled]}
          onPress={() => onApprove(request)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityLabel={`Approve ${request.name}`}
        >
          <Text style={styles.approveLabel}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
