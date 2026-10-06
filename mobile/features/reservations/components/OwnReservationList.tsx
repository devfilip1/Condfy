import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import OwnReservationCard from "@/features/reservations/components/OwnReservationCard";
import { OwnReservation } from "@/features/reservations/domain/reservation";
import { OwnReservationsState } from "@/features/reservations/hooks/useOwnReservations";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * A seção "minhas reservas", que fica embaixo dos locais.
 *
 * Componente puro: recebe o state já derivado pelo hook e o callback de tentar de novo
 * (constituição, Princípio II).
 *
 * Os três states são compactos de propósito, em vez de reusar `LoadingState`, `LoadErrorState` e
 * `EmptyState`: aqueles ocupam o lugar de uma tela, e esta seção divide a tela com o catálogo. Uma
 * falha aqui é uma linha com "tentar de novo", não meia tela de aviso embaixo de locais que
 * carregaram bem.
 */

export const MESSAGE_NO_RESERVATIONS = "You have no bookings yet.";

export interface OwnReservationListProps {
  state: OwnReservationsState;
  onRetry: () => void;
  onCancel: (reservation: OwnReservation) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    section: {
      marginTop: 14,
      gap: 14,
    },
    heading: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      textTransform: "uppercase",
    },
    hint: {
      fontSize: 14,
      color: colors.textMuted,
    },
    retry: {
      alignSelf: "flex-start",
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    retryText: {
      fontSize: 15,
      fontWeight: "bold",
      color: colors.textOnAccent,
    },
    loading: {
      alignSelf: "flex-start",
    },
  })
);

/**
 * O miolo da seção. É um componente, e não uma função solta, porque precisa dos estilos e da
 * paleta em uso — e esses vêm de hooks.
 */
function Content({ state, onRetry, onCancel }: OwnReservationListProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  switch (state.status) {
    case "loading":
      return (
        <ActivityIndicator
          style={styles.loading}
          size="small"
          color={colors.accent}
          accessibilityLabel="Loading"
        />
      );

    case "failed":
      return (
        <>
          <Text style={styles.hint}>{state.message}</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </>
      );

    case "ready":
      if (state.reservations.length === 0) {
        return <Text style={styles.hint}>{MESSAGE_NO_RESERVATIONS}</Text>;
      }
      return state.reservations.map((reservation) => (
        <OwnReservationCard
          key={reservation.id}
          reservation={reservation}
          onCancel={onCancel}
        />
      ));
  }
}

export default function OwnReservationList(props: OwnReservationListProps) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header">
        My bookings
      </Text>
      <Content {...props} />
    </View>
  );
}
