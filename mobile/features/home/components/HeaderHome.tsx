import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ProfileUnit, useAuth } from "@/features/auth";
import { Colors } from "@/shared/constants/Colors";

export const styles = StyleSheet.create({
  container: {
    height: 100,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
  },
  settings: {
    position: "absolute",
    right: 20,
    top: 60,
  },
  unit: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "semibold",
    textTransform: "uppercase",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: Colors.textPrimary,
  },
});

/** `BV-1303`, ou só `1303` em condomínio sem blocos. */
function unitLabel(unit: ProfileUnit): string {
  return unit.block === null ? unit.number : `${unit.block}-${unit.number}`;
}

export default function HeaderHome() {
  const { state, profile, signOut } = useAuth();

  /**
   * Nome: vem do perfil quando ele chega, e do state da sessão enquanto não chega.
   *
   * Entrar agora devolve o usuário junto com as credenciais, então o nome aparece na hora; sessão
   * restaurada do aparelho não traz nome nem e-mail, e aí ele só surge com o `GET /me`. Em nenhum
   * dos dois casos a tela inventa um valor: vazio é melhor que errado.
   */
  const name =
    profile.status === "ready"
      ? profile.profile.name
      : state.status === "authenticated" && state.user
        ? state.user.name
        : "";

  /**
   * Todas as unidades onde a pessoa mora, de todos os condomínios dela. Normalmente é uma só;
   * quem mora em duas vê as duas, porque esconder uma seria mentir sobre onde ela mora.
   * Vazia para síndico e portaria, que têm vínculo sem moradia — e aí o cabeçalho mostra só o nome.
   */
  const units =
    profile.status === "ready"
      ? profile.profile.memberships.flatMap((membership) => membership.units)
      : [];

  const heading =
    units.length > 0
      ? `${name} - ${units.map(unitLabel).join(", ")}`
      : name;

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.unit}>Unit</Text>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {heading}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.settings}
        onPress={signOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons
          name="log-out-outline"
          size={35}
          color={Colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}
