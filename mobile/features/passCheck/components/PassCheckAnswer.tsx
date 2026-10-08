import { Octicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  OUTCOME_TEXT,
  Outcome,
  PassCheck,
  VISIT_TYPE_LABELS,
  outcomeDetail,
  unitText,
} from "@/features/passCheck/domain/passCheck";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

/**
 * A resposta de UMA conferência: o resultado, o que ele quer dizer e — quando há — a visita.
 *
 * Componente puro: recebe a resposta e o callback por props (constituição, Princípio II).
 *
 * **"Válido" não pode depender de cor.** Cada um dos quatro resultados tem o próprio SÍMBOLO e as
 * próprias PALAVRAS; a cor só reforça. Um porteiro daltônico, ou com o sol batendo na tela, lê a
 * mesma coisa (FR-018). Os textos vêm sempre da paleta em uso, então valem nas duas aparências.
 */

export interface PassCheckAnswerProps {
  check: PassCheck;
  onScanAgain: () => void;
}

type IconName = React.ComponentProps<typeof Octicons>["name"];

const OUTCOME_ICON: Record<Outcome, IconName> = {
  valid: "check-circle-fill",
  notYet: "clock",
  expired: "x-circle-fill",
  notRecognised: "question",
};

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 60,
      gap: 20,
    },
    result: {
      alignItems: "center",
      gap: 10,
    },
    outcome: {
      fontSize: fontSizes.display,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    detail: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textMuted,
    },
    visit: {
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 4,
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textPrimary,
    },
    line: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
  })
);

export default function PassCheckAnswer({
  check,
  onScanAgain,
}: PassCheckAnswerProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  // Verde só para "válido". "Ainda não" é neutro — não é uma recusa, é o dia errado.
  const tone =
    check.outcome === "valid"
      ? colors.successStrong
      : check.outcome === "notYet"
        ? colors.textMuted
        : colors.danger;

  const visit = check.outcome === "notRecognised" ? null : check.visit;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.result} accessibilityRole="alert">
        <Octicons name={OUTCOME_ICON[check.outcome]} size={72} color={tone} />
        <Text style={styles.outcome}>{OUTCOME_TEXT[check.outcome]}</Text>
        <Text style={styles.detail}>{outcomeDetail(check)}</Text>
      </View>

      {/*
        "Não reconhecido" não traz visita nenhuma, de propósito: código inexistente, visita
        removida e visita de outro condomínio recebem a mesma resposta, sem nada que as distinga.
      */}
      {visit ? (
        <View style={styles.visit}>
          <Text style={styles.name}>{visit.name}</Text>
          <Text style={styles.line}>{VISIT_TYPE_LABELS[visit.type]}</Text>
          <Text style={styles.line}>{unitText(visit.unit)}</Text>
          <Text style={styles.line}>Authorized by {visit.authorizedBy.name}</Text>
        </View>
      ) : null}

      <PrimaryButton
        label="Check another pass"
        busyLabel="Check another pass"
        busy={false}
        onPress={onScanAgain}
      />
    </ScrollView>
  );
}
