import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import CommonAreaFormModal from "@/features/reservations/components/CommonAreaFormModal";
import CommonAreaList from "@/features/reservations/components/CommonAreaList";
import OwnReservationList from "@/features/reservations/components/OwnReservationList";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import { useCommonAreas } from "@/features/reservations/hooks/useCommonAreas";
import { useOwnReservations } from "@/features/reservations/hooks/useOwnReservations";
import { slotLabel } from "@/features/reservations/domain/slot";
import AddButton from "@/shared/components/AddButton";
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
  const {
    state,
    canManage,
    photoUriOf,
    reload,
    canCreate,
    canBook,
    formOpen,
    formPhoto,
    formErrors,
    submitting,
    submitError,
    openForm,
    closeForm,
    pickPhoto,
    removePhoto,
    create,
  } = useCommonAreas();
  const ownReservations = useOwnReservations();
  /** O local indisponível que um morador acabou de tocar, enquanto o aviso está aberto. */
  const [unavailableTapped, setUnavailableTapped] = useState<CommonArea | null>(
    null
  );

  return (
    <View style={styles.screen}>
      <HeaderModule name="Reservations" onBack={() => router.back()} />

      {/*
        Tocar num local abre a tela de reserva; o condomínio em exibição vem do contexto de sessão,
        então a rota leva só o id do local.

        Um local indisponível continua na lista. Para o morador o toque abre um aviso em vez da
        tela; para o administrador abre a tela, porque é nela que o local é religado. Isto é
        cortesia: quem recusa de verdade é a rota, que responde 404 a um morador que chegue por
        outro caminho.
      */}
      <CommonAreaList
        state={state}
        onSelect={(area: CommonArea) => {
          if (area.isAvailable || canManage) {
            router.push(`/reservations/${area.id}`);
          } else {
            setUnavailableTapped(area);
          }
        }}
        photoUriOf={photoUriOf}
        onRetry={reload}
        // "Minhas reservas" só para quem reserva. O porteiro consulta os locais e os dias, e não
        // tem reserva própria para listar.
        footer={
          canBook ? (
            <OwnReservationList
              state={ownReservations.state}
              onRetry={ownReservations.reload}
              onCancel={ownReservations.askCancel}
            />
          ) : undefined
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

      {/*
        Criar um local é só do SÍNDICO — nem o administrador vê este botão. Isto é cortesia: quem
        recusa de verdade é a API, que responde 403 a quem chegar na rota por outro caminho. Só com
        o catálogo carregado: sem ele não há onde o local novo aparecer.
      */}
      {canCreate && state.status === "ready" ? (
        <AddButton onPress={openForm} accessibilityLabel="Add place" />
      ) : null}

      {canCreate ? (
        <CommonAreaFormModal
          visible={formOpen}
          errors={formErrors}
          photoPreviewUri={formPhoto?.previewUri ?? null}
          submitting={submitting}
          submitError={submitError}
          onTakePhoto={() => pickPhoto("camera")}
          onChoosePhoto={() => pickPhoto("gallery")}
          onRemovePhoto={removePhoto}
          onSubmit={create}
          onCancel={closeForm}
        />
      ) : null}

      {/* O `ConfirmDialog` em forma de aviso: um botão só, em tom neutro — não há o que recusar. */}
      <ConfirmDialog
        visible={unavailableTapped !== null}
        message={
          unavailableTapped === null
            ? ""
            : `${unavailableTapped.name} is unavailable right now.`
        }
        confirmLabel="Got it"
        tone="neutral"
        showCancel={false}
        onConfirm={() => setUnavailableTapped(null)}
        onCancel={() => setUnavailableTapped(null)}
      />
    </View>
  );
}
