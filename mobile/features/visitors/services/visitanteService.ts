import visitantesIniciais from "@/features/visitors/data/visitantes.mock";
import { NovoVisitante, Visitante } from "@/features/visitors/domain/visitante";

/**
 * Única camada com estado mutável dos dados.
 *
 * O estado vive em memória durante a execução do aplicativo: alterações sobrevivem à navegação
 * entre telas e voltam ao conjunto de exemplo quando o app é reiniciado (FR-014).
 * Funções síncronas por decisão D-004; o serviço não valida, não ordena e não formata.
 */
let visitantes: Visitante[] = [...visitantesIniciais];

let contadorIds = 0;

function gerarId(): string {
  contadorIds += 1;
  return `v-${Date.now()}-${contadorIds}`;
}

/** Devolve uma cópia da lista atual, na ordem de inserção. */
export function listarVisitantes(): Visitante[] {
  return [...visitantes];
}

/** Acrescenta um visitante com identificador único e devolve o registro criado. */
export function adicionarVisitante(entrada: NovoVisitante): Visitante {
  const criado: Visitante = { id: gerarId(), ...entrada };
  visitantes = [...visitantes, criado];
  return criado;
}

/**
 * Remove o registro com o `id` informado, preservando todos os demais, inclusive homônimos
 * (FR-012). Um `id` inexistente é operação silenciosa e sem efeito.
 */
export function removerVisitante(id: string): void {
  visitantes = visitantes.filter((visitante) => visitante.id !== id);
}
