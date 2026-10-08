import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BookedSlot, slotLabel } from "@/features/reservations/domain/slot";
import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

/**
 * As reservas do dia escolhido: os horários do local que já têm dono, de quem quer que seja.
 *
 * Puro: recebe dados e um callback, não acessa serviço nem navegação (Princípio II).
 *
 * É a outra metade do `SlotGrid`, que só mostra o que dá para reservar e o que é da própria pessoa.
 * Para um morador nada aqui é tocável: a lista informa, e a reserva dele continua sendo cancelada
 * pela pílula do próprio horário lá em cima.
 *
 * **Para o administrador, a reserva de outra pessoa vira um botão** — e este é o único lugar de
 * onde ela é cancelada. O componente não decide isso olhando cargo nenhum: um horário é tocável
 * quando veio com `reservationId`, e o servidor só manda o id para quem pode cancelar por aqui.
 * De quem é a reserva continua não aparecendo, nem para ele.
 */

export interface DayBookingsProps {
  /** `null` enquanto nenhum dia foi tocado: a seção não aparece. */
  date: string | null;
  booked: BookedSlot[];
  /** Ausente para quem não cancela por esta lista: nenhuma pílula vira botão. */
  onCancel?: (slot: BookedSlot) => void;
  /** Alguma ação está em voo: os botões ficam parados até ela terminar. */
  busy?: boolean;
}

const HEADING = "Bookings of the day";
const MESSAGE_NONE = "Nobody has booked this day yet.";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 20,
      marginTop: 24,
      gap: 10,
    },
    heading: {
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.textMuted,
    },
    hint: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textMuted,
      paddingVertical: 12,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
    },
    // A mesma largura das pílulas livres, para as duas grades alinharem; sem borda forte nem sombra,
    // para não parecer um botão.
    pill: {
      width: "48%",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.control,
      backgroundColor: colors.chipBackground,
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    pillLabel: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.semibold,
      color: colors.textMuted,
    },
    // A que dá para cancelar usa as cores da pílula `held` do `SlotGrid`: é a mesma ação, vista
    // de outra lista, então parece a mesma coisa.
    pillCancellable: {
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    pillBusy: {
      opacity: 0.5,
    },
    pillLabelCancellable: {
      color: colors.textPrimary,
    },
    cancelLabel: {
      marginTop: 2,
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
  })
);

export default function DayBookings({
  date,
  booked,
  onCancel,
  busy = false,
}: DayBookingsProps) {
  const styles = useStyles();
  if (date === null) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{HEADING}</Text>

      {booked.length === 0 ? (
        <Text style={styles.hint}>{MESSAGE_NONE}</Text>
      ) : (
        <View style={styles.grid}>
          {booked.map((slot) =>
            onCancel && slot.reservationId ? (
              <TouchableOpacity
                key={slot.startMinute}
                style={[
                  styles.pill,
                  styles.pillCancellable,
                  busy && styles.pillBusy,
                ]}
                onPress={() => onCancel(slot)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={`Cancel the booking for ${slotLabel(slot)}`}
              >
                <Text style={[styles.pillLabel, styles.pillLabelCancellable]}>
                  {slotLabel(slot)}
                </Text>
                <Text style={styles.cancelLabel}>Tap to cancel</Text>
              </TouchableOpacity>
            ) : (
              <View
                key={slot.startMinute}
                style={styles.pill}
                accessible
                accessibilityLabel={`${slotLabel(slot)}, booked`}
              >
                <Text style={styles.pillLabel}>{slotLabel(slot)}</Text>
              </View>
            )
          )}
        </View>
      )}
    </View>
  );
}
