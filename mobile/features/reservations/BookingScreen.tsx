import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import AvailabilityCalendar from "@/features/reservations/components/AvailabilityCalendar";
import SlotList from "@/features/reservations/components/SlotList";
import { Slot, slotLabel } from "@/features/reservations/domain/slot";
import { useBooking } from "@/features/reservations/hooks/useBooking";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { Colors } from "@/shared/constants/Colors";
import { formatCurrency } from "@/shared/lib/currency";

/**
 * Tela de reserva de um local: apenas composição.
 * Todo o state vem do hook `useBooking` (constituição, Princípio I).
 *
 * Sem `useAuth` aqui: leitura de state de sessão é do hook. O catálogo aprendeu isso quando o
 * `ModuleList` da home foi buscar o perfil por dentro.
 */

const TITLE_FALLBACK = "Booking";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
  content: {
    paddingBottom: 60,
  },
  fee: {
    marginHorizontal: 20,
    fontSize: 14,
    color: Colors.textMuted,
  },
});

export default function BookingScreen() {
  const { state, selectDay, goToMonth, canGoToMonth, book, cancel, reload } =
    useBooking();
  /** Horário à espera da confirmação. O hook só é chamado depois do "sim". */
  const [pendingCancel, setPendingCancel] = useState<Slot | null>(null);

  return (
    <View style={styles.screen}>
      <HeaderModule
        name={state.status === "ready" ? state.commonArea.name : TITLE_FALLBACK}
        onBack={() => router.back()}
      />

      {state.status === "loading" ? <LoadingState /> : null}

      {state.status === "failed" ? (
        <LoadErrorState message={state.message} onRetry={reload} />
      ) : null}

      {state.status === "ready" ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* A taxa é exibida, nunca cobrada: o sistema não processa pagamento em lugar nenhum. */}
          <Text style={styles.fee}>
            Tax usage: {formatCurrency(state.commonArea.usageFee)}
          </Text>

          <AvailabilityCalendar
            month={state.month}
            days={state.days}
            selectedDate={state.selectedDate}
            onSelectDay={selectDay}
            onChangeMonth={goToMonth}
            canChangeMonth={canGoToMonth}
          />

          <SlotList
            date={state.selectedDate}
            slots={
              state.selectedDate === null
                ? []
                : (state.days.get(state.selectedDate)?.slots ?? [])
            }
            busy={state.busy}
            notice={state.notice}
            onBook={book}
            onCancel={setPendingCancel}
          />
        </ScrollView>
      ) : null}

      {/*
        Cancelar não tem volta: o registro é apagado e não fica histórico (FR-028). A confirmação é
        própria em vez de `Alert.alert`, que não faz nada na web — é o motivo de `ConfirmDialog`
        existir.
      */}
      <ConfirmDialog
        visible={pendingCancel !== null}
        message={
          pendingCancel === null
            ? ""
            : `Cancel the booking for ${slotLabel(pendingCancel)}?\n\nThe time goes back to being available for everyone.`
        }
        confirmLabel="Cancel booking"
        onConfirm={() => {
          if (pendingCancel !== null) {
            cancel(pendingCancel);
            setPendingCancel(null);
          }
        }}
        onCancel={() => setPendingCancel(null)}
      />
    </View>
  );
}
