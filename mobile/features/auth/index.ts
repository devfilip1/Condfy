/**
 * API pública da feature de autenticação.
 *
 * Outras features consomem o cliente HTTP daqui (research R-010); o restante é consumido pelas
 * rotas em `app/`.
 */
export { HttpError, apiUrl, request } from "@/features/auth/services/http";
export type { RequestOptions, HttpErrorKind } from "@/features/auth/services/http";
export { AuthProvider, useAuth } from "@/features/auth/hooks/useAuth";
export type {
  AccountChangeResult,
  CondominiumGate,
  ProfileState,
  SessionState,
  UseAuthResult,
} from "@/features/auth/hooks/useAuth";
export {
  PASSWORD_MIN_LENGTH,
  actsInCondominium,
  isProfileMembership,
  managesCondominium,
  unitLabel,
  // As regras do cadastro, para quem cria uma conta por outro caminho: o síndico, ao trazer uma
  // pessoa com cargo, valida nome, e-mail e password EXATAMENTE como o cadastro (feature 014).
  validateSignUp,
} from "@/features/auth/domain/session";
export { condominiumPhotoUri } from "@/features/auth/services/condominiumPhoto";
export type {
  JoinRequestSummary,
  Profile,
  ProfileCondominium,
  ProfileMembership,
  ProfileUnit,
  Role,
} from "@/features/auth/domain/session";
export { default as SignInScreen } from "@/features/auth/SignInScreen";
export { default as SignUpScreen } from "@/features/auth/SignUpScreen";
export { default as AwaitingApprovalScreen } from "@/features/auth/AwaitingApprovalScreen";
