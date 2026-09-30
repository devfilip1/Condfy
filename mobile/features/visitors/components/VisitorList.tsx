import { FlatList, StyleSheet } from "react-native";

import EmptyState from "@/shared/components/EmptyState";
import VisitorCard from "@/features/visitors/components/VisitorCard";
import { Visitor } from "@/features/visitors/domain/visitor";

export interface VisitorListProps {
  /** Já ordenados pelo hook `useVisitors` — este componente não reordena. */
  visitors: Visitor[];
  onRemove: (visitor: Visitor) => void;
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

/** Lista rolável de cards, ou o state empty (FR-001, FR-013, FR-015). */
export default function VisitorList({
  visitors,
  onRemove,
}: VisitorListProps) {
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={visitors}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <VisitorCard visitor={item} onRemove={onRemove} />
      )}
      ListEmptyComponent={
        <EmptyState message="No visitors yet. Add the first one to get started." />
      }
    />
  );
}
