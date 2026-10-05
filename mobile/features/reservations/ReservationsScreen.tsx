import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import CommonAreaList from "@/features/reservations/components/CommonAreaList";
import CondominiumPicker from "@/shared/components/CondominiumPicker";
import { CommonArea } from "@/features/reservations/domain/commonArea";
import { useCommonAreas } from "@/features/reservations/hooks/useCommonAreas";
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

      {/*
        Tocar num local abre a tela de reserva. Até a feature 007 isto abria um aviso de "em breve";
        o `ConfirmDialog` que o mostrava saiu junto, e o condomínio em exibição continua vindo do
        contexto de sessão, então a rota leva só o id do local.
      */}
      <CommonAreaList
        state={state}
        onSelect={(area: CommonArea) => router.push(`/reservations/${area.id}`)}
        onRetry={reload}
      />
    </View>
  );
}
