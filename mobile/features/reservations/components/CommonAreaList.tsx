import { ReactElement } from "react";
import { FlatList, StyleSheet } from "react-native";

import { CommonArea } from "@/features/reservations/domain/commonArea";
import { CatalogueState } from "@/features/reservations/hooks/useCommonAreas";
import CommonAreaCard from "@/features/reservations/components/CommonAreaCard";
import EmptyState from "@/shared/components/EmptyState";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";

/**
 * Lista do catálogo, com um state visível para cada situação.
 *
 * Componente puro: recebe o state já derivado pelo hook e callbacks, e não acessa serviço nem
 * hook (constituição, Princípio II). Os quatro caminhos do `switch` são exaustivos — é o que
 * garante que nenhuma situação renderize tela em branco (FR-010).
 */

export const MESSAGE_NO_PLACES = "This condominium has no places to book yet.";
export const MESSAGE_NO_CONDOMINIUM =
  "You are not linked to a condominium yet. Ask the manager to add you.";

export interface CommonAreaListProps {
  state: CatalogueState;
  onSelect: (area: CommonArea) => void;
  /** O endereço completo da foto de um local. Vem do hook, que é quem conhece o endereço da API. */
  photoUriOf: (area: CommonArea) => string | null;
  onRetry: () => void;
  /**
   * O que vem embaixo dos locais, rolando junto com eles. Só aparece com o catálogo carregado: nos
   * outros três states a tela inteira já é uma message.
   */
  footer?: ReactElement;
}

export const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 14,
  },
});

export default function CommonAreaList({
  state,
  onSelect,
  photoUriOf,
  onRetry,
  footer,
}: CommonAreaListProps) {
  switch (state.status) {
    case "loading":
      return <LoadingState />;

    case "failed":
      return <LoadErrorState message={state.message} onRetry={onRetry} />;

    case "noCondominium":
      return <EmptyState message={MESSAGE_NO_CONDOMINIUM} />;

    case "ready":
      // Lista vazia é "o condomínio não tem local cadastrado", nunca um erro. Deixou de ser o que a
      // pessoa vê quando todos estão desligados: local desligado continua na lista, apagado.
      return (
        <FlatList
          data={state.areas}
          keyExtractor={(area) => area.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CommonAreaCard
              area={item}
              photoUri={photoUriOf(item)}
              onPress={onSelect}
            />
          )}
          ListEmptyComponent={<EmptyState message={MESSAGE_NO_PLACES} />}
          ListFooterComponent={footer}
        />
      );
  }
}
