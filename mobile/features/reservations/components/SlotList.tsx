import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Slot, slotLabel } from "@/features/reservations/domain/slot";
import { BookingBusy } from "@/features/reservations/hooks/useBooking";
import { Colors } from "@/shared/constants/Colors";
import { toDisplayDate } from "@/shared/lib/calendar";

/**
 * Os horários do day escolhido.
 *
 * Puro: recebe dados e callbacks, não acessa serviço nem navegação (Princípio II).
 *
 * São quatro situações, e cada uma precisa ser distinguível — é o que torna a FR-010 e a SC-007
 * verificáveis em vez de "olhar e ver": nenhum day escolhido ainda, day com horários, day sem nada
 * livre, e uma recusa acima da lista.
 *
 * Horário ocupado por outra pessoa não chega aqui: o servidor não o manda (FR-012).
 */

export interface SlotListProps {
  /** `null` enquanto nenhum day foi tocado. */
  date: string | null;
  slots: Slot[];
  busy: BookingBusy | null;
  notice: string | null;
  onBook: (slot: Slot) => void;
  onCancel: (slot: Slot) => void;
}

const MESSAGE_PICK_A_DAY = "Pick a day on the calendar to see its times.";
const MESSAGE_DAY_FULL = "Every time of this day is taken.";

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 18,
    gap: 10,
  },
  heading: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  hint: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingVertical: 12,
  },
  notice: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  slot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  slotBusy: {
    opacity: 0.5,
  },
  slotHeld: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  slotText: {
    gap: 2,
  },
  heldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  action: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  actionCancel: {
    color: Colors.danger,
  },
});

export default function SlotList({
  date,
  slots,
  busy,
  notice,
  onBook,
  onCancel,
}: SlotListProps) {
  if (date === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>{MESSAGE_PICK_A_DAY}</Text>
      </View>
    );
  }

  // O day está cheio quando não sobra nada para reservar. Um horário que esta pessoa segura continua
  // aparecendo — é por ele que ela chega no cancelamento (FR-012a) —, mas não conta como vaga.
  const hasOpenSlot = slots.some((slot) => slot.status === "open");

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{toDisplayDate(date)}</Text>

      {notice !== null ? (
        <View style={styles.notice} accessibilityRole="alert">
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {!hasOpenSlot ? (
        <Text style={styles.hint}>{MESSAGE_DAY_FULL}</Text>
      ) : null}

      {slots.map((slot) => {
        const held = slot.status === "held";
        const working = held
          ? busy?.kind === "cancelling" && busy.reservationId === slot.reservationId
          : busy?.kind === "booking" && busy.startMinute === slot.startMinute;

        return (
          <TouchableOpacity
            key={slot.startMinute}
            style={[
              styles.slot,
              held && styles.slotHeld,
              busy !== null && styles.slotBusy,
            ]}
            onPress={() => (held ? onCancel(slot) : onBook(slot))}
            // Qualquer ação em voo trava a lista inteira: duas reservas ao mesmo tempo, do mesmo
            // aparelho, não são a corrida que o sistema precisa resolver — são um toque duplo.
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel={
              held
                ? `Cancel the booking for ${slotLabel(slot)}`
                : `Book ${slotLabel(slot)}`
            }
          >
            <View style={styles.slotText}>
              <Text style={styles.slotLabel}>{slotLabel(slot)}</Text>
              {/* Diz que está segurado, nunca por quem: nome de quem reservou não entra aqui. */}
              {held ? <Text style={styles.heldLabel}>Booked</Text> : null}
            </View>
            {working ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text style={[styles.action, held && styles.actionCancel]}>
                {held ? "Cancel" : "Book"}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
