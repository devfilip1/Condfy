import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { unitLabel, useAuth } from "@/features/auth";
import { fontSizes, fonts, makeStyles, useTheme } from "@/shared/theme";

/** O mesmo texto de `server/src/lib/displayName.ts`. Mudou um? Mude o outro. */
const ADMINISTRATOR_DISPLAY_NAME = "Administrator";
const MANAGER_DISPLAY_NAME = "Manager";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      height: 110,
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
      fontSize: fontSizes.label,
      color: colors.textSecondary,
      fontFamily: fonts.semibold,
      textTransform: "uppercase",
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      textTransform: "uppercase",
      color: colors.textPrimary,
    },
  })
);

export default function HeaderHome() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, profile, currentMembership } = useAuth();

  /**
   * Nome: vem do perfil quando ele chega, e do state da sessão enquanto não chega.
   *
   * Entrar agora devolve o usuário junto com as credenciais, então o nome aparece na hora; sessão
   * restaurada do aparelho não traz nome nem e-mail, e aí ele só surge com o `GET /me`. Em nenhum
   * dos dois casos a tela inventa um valor: vazio é melhor que errado.
   */
  const accountName =
    profile.status === "ready"
      ? profile.profile.name
      : state.status === "authenticated" && state.user
        ? state.user.name
        : "";

  /**
   * No condomínio que a pessoa administra, ela aparece como "Administrator" — e no que ela criou,
   * como síndica, "Manager" —, e não com o nome pessoal. É o mesmo nome que os outros veem em quem
   * liberou uma visita ou publicou um aviso, que o servidor já manda assim. O cargo é por condomínio: trocar para um prédio onde ela é
   * moradora traz o nome dela de volta. O nome da conta continua nas configurações.
   */
  const name =
    currentMembership?.role === "admin"
      ? ADMINISTRATOR_DISPLAY_NAME
      : currentMembership?.role === "manager"
        ? MANAGER_DISPLAY_NAME
        : accountName;

  /**
   * As unidades onde a pessoa mora NO CONDOMÍNIO EM QUE ELA ESTÁ. Normalmente é uma só; quem mora
   * em duas do mesmo condomínio vê as duas. Até a feature 009 eram as de todos os condomínios
   * dela — e aí a unidade de um prédio aparecia ao lado da foto de outro.
   *
   * Vazia para o administrador e para o síndico, que têm vínculo sem moradia — e aí o cabeçalho mostra só o nome.
   */
  const units = currentMembership?.units ?? [];

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
      {/*
        Até a feature 010 este era o botão de sair. Hoje é a entrada das configurações — e, desde a
        feature 017, é por elas que se sai: a barra de baixo, que guardou o botão nesse meio-tempo,
        deixou de existir.
      */}
      <TouchableOpacity
        style={styles.settings}
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons
          name="settings-outline"
          size={35}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
}
