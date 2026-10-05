import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import CommonAreaList from "@/features/reservations/components/CommonAreaList";
import CondominiumPicker from "@/shared/components/CondominiumPicker";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import { useCommonAreas } from "@/features/reservations/hooks/useCommonAreas";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import { Colors } from "@/shared/constants/Colors";

/**
 * Tela do módulo de Reservas: apenas composição.
 * Todo o state vem do hook `useCommonAreas` (constituição, Princípio I).
 */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
});

export default function ReservationsScreen() {
  const {
    state,
    condominiums,
    selectedCondominiumId,
    selectCondominium,
    reload,
  } = useCommonAreas();
  /** Local tocado, à espera do aviso. Reservar em si é de outra feature (FR-016). */
  const [tapped, setTapped] = useState<CommonArea | null>(null);

  return (
    <View style={styles.screen}>
      <HeaderModule name="Reservations" onBack={() => router.back()} />

      {/* Com um vínculo só não há o que escolher, e um seletor de uma opção seria ruído (FR-020). */}
      {condominiums.length > 1 ? (
        <CondominiumPicker
          condominiums={condominiums}
          selectedId={selectedCondominiumId}
          onSelect={selectCondominium}
        />
      ) : null}

      <CommonAreaList state={state} onSelect={setTapped} onRetry={reload} />

      {/*
        Confirmação própria em vez de `Alert.alert`, que não faz nada na web — é o motivo de
        `ConfirmDialog` existir. Um botão só: não há nada a confirmar, só a avisar (FR-015).
      */}
      <ConfirmDialog
        visible={tapped !== null}
        message={`${tapped?.name ?? ""}\n\nBooking is coming soon. For now you can only see what the condominium offers.`}
        confirmLabel="Got it"
        showCancel={false}
        tone="neutral"
        onConfirm={() => setTapped(null)}
        onCancel={() => setTapped(null)}
      />
    </View>
  );
}
