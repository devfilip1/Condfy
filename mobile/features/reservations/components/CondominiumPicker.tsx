import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

import { Condominium } from "@/features/reservations/hooks/useCommonAreas";
import { Colors } from "@/shared/constants/Colors";

/**
 * Seletor do condomínio que o catálogo está mostrando.
 *
 * Componente puro: recebe a list e o escolhido por props e avisa a escolha por callback. Quem
 * decide se ele aparece é a tela — com um vínculo só não há o que escolher (FR-020).
 *
 * Também é o que responde "de qual prédio são estes locais?" sem a pessoa ter de lembrar (SC-008).
 */

export interface CondominiumPickerProps {
  condominiums: Condominium[];
  selectedId: string | null;
  onSelect: (condominiumId: string) => void;
}

export const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    // Sem isto os chips esticam até a altura do ScrollView e o raio 999 os transforma em elipses.
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.chipBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  label: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  labelSelected: {
    color: Colors.textPrimary,
    fontWeight: "bold",
  },
});

export default function CondominiumPicker({
  condominiums,
  selectedId,
  onSelect,
}: CondominiumPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // A faixa tem a altura dos chips e nada mais: sem isto ela toma o espaço vertical restante.
      style={styles.strip}
    >
      {condominiums.map((condominium) => {
        const selected = condominium.id === selectedId;
        return (
          <TouchableOpacity
            key={condominium.id}
            style={[styles.chip, selected ? styles.chipSelected : null]}
            onPress={() => onSelect(condominium.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show places of ${condominium.name}`}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {condominium.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
