/**
 * API pública da feature de condomínios.
 *
 * Duas telas: a de escolha e a de criação de um condomínio. O STATE de "em qual condomínio estou" não mora aqui: é contexto de
 * sessão, vive em `@/features/auth`, e é de lá que toda feature o lê.
 */
export { default as ChooseCondominiumScreen } from "@/features/condominiums/ChooseCondominiumScreen";
export { default as CreateCondominiumScreen } from "@/features/condominiums/CreateCondominiumScreen";
// O seletor de foto em 16:9, para a feature de reservas usar no formulário de um local. Um terceiro
// seletor copiado seria a terceira cópia do mesmo I/O; a constituição deixa uma feature importar
// outra pelo `index.ts`, e é por aqui.
export { pickPhoto } from "@/features/condominiums/services/photoPicker";
export type {
  PhotoSource,
  PickResult,
} from "@/features/condominiums/services/photoPicker";
export type { SelectedPhoto } from "@/features/condominiums/domain/newCondominium";
