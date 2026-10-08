import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import AddButton from "@/shared/components/AddButton";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import VisitorFormModal from "@/features/visitors/components/VisitorFormModal";
import VisitorList from "@/features/visitors/components/VisitorList";
import VisitorPassModal from "@/features/visitors/components/VisitorPassModal";
import { makeStyles } from "@/shared/theme";
import {
  MESSAGE_LOAD_FAILED,
  useVisitors,
} from "@/features/visitors/hooks/useVisitors";

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
  })
);

/**
 * Tela do módulo de Visitantes: apenas composição.
 * Todo o state vem do hook `useVisitors`.
 */
export default function VisitorsScreen() {
  const styles = useStyles();
  const {
    canRegister,
    list,
    reload,
    formOpen,
    formErrors,
    submitting,
    submitError,
    pendingRemoval,
    removing,
    removalError,
    openForm,
    closeForm,
    addVisitor,
    units,
    unitsHint,
    requestRemoval,
    cancelRemoval,
    confirmRemoval,
    openPass,
    showPass,
    closePass,
    sharePass,
    sharing,
    shareNotice,
  } = useVisitors();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Visitors" onBack={() => router.back()} />
      {list.status === "loading" && <LoadingState />}
      {list.status === "error" && (
        <LoadErrorState
          message={MESSAGE_LOAD_FAILED}
          onRetry={reload}
        />
      )}
      {list.status === "ready" && (
        <>
          <VisitorList
            visitors={list.visitors}
            onRemove={requestRemoval}
            onOpenPass={showPass}
          />
          {/* O porteiro lê a lista e não libera ninguém: sem botão e sem formulário. */}
          {canRegister ? <AddButton onPress={openForm} /> : null}
        </>
      )}
      <VisitorFormModal
        visible={canRegister && formOpen}
        errors={formErrors}
        units={units}
        unitsHint={unitsHint}
        submitting={submitting}
        submitError={submitError}
        onSubmit={addVisitor}
        onCancel={closeForm}
      />
      {/*
        O comprovante de liberação. Abre sozinho quando um visitante é cadastrado e de novo ao tocar
        no card — só para quem autorizou a visita, que é quem recebe o código dela.
      */}
      <VisitorPassModal
        pass={openPass}
        sharing={sharing}
        notice={shareNotice}
        onShare={sharePass}
        onClose={closePass}
      />
      <ConfirmDialog
        visible={pendingRemoval !== null}
        message={
          pendingRemoval
            ? `Remove ${pendingRemoval.name} from the visitor list?`
            : ""
        }
        onConfirm={confirmRemoval}
        onCancel={cancelRemoval}
        busy={removing}
        errorMessage={removalError}
      />
    </View>
  );
}
