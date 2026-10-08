import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/features/auth";
import AppearanceToggle from "@/features/settings/components/AppearanceToggle";
import SettingsRow from "@/features/settings/components/SettingsRow";
import { useAppearance } from "@/features/settings/hooks/useAppearance";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import { makeStyles } from "@/shared/theme";

/**
 * Tela de Configurações: apenas composição.
 *
 * Reúne o que é DA PESSOA, e não de um condomínio: os dados dela, o e-mail e a password, a
 * aparência do aplicativo, o suporte e a saída definitiva.
 *
 * A aparência não é uma tela: é um controle aqui mesmo, porque não tem formulário e vale na hora.
 * Sair da conta mora aqui desde a feature 017, na seção "Session": a barra de baixo, que o
 * guardava, deixou de existir. Continua pedindo confirmação.
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
  const { signOut } = useAuth();
  // O único state da tela: o diálogo de confirmação está aberto. Morava no layout das abas.
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

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

        {/*
          Sair fica separado de apagar a conta, e acima: é a ação comum, e não é destrutiva — a
          conta continua lá. Por isso o diálogo dela é neutro, e o de apagar é vermelho.
        */}
        <Text style={styles.section}>Session</Text>
        <SettingsRow
          icon="log-out-outline"
          label="Sign out"
          onPress={() => setConfirmingSignOut(true)}
        />

        <Text style={styles.section}>Danger zone</Text>
        <SettingsRow
          icon="trash-outline"
          label="Delete account"
          tone="danger"
          onPress={() => router.push("/settings/delete-account")}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmingSignOut}
        message="Sign out of your account?"
        confirmLabel="Sign out"
        tone="neutral"
        onConfirm={() => {
          setConfirmingSignOut(false);
          signOut();
        }}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </View>
  );
}
