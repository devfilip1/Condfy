import { StyleSheet, Text, View } from "react-native";

import { ProfileMembership, unitLabel } from "@/features/auth";
import { fontSizes, fonts, makeStyles, radius } from "@/shared/theme";

/**
 * Um vínculo da pessoa, como os dados pessoais o mostram: o condomínio, o cargo e as unidades.
 *
 * Componente puro: recebe o vínculo por props.
 *
 * **Aqui o cargo aparece SEMPRE**, inclusive "Resident" — ao contrário do card da escolha de
 * condomínio, que só mostra o cargo quando não é morador. Lá a pergunta é "em qual prédio eu entro";
 * aqui é "o que o sistema sabe sobre mim", e a resposta completa inclui o cargo comum.
 */

export interface MembershipSummaryProps {
  membership: ProfileMembership;
}

const ROLE_LABELS: Record<ProfileMembership["role"], string> = {
  resident: "Resident",
  admin: "Administrator",
  manager: "Manager",
  doorman: "Doorman",
};

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 4,
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    detail: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
  })
);

export default function MembershipSummary({
  membership,
}: MembershipSummaryProps) {
  const styles = useStyles();
  const role = ROLE_LABELS[membership.role];
  const units =
    membership.units.length === 0
      ? "No unit"
      : `${membership.units.length === 1 ? "Unit" : "Units"} ${membership.units
          .map(unitLabel)
          .join(", ")}`;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${membership.condominium.name}, ${role}, ${units}`}
    >
      <Text style={styles.name} numberOfLines={2}>
        {membership.condominium.name}
      </Text>
      <Text style={styles.detail}>{role}</Text>
      <Text style={styles.detail}>{units}</Text>
    </View>
  );
}
