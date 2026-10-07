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
  isProfileMembership,
  managesCondominium,
  unitLabel,
} from "@/features/auth/domain/session";
export { condominiumPhotoUri } from "@/features/auth/services/condominiumPhoto";
export type {
  Profile,
  ProfileCondominium,
  ProfileMembership,
  ProfileUnit,
  Role,
} from "@/features/auth/domain/session";
export { default as SignInScreen } from "@/features/auth/SignInScreen";
export { default as SignUpScreen } from "@/features/auth/SignUpScreen";
