import { FlatList, StyleSheet } from "react-native";

import EmptyState from "@/shared/components/EmptyState";
import VisitorCard from "@/features/visitors/components/VisitorCard";
import { Visitante } from "@/features/visitors/domain/visitante";

export interface VisitorListProps {
  /** Já ordenados pelo hook `useVisitantes` — este componente não reordena. */
  visitantes: Visitante[];
  onRemove: (visitante: Visitante) => void;
}

export const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 180,
  },
});

/** Lista rolável de cards, ou o estado vazio (FR-001, FR-013, FR-015). */
export default function VisitorList({
  visitantes,
  onRemove,
}: VisitorListProps) {
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={visitantes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <VisitorCard visitante={item} onRemove={onRemove} />
      )}
      ListEmptyComponent={
        <EmptyState message="No visitors yet. Add the first one to get started." />
      }
    />
  );
}
