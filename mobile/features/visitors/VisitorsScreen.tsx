import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import AddButton from "@/shared/components/AddButton";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/shared/components/LoadErrorState";
import LoadingState from "@/shared/components/LoadingState";
import VisitorFormModal from "@/features/visitors/components/VisitorFormModal";
import VisitorList from "@/features/visitors/components/VisitorList";
import { Colors } from "@/shared/constants/Colors";
import {
  MESSAGE_LOAD_FAILED,
  useVisitors,
} from "@/features/visitors/hooks/useVisitors";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
});

/**
 * Tela do módulo de Visitantes: apenas composição.
 * Todo o state vem do hook `useVisitors`.
 */
export default function VisitorsScreen() {
  const {
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
    requestRemoval,
    cancelRemoval,
    confirmRemoval,
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
          <VisitorList visitors={list.visitors} onRemove={requestRemoval} />
          <AddButton onPress={openForm} />
        </>
      )}
      <VisitorFormModal
        visible={formOpen}
        errors={formErrors}
        submitting={submitting}
        submitError={submitError}
        onSubmit={addVisitor}
        onCancel={closeForm}
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
