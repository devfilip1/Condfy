import { Octicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/features/auth/hooks/useAuth";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import PrimaryButton from "@/shared/components/PrimaryButton";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * A tela de espera: o pedido de entrada foi enviado e ainda não foi respondido.
 *
 * É a ÚNICA tela que a conta alcança enquanto espera — o layout raiz manda para cá de qualquer
 * outra rota. A pessoa ainda não é moradora de lugar nenhum, então não há condomínio a mostrar
 * além do nome do que ela pediu (feature 016).
 *
 * Ninguém é avisado de nada: a resposta chega quando o perfil é relido — ao abrir o aplicativo, ao
 * trazê-lo para a frente, ou pelo botão daqui. Aprovada, esta tela some sozinha; rejeitada, a conta
 * deixa de existir e a pessoa cai na tela de entrar.
 *
 * Não tem botão de voltar: não há para onde. Tem o de sair, e o de desistir do pedido.
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 60,
      gap: 20,
    },
    summary: {
      alignItems: "center",
      gap: 12,
    },
    text: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textMuted,
    },
    request: {
      alignSelf: "stretch",
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 4,
    },
    condominium: {
      fontSize: 17,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    unit: {
      fontSize: 14,
      color: colors.textMuted,
    },
    link: {
      paddingVertical: 12,
      alignItems: "center",
    },
    linkLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    dangerLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.danger,
    },
  })
);

/** A unidade como a pessoa a lê, no mesmo formato do resto do aplicativo. */
function unitText(unit: { block: string | null; number: string }): string {
  return unit.block === null
    ? `Apt ${unit.number}`
    : `Block ${unit.block} · Apt ${unit.number}`;
}

export default function AwaitingApprovalScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { pendingRequest, refreshProfile, withdrawRequest, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const checkAgain = () => {
    if (checking) {
      return;
    }
    setChecking(true);
    void refreshProfile().finally(() => setChecking(false));
  };

  const withdraw = () => {
    if (withdrawing) {
      return;
    }
    setWithdrawing(true);
    setWithdrawError(null);
    void withdrawRequest().then((result) => {
      // No sucesso a sessão acabou e o layout raiz já levou à tela de entrar.
      setWithdrawing(false);
      if (!result.ok) {
        setWithdrawError(
          "message" in result ? result.message : "Couldn't cancel. Try again."
        );
      }
    });
  };

  return (
    <View style={styles.screen}>
      <HeaderModule name="Awaiting approval" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Octicons name="clock" size={56} color={colors.textMuted} />
          <Text style={styles.text}>
            Your request was sent. Whoever runs the condominium will confirm
            that you live there, and then the app opens for you.
          </Text>
        </View>

        {/* O perfil pode estar sendo relido: sem o pedido em mãos não há o que nomear. */}
        {pendingRequest ? (
          <View style={styles.request}>
            <Text style={styles.condominium}>
              {pendingRequest.condominium.name}
            </Text>
            <Text style={styles.unit}>{unitText(pendingRequest.unit)}</Text>
          </View>
        ) : null}

        <PrimaryButton
          label="Check again"
          busyLabel="Checking…"
          busy={checking}
          onPress={checkAgain}
        />

        <View>
          <TouchableOpacity
            style={styles.link}
            onPress={() => {
              setWithdrawError(null);
              setConfirming(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Cancel my request"
          >
            <Text style={styles.dangerLabel}>Cancel my request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.link}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.linkLabel}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dito antes de confirmar: desistir apaga a conta, e isso não volta. */}
      <ConfirmDialog
        visible={confirming}
        message="Cancel your request? Your account will be removed. You can sign up again at any time."
        confirmLabel="Cancel request"
        busyLabel="Cancelling…"
        busy={withdrawing}
        errorMessage={withdrawError}
        onConfirm={withdraw}
        onCancel={() => {
          if (!withdrawing) {
            setConfirming(false);
          }
        }}
      />
    </View>
  );
}
