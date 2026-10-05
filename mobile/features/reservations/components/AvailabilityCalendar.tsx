import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import DayDot, { DayDotProps } from "@/features/reservations/components/DayDot";
import { DayAvailability } from "@/features/reservations/domain/slot";
import { Colors } from "@/shared/constants/Colors";
import {
  CalendarMonth,
  WEEKDAY_INITIALS,
  buildISODate,
  buildMonthGrid,
  monthLabel,
  todayISODate,
} from "@/shared/lib/calendar";

/**
 * O mês, com uma bolinha embaixo de cada day.
 *
 * Puro: recebe o mapa de dias e callbacks, não lê serviço nem navegação (Princípio II).
 *
 * Nenhuma aritmética de data própria — a grade sai de `buildMonthGrid` e o título de `monthLabel`,
 * que já existiam em `shared/lib/calendar` para o seletor de data dos visitantes. É o motivo de não
 * entrar biblioteca de calendário nenhuma: o que esta tela acrescenta a um mês é a bolinha e o day
 * desabilitado, que é apresentação, não cálculo de data (research R-007).
 *
 * **A regra de qual day é reservável é uma só: está no mapa ou não está.** O servidor manda apenas
 * os dias dentro da janela, então passado e "longe demais" chegam iguais aqui.
 */

export interface AvailabilityCalendarProps {
  month: CalendarMonth;
  /** Indexado por `YYYY-MM-DD`. Day fora do mapa não é reservável. */
  days: Map<string, DayAvailability>;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onChangeMonth: (offset: -1 | 1) => void;
  canChangeMonth: (offset: -1 | 1) => boolean;
}

const styles = StyleSheet.create({
  calendar: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: Colors.chipBackground,
  },
  monthButtonDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  week: {
    flexDirection: "row",
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  weekdayLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    color: Colors.textMuted,
  },
  dayCell: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTouchable: {
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 4,
  },
  daySelected: {
    backgroundColor: Colors.accent,
  },
  dayToday: {
    backgroundColor: Colors.accentSoft,
  },
  dayLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dayLabelDisabled: {
    color: Colors.textSecondary,
  },
});

/**
 * A cor da bolinha, derivada do que chegou: nada de mapa, nada de bolinha.
 *
 * Verde é "tem horário LIVRE", e não "tem horário na lista": um day em que esta pessoa já segura
 * todos os oito chega com oito itens e mesmo assim está cheio — ninguém mais consegue reservar nele,
 * ela inclusive (FR-006).
 */
function dotStateOf(
  day: DayAvailability | undefined
): DayDotProps["state"] {
  if (!day) {
    return "none";
  }
  return day.slots.some((slot) => slot.status === "open") ? "green" : "red";
}

export default function AvailabilityCalendar({
  month,
  days,
  selectedDate,
  onSelectDay,
  onChangeMonth,
  canChangeMonth,
}: AvailabilityCalendarProps) {
  const weeks = buildMonthGrid(month);
  const today = todayISODate();
  const canGoBack = canChangeMonth(-1);
  const canGoForward = canChangeMonth(1);

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.monthButton, !canGoBack && styles.monthButtonDisabled]}
          onPress={() => onChangeMonth(-1)}
          disabled={!canGoBack}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>{monthLabel(month)}</Text>

        <TouchableOpacity
          style={[
            styles.monthButton,
            !canGoForward && styles.monthButtonDisabled,
          ]}
          onPress={() => onChangeMonth(1)}
          disabled={!canGoForward}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.week}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <View key={`weekday-${index}`} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{initial}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (day === null) {
              return <View key={`blank-${dayIndex}`} style={styles.dayCell} />;
            }

            const date = buildISODate(month.year, month.month, day);
            const availability = days.get(date);
            const bookable = availability !== undefined;
            const selected = date === selectedDate;

            return (
              <View key={date} style={styles.dayCell}>
                <TouchableOpacity
                  style={[
                    styles.dayTouchable,
                    date === today && !selected && styles.dayToday,
                    selected && styles.daySelected,
                  ]}
                  onPress={() => onSelectDay(date)}
                  disabled={!bookable}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected, disabled: !bookable }}
                  accessibilityLabel={`${date}${
                    bookable
                      ? availability.slots.some((slot) => slot.status === "open")
                        ? `, ${availability.slots.filter((slot) => slot.status === "open").length} times available`
                        : ", fully booked"
                      : ", not available"
                  }`}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      !bookable && styles.dayLabelDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                  <DayDot state={dotStateOf(availability)} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
