import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import FoundItemFormModal from "@/features/lostAndFound/components/FoundItemFormModal";
import FoundItemList from "@/features/lostAndFound/components/FoundItemList";
import { useFoundItems } from "@/features/lostAndFound/hooks/useFoundItems";
import AddButton from "@/shared/components/AddButton";
import HeaderModule from "@/shared/components/HeaderModule";
import { makeStyles } from "@/shared/theme";

/**
 * Tela do módulo de Achados e Perdidos: apenas composição.
 * Todo o state vem do hook `useFoundItems` (constituição, Princípio I).
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
  })
);

export default function LostAndFoundScreen() {
  const styles = useStyles();
  const {
    state,
    canManage,
    reload,
    photoUriOf,
    formOpen,
    formPhoto,
    formErrors,
    submitting,
    submitError,
    openForm,
    closeForm,
    pickPhoto,
    post,
    changingId,
    notice,
    toggleStatus,
  } = useFoundItems();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Lost & Found" onBack={() => router.back()} />

      {/*
        As duas ações — trocar o status e postar — só são oferecidas a quem pode usá-las. Isso é
        cortesia: quem recusa de verdade é a API, que responde 403 a um morador mesmo que ele
        chegue na rota por outro caminho (FR-025, FR-032). Sem `onToggleStatus`, o card não desenha
        botão nenhum.
      */}
      <FoundItemList
        state={state}
        onRetry={reload}
        photoUriOf={photoUriOf}
        onToggleStatus={canManage ? toggleStatus : undefined}
        changingId={changingId}
        notice={notice}
      />

      {canManage ? (
        <AddButton onPress={openForm} accessibilityLabel="Add found item" />
      ) : null}

      {canManage ? (
        <FoundItemFormModal
          visible={formOpen}
          photo={formPhoto}
          errors={formErrors}
          submitting={submitting}
          submitError={submitError}
          onTakePhoto={() => pickPhoto("camera")}
          onChoosePhoto={() => pickPhoto("gallery")}
          onSubmit={post}
          onCancel={closeForm}
        />
      ) : null}
    </View>
  );
}
