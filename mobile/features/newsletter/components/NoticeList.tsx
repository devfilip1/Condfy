import { FlatList, StyleSheet } from "react-native";

import NoticeCard from "@/features/newsletter/components/NoticeCard";
import { Notice } from "@/features/newsletter/domain/notice";
import { BoardState } from "@/features/newsletter/hooks/useNotices";
import EmptyState from "@/shared/components/EmptyState";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";

/**
 * Lista do mural, com um state visível para cada situação.
 *
 * Componente puro: recebe o state já derivado pelo hook e callbacks, e não acessa serviço nem hook.
 * Os quatro caminhos do `switch` são exaustivos — é o que garante que nenhuma situação renderize
 * tela em branco (FR-011).
 */

export const MESSAGE_NO_NOTICES =
  "Nothing has been announced in this condominium yet.";
export const MESSAGE_NO_CONDOMINIUM =
  "You are not linked to a condominium yet. Ask the administrator to add you.";

export interface NoticeListProps {
  state: BoardState;
  onSelect: (notice: Notice) => void;
  onRetry: () => void;
}

export const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 14,
  },
});

export default function NoticeList({
  state,
  onSelect,
  onRetry,
}: NoticeListProps) {
  switch (state.status) {
    case "loading":
      return <LoadingState />;

    case "failed":
      return <LoadErrorState message={state.message} onRetry={onRetry} />;

    case "noCondominium":
      return <EmptyState message={MESSAGE_NO_CONDOMINIUM} />;

    case "ready":
      return (
        <FlatList
          data={state.notices}
          keyExtractor={(notice) => notice.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NoticeCard notice={item} onPress={onSelect} />
          )}
          ListEmptyComponent={<EmptyState message={MESSAGE_NO_NOTICES} />}
        />
      );
  }
}
