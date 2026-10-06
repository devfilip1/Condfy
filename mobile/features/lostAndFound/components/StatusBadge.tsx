import { StyleSheet, Text, View } from "react-native";

import { FoundItemStatus } from "@/features/lostAndFound/domain/foundItem";
import { makeStyles } from "@/shared/theme";

/**
 * O status de um item, como etiqueta.
 *
 * Distingue os dois valores por TEXTO e por cor, nunca só por cor: quem não diferencia as duas
 * cores, ou vê a tela em preto e branco, lê "Found" ou "Returned" do mesmo jeito (FR-013).
 */

export interface StatusBadgeProps {
  status: FoundItemStatus;
}

const LABELS: Record<FoundItemStatus, string> = {
  found: "Found",
  returned: "Returned",
};

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    badge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    // À espera do dono: o realce do app, porque é o que ainda pede ação de alguém.
    found: {
      backgroundColor: colors.accentSoft,
    },
    // Resolvido: neutro, recua.
    returned: {
      backgroundColor: colors.chipBackground,
    },
    label: {
      fontSize: 12,
      fontWeight: "600",
    },
    foundLabel: {
      color: colors.textPrimary,
    },
    returnedLabel: {
      color: colors.textMuted,
    },
  })
);

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, styles[status]]}>
      <Text
        style={[
          styles.label,
          status === "found" ? styles.foundLabel : styles.returnedLabel,
        ]}
      >
        {LABELS[status]}
      </Text>
    </View>
  );
}
