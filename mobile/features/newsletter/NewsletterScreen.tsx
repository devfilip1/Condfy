import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import NoticeFormModal from "@/features/newsletter/components/NoticeFormModal";
import NoticeList from "@/features/newsletter/components/NoticeList";
import { useNotices } from "@/features/newsletter/hooks/useNotices";
import AddButton from "@/shared/components/AddButton";
import HeaderModule from "@/shared/components/HeaderModule";
import { Colors } from "@/shared/constants/Colors";

/**
 * Tela do módulo de Newsletter: apenas composição.
 * Todo o state vem do hook `useNotices` (constituição, Princípio I).
 */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
});

export default function NewsletterScreen() {
  const {
    state,
    canPublish,
    formOpen,
    formErrors,
    submitting,
    submitError,
    openForm,
    closeForm,
    publish,
    reload,
  } = useNotices();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Newsletter" onBack={() => router.back()} />

      <NoticeList
        state={state}
        onSelect={(notice) => router.push(`/newsletter/${notice.id}`)}
        onRetry={reload}
      />

      {/*
        A ação só é oferecida a quem pode usá-la. Isso é cortesia: quem recusa de verdade é a API,
        que responde 403 a um morador mesmo que ele chegue na rota por outro caminho (FR-023).
      */}
      {canPublish ? <AddButton onPress={openForm} accessibilityLabel="Publish notice" /> : null}

      {canPublish ? (
        <NoticeFormModal
          visible={formOpen}
          errors={formErrors}
          submitting={submitting}
          submitError={submitError}
          onSubmit={publish}
          onCancel={closeForm}
        />
      ) : null}
    </View>
  );
}
