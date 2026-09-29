import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import AddButton from "@/shared/components/AddButton";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import HeaderModule from "@/shared/components/HeaderModule";
import VisitorFormModal from "@/features/visitors/components/VisitorFormModal";
import VisitorList from "@/features/visitors/components/VisitorList";
import { Colors } from "@/shared/constants/Colors";
import { useVisitantes } from "@/features/visitors/hooks/useVisitantes";

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
    visitantes,
    formularioAberto,
    errosFormulario,
    remocaoPendente,
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
      <VisitorList visitantes={visitantes} onRemove={pedirRemocao} />
      <AddButton onPress={abrirFormulario} />
      <VisitorFormModal
        visible={formularioAberto}
        erros={errosFormulario}
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
      />
    </View>
  );
}
