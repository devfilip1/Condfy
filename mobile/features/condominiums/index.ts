/**
 * API pública da feature de condomínios.
 *
 * Uma tela só, a de escolha. O STATE de "em qual condomínio estou" não mora aqui: é contexto de
 * sessão, vive em `@/features/auth`, e é de lá que toda feature o lê.
 */
export { default as ChooseCondominiumScreen } from "@/features/condominiums/ChooseCondominiumScreen";
