import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AvailabilityCalendar from "@/features/reservations/components/AvailabilityCalendar";
import SlotGrid from "@/features/reservations/components/SlotGrid";
import { Slot, slotLabel } from "@/features/reservations/domain/slot";
import { useBooking } from "@/features/reservations/hooks/useBooking";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import Photo from "@/shared/components/Photo";
import { makeStyles, useTheme } from "@/shared/theme";
import { toDisplayDate } from "@/shared/lib/calendar";
import { formatCurrency } from "@/shared/lib/currency";

/**
 * Tela de reserva de um local: apenas composição.
 * Todo o state vem do hook `useBooking` (constituição, Princípio I).
 *
 * De cima para baixo: a foto do local, o calendário, os horários do dia escolhido e, fixo no fim da
 * tela, o botão que conclui a reserva.
 *
 * Sem `useAuth` aqui: leitura de state de sessão é do hook. O catálogo aprendeu isso quando o
 * `ModuleList` da home foi buscar o perfil por dentro.
 */

const TITLE_FALLBACK = "Booking";
const PHOTO_HEIGHT = 180;

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    content: {
      paddingBottom: 24,
    },
    // Altura fixa: a foto ausente, lenta ou quebrada ocupa o mesmo espaço, então o calendário não
    // pula quando ela chega.
    photo: {
      marginHorizontal: 20,
      height: PHOTO_HEIGHT,
      borderRadius: 16,
    },
    fee: {
      marginHorizontal: 20,
      marginTop: 12,
      fontSize: 14,
      color: colors.textMuted,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 30,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    confirmButton: {
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    confirmButtonDisabled: {
      opacity: 0.45,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textOnAccent,
    },
  })
);

export default function BookingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    state,
    selectDay,
    selectSlot,
    goToMonth,
    canGoToMonth,
    book,
    cancel,
    reload,
  } = useBooking();
  /** Horário à espera da confirmação. O hook só é chamado depois do "sim". */
  const [pendingCancel, setPendingCancel] = useState<Slot | null>(null);
  const [confirmingBooking, setConfirmingBooking] = useState(false);

  const slots =
    state.status === "ready" && state.selectedDate !== null
      ? (state.days.get(state.selectedDate)?.slots ?? [])
      : [];
  const selectedSlot =
    state.status === "ready"
      ? (slots.find(
          (slot) =>
            slot.status === "open" &&
            slot.startMinute === state.selectedStartMinute
        ) ?? null)
      : null;
  const booking = state.status === "ready" && state.busy?.kind === "booking";

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
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Photo
              uri={state.commonArea.imageUrl}
              style={styles.photo}
              iconSize={40}
              accessibilityLabel={`Photo of ${state.commonArea.name}`}
            />

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

            <SlotGrid
              date={state.selectedDate}
              slots={slots}
              selectedStartMinute={state.selectedStartMinute}
              busy={state.busy}
              notice={state.notice}
              onSelect={selectSlot}
              onCancel={setPendingCancel}
            />
          </ScrollView>

          {/*
            Fora do `ScrollView`: o botão fica no fim da TELA, não no fim do conteúdo. Com oito
            horários e o calendário, quem escolhesse um da primeira linha teria de rolar para achar
            como concluir. Fica sempre visível e desabilitado até haver horário escolhido, em vez de
            aparecer e sumir e fazer a lista mudar de altura.
          */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (selectedSlot === null || state.busy !== null) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={() => setConfirmingBooking(true)}
              disabled={selectedSlot === null || state.busy !== null}
              accessibilityRole="button"
              accessibilityState={{
                disabled: selectedSlot === null || state.busy !== null,
                busy: booking,
              }}
            >
              {booking ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* Mesmo `ConfirmDialog` do cancelamento, em tom neutro: reservar não apaga nada. */}
      <ConfirmDialog
        visible={confirmingBooking && selectedSlot !== null}
        message={
          state.status !== "ready" ||
          state.selectedDate === null ||
          selectedSlot === null
            ? ""
            : `Book ${state.commonArea.name} on ${toDisplayDate(state.selectedDate)}, ${slotLabel(selectedSlot)}?`
        }
        confirmLabel="Confirm"
        tone="neutral"
        onConfirm={() => {
          setConfirmingBooking(false);
          book();
        }}
        onCancel={() => setConfirmingBooking(false)}
      />

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
