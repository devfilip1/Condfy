import { useCallback, useEffect, useRef, useState } from "react";

import {
  ErrosFormulario,
  NovoVisitante,
  Visitante,
  ehErrosFormulario,
  entradaEhValida,
  ordenarPorDataPrevista,
  validarNovoVisitante,
} from "@/features/visitors/domain/visitante";
import { ErroHttp } from "@/features/visitors/services/http";
import {
  adicionarVisitante as adicionarNoServico,
  listarVisitantes,
  removerVisitante as removerNoServico,
} from "@/features/visitors/services/visitanteService";

/** Estado da lista remota: os três casos são exclusivos (data-model, "Estado da tela"). */
export type EstadoLista =
  | { status: "carregando" }
  | { status: "erro" }
  | { status: "pronto"; visitantes: Visitante[] };

export const MENSAGEM_FALHA_CARREGAMENTO =
  "Couldn't load visitors. Check your connection and try again.";
const MENSAGEM_CADASTRO_SEM_REDE =
  "Visitor not saved. Check your connection and try again.";
const MENSAGEM_CADASTRO_ERRO_SERVIDOR =
  "Visitor not saved. Something went wrong on the server.";
const MENSAGEM_REMOCAO_FALHOU =
  "Visitor not removed. Check your connection and try again.";

export interface UseVisitantesResult {
  lista: EstadoLista;
  /** Busca a lista de novo; é a ação "tentar novamente" (FR-005). */
  recarregar: () => void;
  formularioAberto: boolean;
  errosFormulario: ErrosFormulario;
  /** Cadastro em andamento: bloqueia um segundo envio (FR-010). */
  enviando: boolean;
  /** Falha do cadastro que não é de um campo (rede ou servidor). */
  erroEnvio: string | null;
  remocaoPendente: Visitante | null;
  /** Remoção em andamento: bloqueia uma segunda confirmação. */
  removendo: boolean;
  /** Falha da remoção, exibida no diálogo (FR-009). */
  erroRemocao: string | null;
  abrirFormulario: () => void;
  fecharFormulario: () => void;
  adicionarVisitante: (entrada: NovoVisitante) => void;
  pedirRemocao: (visitante: Visitante) => void;
  cancelarRemocao: () => void;
  confirmarRemocao: () => void;
}

/**
 * Concentra estado e orquestração da tela de Visitantes.
 * Não retorna JSX e não importa componentes.
 */
export function useVisitantes(): UseVisitantesResult {
  const [lista, setLista] = useState<EstadoLista>({ status: "carregando" });
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [errosFormulario, setErrosFormulario] = useState<ErrosFormulario>({});
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const enviandoRef = useRef(false);
  const [remocaoPendente, setRemocaoPendente] = useState<Visitante | null>(
    null
  );
  const [removendo, setRemovendo] = useState(false);
  const [erroRemocao, setErroRemocao] = useState<string | null>(null);
  const removendoRef = useRef(false);

  // Evita atualizar estado depois que a tela foi fechada no meio de uma requisição.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recarregar = useCallback(() => {
    setLista({ status: "carregando" });
    listarVisitantes()
      .then((visitantes) => {
        if (montado.current) {
          // A ordem já vem do servidor (FR-016).
          setLista({ status: "pronto", visitantes });
        }
      })
      .catch(() => {
        if (montado.current) {
          setLista({ status: "erro" });
        }
      });
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const abrirFormulario = useCallback(() => {
    setErrosFormulario({});
    setErroEnvio(null);
    setFormularioAberto(true);
  }, []);

  const fecharFormulario = useCallback(() => {
    // Com o envio em andamento, o formulário só fecha quando a resposta chegar.
    if (enviandoRef.current) {
      return;
    }
    setErrosFormulario({});
    setErroEnvio(null);
    setFormularioAberto(false);
  }, []);

  const adicionarVisitante = useCallback((entrada: NovoVisitante) => {
    // O ref barra o segundo toque antes mesmo de o estado re-renderizar (FR-010).
    if (enviandoRef.current) {
      return;
    }

    const erros = validarNovoVisitante(entrada);
    if (!entradaEhValida(erros)) {
      setErrosFormulario(erros);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErroEnvio(null);

    adicionarNoServico({
      ...entrada,
      nome: entrada.nome.trim(),
      dataPrevista: entrada.dataPrevista.trim(),
      autorizadoPor: entrada.autorizadoPor.trim(),
    })
      .then((criado) => {
        if (!montado.current) {
          return;
        }
        // Insere o registro devolvido e reordena, sem buscar a lista de novo (research R-005).
        setLista((atual) =>
          atual.status === "pronto"
            ? {
              status: "pronto",
              visitantes: ordenarPorDataPrevista([
                ...atual.visitantes,
                criado,
              ]),
            }
            : atual
        );
        setErrosFormulario({});
        setFormularioAberto(false);
      })
      .catch((erro: unknown) => {
        if (!montado.current) {
          return;
        }
        // O formulário continua aberto, com o que foi digitado (FR-008, FR-009).
        if (
          erro instanceof ErroHttp &&
          erro.tipo === "validacao" &&
          typeof erro.corpo === "object" &&
          erro.corpo !== null &&
          "erros" in erro.corpo &&
          ehErrosFormulario(erro.corpo.erros)
        ) {
          setErrosFormulario(erro.corpo.erros);
        } else if (erro instanceof ErroHttp && erro.tipo === "rede") {
          setErroEnvio(MENSAGEM_CADASTRO_SEM_REDE);
        } else {
          setErroEnvio(MENSAGEM_CADASTRO_ERRO_SERVIDOR);
        }
      })
      .finally(() => {
        enviandoRef.current = false;
        if (montado.current) {
          setEnviando(false);
        }
      });
  }, []);

  const pedirRemocao = useCallback((visitante: Visitante) => {
    setErroRemocao(null);
    setRemocaoPendente(visitante);
  }, []);

  const cancelarRemocao = useCallback(() => {
    // Com a remoção em andamento, o diálogo só fecha quando a resposta chegar.
    if (removendoRef.current) {
      return;
    }
    setErroRemocao(null);
    setRemocaoPendente(null);
  }, []);

  const confirmarRemocao = useCallback(() => {
    if (removendoRef.current || !remocaoPendente) {
      return;
    }
    const id = remocaoPendente.id;

    removendoRef.current = true;
    setRemovendo(true);
    setErroRemocao(null);

    removerNoServico(id)
      .then(() => {
        if (!montado.current) {
          return;
        }
        // 204 vale também para quem já tinha sido removido em outro aparelho (FR-012).
        setLista((atual) =>
          atual.status === "pronto"
            ? {
              status: "pronto",
              visitantes: atual.visitantes.filter((v) => v.id !== id),
            }
            : atual
        );
        setRemocaoPendente(null);
      })
      .catch(() => {
        if (montado.current) {
          // Diálogo continua aberto e a lista fica intacta (FR-009).
          setErroRemocao(MENSAGEM_REMOCAO_FALHOU);
        }
      })
      .finally(() => {
        removendoRef.current = false;
        if (montado.current) {
          setRemovendo(false);
        }
      });
  }, [remocaoPendente]);

  return {
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
  };
}

export default useVisitantes;
