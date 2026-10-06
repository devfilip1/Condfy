import { Octicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { StyleSheet } from "react-native";

import { useAuth } from "@/features/auth";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { makeStyles, useTheme } from "@/shared/theme";

const ICON_SIZE = 28;

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    tabBar: {
      position: "absolute",
      bottom: 20,
      marginHorizontal: "20%",
      paddingTop: 6,
      paddingBottom: 6,
      borderRadius: 23,
      height: 70,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: "0px 4px 5px rgba(0, 0, 0, 0.1)",
    },
    // Cada entrada ocupa metade da barra. Sem isto elas ficam da largura do ícone, e "Sign out" não
    // cabe embaixo dele.
    item: {
      flex: 1,
    },
    // A caixa do ícone tem de ter o tamanho do ícone. A padrão é mais baixa que ele, e o que sobra
    // para fora é cortado e fica por cima do rótulo.
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
    },
    // Altura de linha explícita: sem ela a caixa do rótulo fica da altura da fonte e corta a
    // parte de baixo das letras.
    label: {
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
    cena: {
      backgroundColor: colors.screenBackground,
    },
  })
);

/**
 * Navegador de abas do grupo `(tabs)`.
 *
 * São duas entradas na barra, e só a primeira é uma tela. **"Sign out" não navega**: o toque é
 * interceptado, um diálogo confirma, e só então a sessão termina. Até a feature 010 sair ficava no
 * topo da home, sem confirmação; numa barra onde o polegar descansa, um toque sem querer encerraria
 * a sessão (FR-004). O arquivo `sign-out.tsx` existe só para a aba existir.
 */
export default function TabsLayout() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.item,
          tabBarIconStyle: styles.icon,
          tabBarLabelStyle: styles.label,
          // Sempre embaixo do ícone: numa tela larga o padrão é ao lado, e a barra é estreita.
          tabBarLabelPosition: "below-icon",
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          sceneStyle: styles.cena,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Octicons name="home" size={ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sign-out"
          options={{
            title: "Sign out",
            tabBarAccessibilityLabel: "Sign out",
            tabBarIcon: ({ color }) => (
              <Octicons name="sign-out" size={ICON_SIZE} color={color} />
            ),
          }}
          listeners={{
            tabPress: (event) => {
              // Sem isto a aba abriria a tela vazia de `sign-out.tsx`.
              event.preventDefault();
              setConfirmando(true);
            },
          }}
        />
      </Tabs>

      <ConfirmDialog
        visible={confirmando}
        message="Sign out of your account?"
        confirmLabel="Sign out"
        tone="neutral"
        onConfirm={() => {
          setConfirmando(false);
          signOut();
        }}
        onCancel={() => setConfirmando(false)}
      />
    </>
  );
}
