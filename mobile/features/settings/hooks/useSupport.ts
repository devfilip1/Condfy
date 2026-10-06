import { useCallback, useState } from "react";
import { Linking } from "react-native";

import {
  SUPPORT_CONTACTS,
  SupportContact,
} from "@/features/settings/data/support";

/**
 * Abrir um contato do suporte, e dizer quando não deu.
 *
 * É o único I/O desta tela — pedir ao aparelho que abra um endereço — e fica no hook para o
 * componente continuar puro.
 */

export const MESSAGE_COULD_NOT_OPEN =
  "Couldn't open it on this device. The contact is written above.";

export interface UseSupportResult {
  contacts: readonly SupportContact[];
  /** Aviso de que um contato não abriu. Some na próxima tentativa. */
  notice: string | null;
  open: (contact: SupportContact) => void;
}

export function useSupport(): UseSupportResult {
  const [notice, setNotice] = useState<string | null>(null);

  const open = useCallback((contact: SupportContact) => {
    setNotice(null);
    // Sem `canOpenURL` antes: no Android ele responde "não" para esquemas não declarados mesmo
    // quando há aplicativo que os abre. Tentar e tratar a falha é o que dá a resposta certa.
    Linking.openURL(contact.url).catch(() => {
      setNotice(MESSAGE_COULD_NOT_OPEN);
    });
  }, []);

  return { contacts: SUPPORT_CONTACTS, notice, open };
}
