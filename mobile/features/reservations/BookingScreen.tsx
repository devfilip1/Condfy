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

import AdminSwitch from "@/features/reservations/components/AdminSwitch";
import AvailabilityCalendar from "@/features/reservations/components/AvailabilityCalendar";
import DayBookings from "@/features/reservations/components/DayBookings";
import SlotGrid from "@/features/reservations/components/SlotGrid";
import { slotLabel } from "@/features/reservations/domain/slot";
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
 * De cima para baixo: a foto do local, o calendário, os horários livres do dia escolhido, os já
 * reservados desse dia e, fixo no fim da tela, o botão que conclui a reserva.
 *
 * O administrador vê mais duas coisas, nos lugares que a spec da feature 011 pede: um interruptor
 * ACIMA DE TUDO, que liga e desliga o local, e outro acima dos horários, que reserva o dia inteiro.
 * Os dois existem quando `canManage` veio `true` do servidor — a tela não confere cargo.
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
    availabilitySwitch: {
      marginBottom: 16,
    },
    wholeDaySwitch: {
      marginTop: 18,
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
    viewOnly: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      color: colors.textMuted,
    },
  })
);

export default function BookingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    state,
    canBook,
    selectDay,
    selectSlot,
    goToMonth,
    canGoToMonth,
    book,
    cancel,
    setAvailability,
    setWholeDay,
    reload,
  } = useBooking();
  /**
   * Reserva à espera da confirmação. O hook só é chamado depois do "sim". Serve às duas origens —
   * a pílula do próprio horário e, para o administrador, uma das reservas do dia — porque as duas
   * são a mesma ação e pedem a mesma confirmação.
   */
  const [pendingCancel, setPendingCancel] = useState<{
    startMinute: number;
    endMinute: number;
    reservationId?: string;
  } | null>(null);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  /** Para onde o interruptor de dia inteiro foi levado, à espera da confirmação. */
  const [pendingWholeDay, setPendingWholeDay] = useState<boolean | null>(null);

  const selectedDay =
    state.status === "ready" && state.selectedDate !== null
      ? state.days.get(state.selectedDate)
      : undefined;
  const slots = selectedDay?.slots ?? [];
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
            {/*
              Sem confirmação: desligar não apaga nada — as reservas ficam — e se desfaz com o mesmo
              toque. O valor é o que o servidor confirmou por último; o interruptor só muda quando a
              tela recarrega.
            */}
            {state.canManage ? (
              <View style={styles.availabilitySwitch}>
                <AdminSwitch
                  title="Available for booking"
                  description="While this is off, nobody can book this place. Existing bookings are kept."
                  value={state.commonArea.isAvailable}
                  onChange={setAvailability}
                  disabled={state.busy !== null}
                />
              </View>
            ) : null}

            <Photo
              uri={state.photoUri}
              cacheKey={state.commonArea.id}
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

            {/*
              Só com um dia escolhido: sem dia, não há o que o interruptor reservar. Com o local
              desligado ele não liga — local desligado não aceita reserva de ninguém —, mas continua
              podendo desligar, porque liberar nunca depende de disponibilidade.
            */}
            {state.canManage && selectedDay !== undefined ? (
              <View style={styles.wholeDaySwitch}>
                <AdminSwitch
                  title="Reserve the whole day"
                  description="Books every remaining time of this day in your name."
                  value={selectedDay.wholeDayHeld ?? false}
                  onChange={setPendingWholeDay}
                  disabled={
                    state.busy !== null ||
                    (!state.commonArea.isAvailable && !selectedDay.wholeDayHeld)
                  }
                />
              </View>
            ) : null}

            <SlotGrid
              date={state.selectedDate}
              slots={slots}
              selectedStartMinute={state.selectedStartMinute}
              busy={state.busy}
              notice={state.notice}
              unavailable={!state.commonArea.isAvailable}
              readOnly={!canBook}
              onSelect={selectSlot}
              onCancel={setPendingCancel}
            />

            {/* Sem `onCancel` para quem não é administrador: nenhuma pílula vira botão. */}
            <DayBookings
              date={state.selectedDate}
              booked={selectedDay?.booked ?? []}
              onCancel={state.canManage ? setPendingCancel : undefined}
              busy={state.busy !== null}
            />
          </ScrollView>

          {/*
            Fora do `ScrollView`: o botão fica no fim da TELA, não no fim do conteúdo. Com oito
            horários e o calendário, quem escolhesse um da primeira linha teria de rolar para achar
            como concluir. Fica sempre visível e desabilitado até haver horário escolhido, em vez de
            aparecer e sumir e fazer a lista mudar de altura.
          */}
          {canBook ? (
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
          ) : (
            // O porteiro consulta e não reserva: no lugar do botão, a frase que diz isso — para a
            // tela não parecer quebrada, com horários que não respondem ao toque.
            <View style={styles.footer}>
              <Text style={styles.viewOnly}>
                You can see which times are free. Booking is for residents and
                whoever runs the condominium.
              </Text>
            </View>
          )}
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

      {/*
        Ligar o dia inteiro cria reservas, desligar apaga — por isso os dois tons. Recuar aqui não
        precisa "voltar" o interruptor: ele mostra o valor salvo e nunca saiu do lugar.
      */}
      <ConfirmDialog
        visible={pendingWholeDay !== null}
        message={
          state.status !== "ready" ||
          state.selectedDate === null ||
          pendingWholeDay === null
            ? ""
            : pendingWholeDay
              ? `Reserve every remaining time of ${state.commonArea.name} on ${toDisplayDate(state.selectedDate)}?`
              : `Cancel all your bookings of ${state.commonArea.name} on ${toDisplayDate(state.selectedDate)}?\n\nThe times go back to being available for everyone.`
        }
        confirmLabel={pendingWholeDay ? "Reserve the day" : "Cancel bookings"}
        tone={pendingWholeDay ? "neutral" : "destructive"}
        onConfirm={() => {
          if (pendingWholeDay !== null) {
            setWholeDay(pendingWholeDay);
            setPendingWholeDay(null);
          }
        }}
        onCancel={() => setPendingWholeDay(null)}
      />
    </View>
  );
}
