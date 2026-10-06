/**
 * Os dois contatos do suporte.
 *
 * São os mesmos para toda pessoa e todo condomínio: levam a quem cuida do aplicativo, não ao
 * administrador de um prédio (FR-031a). Ficam fixos aqui, então trocar qualquer um dos dois é
 * publicar uma versão nova.
 *
 * `label` é o que aparece escrito na tela, por extenso — é o que continua servindo quando o
 * aparelho não consegue abrir o contato. `url` é o que o toque abre.
 */

export interface SupportContact {
  kind: "whatsapp" | "email";
  /** O nome do canal, como a pessoa o conhece. */
  title: string;
  label: string;
  url: string;
}

export const SUPPORT_WHATSAPP: SupportContact = {
  kind: "whatsapp",
  title: "WhatsApp",
  label: "+55 71 99285-9868",
  // `wa.me` abre o aplicativo onde ele existe e o WhatsApp Web onde não existe, então funciona nas
  // três plataformas sem perguntar ao aparelho o que está instalado. Só dígitos, com o DDI.
  url: "https://wa.me/5571992859868",
};

export const SUPPORT_EMAIL: SupportContact = {
  kind: "email",
  title: "E-mail",
  label: "suporte@condfy.com.br",
  url: "mailto:suporte@condfy.com.br",
};

export const SUPPORT_CONTACTS: readonly SupportContact[] = [
  SUPPORT_WHATSAPP,
  SUPPORT_EMAIL,
];
