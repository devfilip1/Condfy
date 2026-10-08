import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OwnReservation } from "@/features/reservations/domain/reservation";
import { slotLabel } from "@/features/reservations/domain/slot";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";
import { toDisplayDate } from "@/shared/lib/calendar";

/**
 * Card de uma reserva já feita: nome do local, dia e horário, e à direita o botão de cancelar.
 *
 * Componente puro: recebe a reserva e o callback por props e não acessa serviço, storage nem
 * navegação (constituição, Princípio II). O botão só AVISA que a pessoa quer cancelar — quem
 * confirma e quem chama o servidor é a tela, como no horário `held` da tela de reserva.
 */

export interface OwnReservationCardProps {
  reservation: OwnReservation;
  onCancel: (reservation: OwnReservation) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
    },
    texts: {
      flex: 1,
      minWidth: 0,
      gap: 8,
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
      textTransform: "uppercase",
    },
    details: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 18,
      rowGap: 4,
    },
    detail: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    detailText: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.control,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    cancelText: {
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.danger,
    },
  })
);

export default function OwnReservationCard({
  reservation,
  onCancel,
}: OwnReservationCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const date = toDisplayDate(reservation.date);
  const time = slotLabel(reservation);

  return (
    <View style={styles.card}>
      <View
        style={styles.texts}
        accessible
        accessibilityLabel={`${reservation.commonArea.name}, ${date}, ${time}`}
      >
        <Text style={styles.name} numberOfLines={2}>
          {reservation.commonArea.name}
        </Text>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>{date}</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>{time}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => onCancel(reservation)}
        accessibilityRole="button"
        accessibilityLabel={`Cancel the booking of ${reservation.commonArea.name}, ${date}, ${time}`}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
