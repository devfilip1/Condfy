import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { STAFF_ROLE_LABELS, StaffMember } from "@/features/staff/domain/staff";
import { makeStyles } from "@/shared/theme";

/**
 * Card de uma pessoa com cargo: nome, e-mail, o cargo e, quando for o caso, o aviso de que ela
 * ainda não entrou.
 *
 * Componente puro: recebe dados e callback por props (constituição, Princípio II).
 *
 * O nome é o DA PESSOA. Em todo o resto do aplicativo o administrador aparece como
 * "Administrator"; aqui não, porque é a única forma de o síndico saber quem é quem.
 */

export interface StaffCardProps {
  member: StaffMember;
  onPress: (member: StaffMember) => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 6,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    name: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    role: {
      backgroundColor: colors.chipBackground,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    roleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    email: {
      fontSize: 14,
      color: colors.textMuted,
    },
    pending: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
  })
);

export default function StaffCard({ member, onPress }: StaffCardProps) {
  const styles = useStyles();
  const role = STAFF_ROLE_LABELS[member.role];
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(member)}
      accessibilityRole="button"
      accessibilityLabel={`${member.name}, ${role}${
        member.passwordIsProvisional ? ", has not signed in yet" : ""
      }`}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {member.name}
        </Text>
        <View style={styles.role}>
          <Text style={styles.roleLabel}>{role}</Text>
        </View>
      </View>

      <Text style={styles.email} numberOfLines={1} ellipsizeMode="middle">
        {member.email}
      </Text>

      {member.passwordIsProvisional ? (
        <Text style={styles.pending}>Has not signed in yet</Text>
      ) : null}
    </TouchableOpacity>
  );
}
