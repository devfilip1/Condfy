import { FlatList, StyleSheet, Text, View } from "react-native";

import FoundItemCard from "@/features/lostAndFound/components/FoundItemCard";
import { FoundItem } from "@/features/lostAndFound/domain/foundItem";
import { ShelfState } from "@/features/lostAndFound/hooks/useFoundItems";
import EmptyState from "@/shared/components/EmptyState";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";

/**
 * A prateleira, com um state visível para cada situação.
 *
 * Componente puro: recebe o state já derivado pelo hook e callbacks, e não acessa serviço nem hook.
 * Os quatro caminhos do `switch` são exaustivos — é o que garante que nenhuma situação renderize
 * tela em branco (FR-017).
 */

export const MESSAGE_NOTHING_FOUND = "Nothing has been found yet.";
export const MESSAGE_NO_CONDOMINIUM =
  "You are not linked to a condominium yet. Ask the administrator to add you.";

export interface FoundItemListProps {
  state: ShelfState;
  onRetry: () => void;
  /** O endereço completo da foto de um item. Vem do hook, que é quem conhece o endereço da API. */
  photoUriOf: (item: FoundItem) => string;
  /** Tocar num card abre a foto dele sozinha. */
  onOpenPhoto: (item: FoundItem) => void;
  /** Ausente para quem não pode trocar o status: os cards ficam sem botão. */
  onToggleStatus?: (item: FoundItem) => void;
  /** O id do item cuja troca está em voo, ou `null`. */
  changingId: string | null;
  /** Recusa de uma troca de status, mostrada acima da lista. */
  notice: string | null;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 120,
      gap: 14,
    },
    notice: {
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noticeText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
  })
);

export default function FoundItemList({
  state,
  onRetry,
  photoUriOf,
  onOpenPhoto,
  onToggleStatus,
  changingId,
  notice,
}: FoundItemListProps) {
  const styles = useStyles();
  switch (state.status) {
    case "loading":
      return <LoadingState />;

    case "failed":
      return <LoadErrorState message={state.message} onRetry={onRetry} />;

    case "noCondominium":
      return <EmptyState message={MESSAGE_NO_CONDOMINIUM} />;

    case "ready":
      // Lista vazia é "nada foi encontrado ainda", nunca um erro.
      return (
        <FlatList
          data={state.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            notice !== null ? (
              <View style={styles.notice} accessibilityRole="alert">
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <FoundItemCard
              item={item}
              photoUri={photoUriOf(item)}
              onOpenPhoto={onOpenPhoto}
              onToggleStatus={onToggleStatus}
              changing={item.id === changingId}
              disabled={changingId !== null}
            />
          )}
          ListEmptyComponent={<EmptyState message={MESSAGE_NOTHING_FOUND} />}
        />
      );
  }
}
