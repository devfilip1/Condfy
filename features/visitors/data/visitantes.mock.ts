import { Visitante } from "@/features/visitors/domain/visitante";

/**
 * Conjunto de visitantes de exemplo (FR-003).
 *
 * As datas estão propositalmente fora de ordem neste arquivo: a lista só aparece ordenada
 * na tela porque a ordenação (FR-017) é aplicada pelo hook `useVisitantes`. São 8 registros para que a
 * lista ultrapasse a altura útil de uma tela de celular e a rolagem (FR-015) possa ser
 * verificada sem depender do cadastro.
 */
const visitantes: Visitante[] = [
  {
    id: "seed-01",
    nome: "Jane Smith",
    tipo: "visitante",
    dataPrevista: "2026-09-14",
    autorizadoPor: "Carlos Ribeiro",
  },
  {
    id: "seed-02",
    nome: "Maria Fernanda Albuquerque dos Santos Nascimento",
    tipo: "prestador",
    dataPrevista: "2026-08-28",
    autorizadoPor: "Ana Lima",
  },
  {
    id: "seed-03",
    nome: "Pedro Alves",
    tipo: "entrega",
    dataPrevista: "2026-09-02",
    autorizadoPor: "Carlos Ribeiro",
  },
  {
    id: "seed-04",
    nome: "Lucia Moreira",
    tipo: "visitante",
    dataPrevista: "2026-08-19",
    autorizadoPor: "Bruno Tavares",
  },
  {
    id: "seed-05",
    nome: "Rafael Duarte",
    tipo: "prestador",
    dataPrevista: "2026-10-05",
    autorizadoPor: "Ana Lima",
  },
  {
    id: "seed-06",
    nome: "Camila Rocha",
    tipo: "entrega",
    dataPrevista: "2026-08-22",
    autorizadoPor: "Bruno Tavares",
  },
  {
    id: "seed-07",
    nome: "Thiago Nunes",
    tipo: "visitante",
    dataPrevista: "2026-09-27",
    autorizadoPor: "Carlos Ribeiro",
  },
  {
    id: "seed-08",
    nome: "Beatriz Campos",
    tipo: "entrega",
    dataPrevista: "2026-09-08",
    autorizadoPor: "Ana Lima",
  },
];

export default visitantes;
