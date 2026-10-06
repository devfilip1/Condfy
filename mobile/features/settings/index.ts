/**
 * API pública da feature de configurações.
 *
 * As telas, uma por destino do menu, e o provider de aparência — que o layout raiz põe em volta do
 * aplicativo inteiro. O resto é interno (Princípio I).
 */
export { AppearanceProvider } from "@/features/settings/hooks/useAppearance";
export { default as SettingsScreen } from "@/features/settings/SettingsScreen";
export { default as PersonalDataScreen } from "@/features/settings/PersonalDataScreen";
export { default as ChangeEmailScreen } from "@/features/settings/ChangeEmailScreen";
export { default as ChangePasswordScreen } from "@/features/settings/ChangePasswordScreen";
export { default as SupportScreen } from "@/features/settings/SupportScreen";
export { default as DeleteAccountScreen } from "@/features/settings/DeleteAccountScreen";
