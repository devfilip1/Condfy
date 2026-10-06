/**
 * Esta tela nunca é mostrada.
 *
 * O arquivo existe só para a aba "Sign out" existir na barra: o `expo-router` cria uma aba por
 * arquivo desta pasta. O toque nela é interceptado em `_layout.tsx`, que pede confirmação e
 * encerra a sessão em vez de navegar para cá.
 */
export default function SignOutTab() {
  return null;
}
