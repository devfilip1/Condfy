import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Slot, slotLabel } from "@/features/reservations/domain/slot";
import { BookingBusy } from "@/features/reservations/hooks/useBooking";
import { makeStyles } from "@/shared/theme";
import { toDisplayDate } from "@/shared/lib/calendar";

/**
 * Os horários do day escolhido, como pílulas lado a lado que quebram em quantas linhas precisar.
 *
 * Puro: recebe dados e callbacks, não acessa serviço nem navegação (Princípio II).
 *
 * São quatro situações, e cada uma precisa ser distinguível — é o que torna a FR-010 e a SC-007
 * verificáveis em vez de "olhar e ver": nenhum day escolhido ainda, day com horários, day sem nada
 * livre, e uma recusa acima da grade.
 *
 * **Tocar numa pílula livre ESCOLHE, não reserva.** Quem reserva é o botão no fim da tela, depois de
 * uma confirmação. Já a pílula de um horário que esta pessoa segura continua sendo o caminho do
 * cancelamento (FR-012a), e por isso tem aparência própria: ela não é uma opção a escolher.
 *
 * Horário ocupado por outra pessoa não chega aqui: o servidor não o manda (FR-012).
 */

export interface SlotGridProps {
  /** `null` enquanto nenhum day foi tocado. */
  date: string | null;
  slots: Slot[];
  /** O início do horário escolhido, ou `null`. */
  selectedStartMinute: number | null;
  busy: BookingBusy | null;
  notice: string | null;
  onSelect: (slot: Slot) => void;
  onCancel: (slot: Slot) => void;
}

const MESSAGE_PICK_A_DAY = "Pick a day on the calendar to see its times.";
const MESSAGE_DAY_FULL = "Every time of this day is taken.";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
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
      color: colors.textMuted,
    },
    hint: {
      fontSize: 14,
      color: colors.textMuted,
      paddingVertical: 12,
    },
    notice: {
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noticeText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
    },
    // Duas por linha: `07:00 – 09:00` em tamanho legível não cabe três vezes na largura de um
    // celular pequeno. Largura em porcentagem, e não `flex`, para a última linha ímpar não esticar.
    pill: {
      width: "48%",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.successStrong,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 8,
      paddingVertical: 12,
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.15)",
    },
    pillSelected: {
      backgroundColor: colors.successStrong,
    },
    pillHeld: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    pillBusy: {
      opacity: 0.5,
    },
    pillLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.successStrong,
    },
    pillLabelSelected: {
      color: colors.textOnStrong,
    },
    pillLabelHeld: {
      color: colors.textPrimary,
    },
    heldLabel: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
    },
  })
);

export default function SlotGrid({
  date,
  slots,
  selectedStartMinute,
  busy,
  notice,
  onSelect,
  onCancel,
}: SlotGridProps) {
  const styles = useStyles();
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

      <View style={styles.grid}>
        {slots.map((slot) => {
          const held = slot.status === "held";
          const selected = !held && slot.startMinute === selectedStartMinute;

          return (
            <TouchableOpacity
              key={slot.startMinute}
              style={[
                styles.pill,
                selected && styles.pillSelected,
                held && styles.pillHeld,
                busy !== null && styles.pillBusy,
              ]}
              onPress={() => (held ? onCancel(slot) : onSelect(slot))}
              // Qualquer ação em voo trava a grade inteira: trocar de horário com uma reserva a
              // caminho deixaria a tela mostrando uma escolha diferente da que foi enviada.
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityState={{ selected: selected, disabled: busy !== null }}
              accessibilityLabel={
                held
                  ? `Cancel the booking for ${slotLabel(slot)}`
                  : slotLabel(slot)
              }
            >
              <Text
                style={[
                  styles.pillLabel,
                  selected && styles.pillLabelSelected,
                  held && styles.pillLabelHeld,
                ]}
              >
                {slotLabel(slot)}
              </Text>
              {/* Diz que está segurado, nunca por quem: nome de quem reservou não entra aqui. */}
              {held ? (
                <Text style={styles.heldLabel}>Booked · tap to cancel</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
