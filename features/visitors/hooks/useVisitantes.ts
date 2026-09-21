import { useCallback, useMemo, useState } from "react";

import {
  ErrosFormulario,
  NovoVisitante,
  Visitante,
  entradaEhValida,
  ordenarPorDataPrevista,
  validarNovoVisitante,
} from "@/features/visitors/domain/visitante";
import {
  adicionarVisitante as adicionarNoServico,
  listarVisitantes,
  removerVisitante as removerNoServico,
} from "@/features/visitors/services/visitanteService";

export interface UseVisitantesResult {
  /** Lista já ordenada por data prevista (FR-017). */
  visitantes: Visitante[];
  vazio: boolean;
  formularioAberto: boolean;
  errosFormulario: ErrosFormulario;
  remocaoPendente: Visitante | null;
  abrirFormulario: () => void;
  fecharFormulario: () => void;
  /** `false` quando a validação falha — o formulário permanece aberto (SC-006). */
  adicionarVisitante: (entrada: NovoVisitante) => boolean;
  pedirRemocao: (visitante: Visitante) => void;
  cancelarRemocao: () => void;
  confirmarRemocao: () => void;
}

/**
 * Concentra estado e orquestração da tela de Visitantes.
 * Não retorna JSX e não importa componentes.
 */
export function useVisitantes(): UseVisitantesResult {
  const [registros, setRegistros] = useState<Visitante[]>(() =>
    listarVisitantes()
  );
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [errosFormulario, setErrosFormulario] = useState<ErrosFormulario>({});
  const [remocaoPendente, setRemocaoPendente] = useState<Visitante | null>(
    null
  );

  const visitantes = useMemo(
    () => ordenarPorDataPrevista(registros),
    [registros]
  );

  const abrirFormulario = useCallback(() => {
    setErrosFormulario({});
    setFormularioAberto(true);
  }, []);

  const fecharFormulario = useCallback(() => {
    setErrosFormulario({});
    setFormularioAberto(false);
  }, []);

  const adicionarVisitante = useCallback((entrada: NovoVisitante): boolean => {
    const erros = validarNovoVisitante(entrada);
    if (!entradaEhValida(erros)) {
      setErrosFormulario(erros);
      return false;
    }

    adicionarNoServico({
      ...entrada,
      nome: entrada.nome.trim(),
      dataPrevista: entrada.dataPrevista.trim(),
      autorizadoPor: entrada.autorizadoPor.trim(),
    });
    setRegistros(listarVisitantes());
    setErrosFormulario({});
    setFormularioAberto(false);
    return true;
  }, []);

  const pedirRemocao = useCallback((visitante: Visitante) => {
    setRemocaoPendente(visitante);
  }, []);

  const cancelarRemocao = useCallback(() => {
    setRemocaoPendente(null);
  }, []);

  const confirmarRemocao = useCallback(() => {
    setRemocaoPendente((pendente) => {
      if (pendente) {
        removerNoServico(pendente.id);
        setRegistros(listarVisitantes());
      }
      return null;
    });
  }, []);

  return {
    visitantes,
    vazio: visitantes.length === 0,
    formularioAberto,
    errosFormulario,
    remocaoPendente,
    abrirFormulario,
    fecharFormulario,
    adicionarVisitante,
    pedirRemocao,
    cancelarRemocao,
    confirmarRemocao,
  };
}

export default useVisitantes;
