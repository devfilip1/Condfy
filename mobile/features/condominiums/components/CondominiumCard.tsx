import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ProfileMembership } from "@/features/auth";
import {
  roleLabel,
  unitsLine,
} from "@/features/condominiums/domain/membership";
import Photo from "@/shared/components/Photo";
import { makeStyles } from "@/shared/theme";

/**
 * Card de um condomínio na tela de escolha: a foto, o nome, onde a pessoa mora nele e o cargo dela
 * ali — este último só quando não é moradora.
 *
 * Componente puro: recebe o vínculo e o callback por props e não acessa serviço, storage nem
 * navegação (constituição, Princípio II).
 *
 * **A linha de unidade e o rótulo de cargo podem não existir, e aí não existem mesmo** — nem
 * vazios, nem com traço. Quem decide é `unitsLine` e `roleLabel`, que devolvem `null`.
 */

/** Altura fixa: a foto ausente, lenta ou quebrada ocupa o mesmo espaço (FR-013). */
const PHOTO_HEIGHT = 140;

export interface CondominiumCardProps {
  membership: ProfileMembership;
  /** É o condomínio em que a pessoa já está. Só acontece ao trocar a partir da home. */
  current?: boolean;
  onPress: (condominiumId: string) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      // Para a foto herdar os cantos de cima do card sem repetir o raio nela.
      overflow: "hidden",
    },
    // A borda engrossa junto com a cor: quem não distingue a cor ainda vê a diferença, e o rótulo
    // "Current" a diz por escrito.
    cardCurrent: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    photo: {
      width: "100%",
      height: PHOTO_HEIGHT,
    },
    body: {
      padding: 15,
      gap: 6,
    },
    heading: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    name: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
      textTransform: "uppercase",
    },
    current: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    units: {
      fontSize: 14,
      color: colors.textMuted,
    },
    role: {
      alignSelf: "flex-start",
      marginTop: 2,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    roleText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  })
);

export default function CondominiumCard({
  membership,
  current = false,
  onPress,
}: CondominiumCardProps) {
  const styles = useStyles();
  const { condominium } = membership;
  const units = unitsLine(membership.units);
  const role = roleLabel(membership.role);

  const label = [condominium.name, units, role, current ? "current" : null]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <TouchableOpacity
      style={[styles.card, current && styles.cardCurrent]}
      onPress={() => onPress(condominium.id)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: current }}
    >
      <Photo uri={condominium.imageUrl} style={styles.photo} iconSize={40} />

      <View style={styles.body}>
        <View style={styles.heading}>
          {/* Duas linhas no máximo: nome comprido quebra sem empurrar o resto para fora. */}
          <Text style={styles.name} numberOfLines={2}>
            {condominium.name}
          </Text>
          {current ? <Text style={styles.current}>Current</Text> : null}
        </View>

        {units !== null ? <Text style={styles.units}>{units}</Text> : null}

        {role !== null ? (
          <View style={styles.role}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
