import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import AddButton from "@/shared/components/AddButton";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import LoadErrorState from "@/features/visitors/components/LoadErrorState";
import LoadingState from "@/features/visitors/components/LoadingState";
import VisitorFormModal from "@/features/visitors/components/VisitorFormModal";
import VisitorList from "@/features/visitors/components/VisitorList";
import { Colors } from "@/shared/constants/Colors";
import {
  MENSAGEM_FALHA_CARREGAMENTO,
  useVisitantes,
} from "@/features/visitors/hooks/useVisitantes";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
});

/**
 * Tela do módulo de Visitantes: apenas composição.
 * Todo o estado vem do hook `useVisitantes`.
 */
export default function VisitorsScreen() {
  const {
    lista,
    recarregar,
    formularioAberto,
    errosFormulario,
    enviando,
    erroEnvio,
    remocaoPendente,
    removendo,
    erroRemocao,
    abrirFormulario,
    fecharFormulario,
    adicionarVisitante,
    pedirRemocao,
    cancelarRemocao,
    confirmarRemocao,
  } = useVisitantes();

  return (
    <View style={styles.screen}>
      <HeaderModule name="Visitors" onBack={() => router.back()} />
      {lista.status === "carregando" && <LoadingState />}
      {lista.status === "erro" && (
        <LoadErrorState
          message={MENSAGEM_FALHA_CARREGAMENTO}
          onRetry={recarregar}
        />
      )}
      {lista.status === "pronto" && (
        <>
          <VisitorList visitantes={lista.visitantes} onRemove={pedirRemocao} />
          <AddButton onPress={abrirFormulario} />
        </>
      )}
      <VisitorFormModal
        visible={formularioAberto}
        erros={errosFormulario}
        enviando={enviando}
        erroEnvio={erroEnvio}
        onSubmit={adicionarVisitante}
        onCancel={fecharFormulario}
      />
      <ConfirmDialog
        visible={remocaoPendente !== null}
        message={
          remocaoPendente
            ? `Remove ${remocaoPendente.nome} from the visitor list?`
            : ""
        }
        onConfirm={confirmarRemocao}
        onCancel={cancelarRemocao}
        busy={removendo}
        errorMessage={erroRemocao}
      />
    </View>
  );
}
