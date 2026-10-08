import { Redirect, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import CameraBlocked from "@/features/passCheck/components/CameraBlocked";
import PassCheckAnswer from "@/features/passCheck/components/PassCheckAnswer";
import PassScanner from "@/features/passCheck/components/PassScanner";
import { usePassCheck } from "@/features/passCheck/hooks/usePassCheck";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";

/**
 * Tela de conferência de comprovante: apenas composição.
 * Todo o state vem do hook `usePassCheck` (constituição, Princípio I).
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    body: {
      flex: 1,
    },
    checking: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.overlay,
    },
    checkingLabel: {
      fontSize: 17,
      fontWeight: "bold",
      color: colors.textOnOverlay,
    },
  })
);

export default function PassCheckScreen() {
  const styles = useStyles();
  const {
    canCheck,
    camera,
    askCamera,
    openSettings,
    phase,
    onScanned,
    scanAgain,
  } = usePassCheck();

  // Cortesia: o módulo é só do porteiro. Quem chega por um link direto volta para a home — e a API
  // recusaria de qualquer jeito.
  if (!canCheck) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.screen}>
      <HeaderModule name="Pass check" onBack={() => router.back()} />

      <View style={styles.body}>
        {camera === "asking" ? <LoadingState /> : null}

        {camera === "denied" || camera === "blocked" || camera === "unavailable" ? (
          <CameraBlocked
            reason={camera}
            onAsk={askCamera}
            onOpenSettings={openSettings ?? undefined}
            onSeeVisitors={() => router.replace("/visitors")}
          />
        ) : null}

        {/*
          A câmera só fica montada enquanto se está lendo ou conferindo. Com uma resposta na tela
          ela sai: nada é lido por trás, e a resposta não divide a tela com a imagem.
        */}
        {camera === "granted" &&
        (phase.status === "scanning" || phase.status === "checking") ? (
          <>
            <PassScanner
              active={phase.status === "scanning"}
              onScanned={onScanned}
            />
            {phase.status === "checking" ? (
              <View style={styles.checking} accessibilityRole="alert">
                <Text style={styles.checkingLabel}>Checking…</Text>
              </View>
            ) : null}
          </>
        ) : null}

        {camera === "granted" && phase.status === "answered" ? (
          <PassCheckAnswer check={phase.check} onScanAgain={scanAgain} />
        ) : null}

        {/*
          "Não deu para conferir" é desenhado com o estado de falha de carga, e NÃO com o componente
          de resposta: não pode ser confundido com nenhum dos quatro resultados (FR-021).
        */}
        {camera === "granted" && phase.status === "failed" ? (
          <LoadErrorState message={phase.message} onRetry={scanAgain} />
        ) : null}
      </View>
    </View>
  );
}
