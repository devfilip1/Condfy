import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import CommonAreaList from "@/features/reservations/components/CommonAreaList";
import OwnReservationList from "@/features/reservations/components/OwnReservationList";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import { useCommonAreas } from "@/features/reservations/hooks/useCommonAreas";
import { useOwnReservations } from "@/features/reservations/hooks/useOwnReservations";
import { slotLabel } from "@/features/reservations/domain/slot";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import { makeStyles } from "@/shared/theme";
import { toDisplayDate } from "@/shared/lib/calendar";

/**
 * Tela do módulo de Reservas: apenas composição.
 * Todo o state vem dos hooks `useCommonAreas` e `useOwnReservations` (constituição, Princípio I).
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
  })
);

export default function ReservationsScreen() {
  const styles = useStyles();
  const { state, reload } = useCommonAreas();
  const ownReservations = useOwnReservations();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Reservations" onBack={() => router.back()} />

      {/*
        Tocar num local abre a tela de reserva. Até a feature 007 isto abria um aviso de "em breve";
        o `ConfirmDialog` que o mostrava saiu junto, e o condomínio em exibição continua vindo do
        contexto de sessão, então a rota leva só o id do local.
      */}
      <CommonAreaList
        state={state}
        onSelect={(area: CommonArea) => router.push(`/reservations/${area.id}`)}
        onRetry={reload}
        footer={
          <OwnReservationList
            state={ownReservations.state}
            onRetry={ownReservations.reload}
            onCancel={ownReservations.askCancel}
          />
        }
      />

      {/*
        Cancelar não tem volta: o registro é apagado e não fica histórico. O diálogo fica aberto
        enquanto o pedido está em voo e é nele que a recusa aparece.
      */}
      <ConfirmDialog
        visible={ownReservations.pendingCancel !== null}
        message={
          ownReservations.pendingCancel === null
            ? ""
            : `Cancel the booking of ${ownReservations.pendingCancel.commonArea.name} on ${toDisplayDate(ownReservations.pendingCancel.date)}, ${slotLabel(ownReservations.pendingCancel)}?\n\nThe time goes back to being available for everyone.`
        }
        confirmLabel="Cancel booking"
        busyLabel="Cancelling…"
        busy={ownReservations.cancelling}
        errorMessage={ownReservations.cancelError}
        onConfirm={ownReservations.confirmCancel}
        onCancel={ownReservations.dismissCancel}
      />
    </View>
  );
}
