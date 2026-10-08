import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import JoinRequestCard from "@/features/joinRequests/components/JoinRequestCard";
import { confirmationText } from "@/features/joinRequests/domain/joinRequest";
import { useJoinRequests } from "@/features/joinRequests/hooks/useJoinRequests";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import EmptyState from "@/shared/components/EmptyState";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import { makeStyles } from "@/shared/theme";

/**
 * Tela do módulo de pedidos de entrada: apenas composição.
 * Todo o state vem do hook `useJoinRequests` (constituição, Princípio I).
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    list: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 60,
      gap: 12,
    },
    notice: {
      marginHorizontal: 20,
      marginBottom: 8,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
  })
);

export default function JoinRequestsScreen() {
  const styles = useStyles();
  const {
    state,
    canAnswer,
    reload,
    pending,
    answering,
    answerError,
    notice,
    ask,
    cancel,
    confirm,
  } = useJoinRequests();

  // Cortesia: o módulo é de quem cuida do condomínio. Quem chega por um link direto volta para a
  // home — e a API recusaria de qualquer jeito.
  if (!canAnswer) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.screen}>
      <HeaderModule name="Requests" onBack={() => router.back()} />

      {/* Um aviso, não uma falha: o pedido já tinha sido respondido por outra pessoa. */}
      {notice ? (
        <Text style={styles.notice} accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}

      {state.status === "loading" ? <LoadingState /> : null}

      {state.status === "failed" ? (
        <LoadErrorState message={state.message} onRetry={reload} />
      ) : null}

      {state.status === "ready" && state.requests.length === 0 ? (
        <EmptyState message="Nobody is waiting to join." />
      ) : null}

      {state.status === "ready" && state.requests.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {state.requests.map((request) => (
            <JoinRequestCard
              key={request.id}
              request={request}
              onApprove={(selected) => ask(selected, "approve")}
              onReject={(selected) => ask(selected, "reject")}
              disabled={answering}
            />
          ))}
        </ScrollView>
      ) : null}

      {/*
        Um diálogo para as duas respostas. Aprovar não apaga nada, então vai em tom neutro; rejeitar
        remove a conta da pessoa, e o diálogo diz isso antes — em vermelho.
      */}
      <ConfirmDialog
        visible={pending !== null}
        message={
          pending === null ? "" : confirmationText(pending.request, pending.answer)
        }
        confirmLabel={pending?.answer === "reject" ? "Reject" : "Approve"}
        busyLabel={pending?.answer === "reject" ? "Rejecting…" : "Approving…"}
        tone={pending?.answer === "reject" ? "destructive" : "neutral"}
        busy={answering}
        errorMessage={answerError}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </View>
  );
}
