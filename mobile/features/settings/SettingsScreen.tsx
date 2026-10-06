import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import AppearanceToggle from "@/features/settings/components/AppearanceToggle";
import SettingsRow from "@/features/settings/components/SettingsRow";
import { useAppearance } from "@/features/settings/hooks/useAppearance";
import HeaderModule from "@/shared/components/HeaderModule";
import { makeStyles } from "@/shared/theme";

/**
 * Tela de Configurações: apenas composição.
 *
 * Reúne o que é DA PESSOA, e não de um condomínio: os dados dela, o e-mail e a password, a
 * aparência do aplicativo, o suporte e a saída definitiva.
 *
 * A aparência não é uma tela: é um controle aqui mesmo, porque não tem formulário e vale na hora.
 * Sair da conta não está aqui — foi para a barra de baixo, ao lado da Home.
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 60,
      gap: 12,
    },
    section: {
      marginTop: 12,
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: colors.textMuted,
    },
  })
);

export default function SettingsScreen() {
  const styles = useStyles();
  const { scheme, setAppearance } = useAppearance();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Settings" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Account</Text>
        <SettingsRow
          icon="person-outline"
          label="Personal data"
          onPress={() => router.push("/settings/personal-data")}
        />
        <SettingsRow
          icon="mail-outline"
          label="Change e-mail"
          onPress={() => router.push("/settings/email")}
        />
        <SettingsRow
          icon="lock-closed-outline"
          label="Change password"
          onPress={() => router.push("/settings/password")}
        />

        <Text style={styles.section}>Appearance</Text>
        <AppearanceToggle scheme={scheme} onChange={setAppearance} />

        <Text style={styles.section}>Help</Text>
        <SettingsRow
          icon="help-buoy-outline"
          label="Support"
          onPress={() => router.push("/settings/support")}
        />

        <Text style={styles.section}>Danger zone</Text>
        <SettingsRow
          icon="trash-outline"
          label="Delete account"
          tone="danger"
          onPress={() => router.push("/settings/delete-account")}
        />
      </ScrollView>
    </View>
  );
}
