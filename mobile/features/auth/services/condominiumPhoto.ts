import { ProfileCondominium } from "@/features/auth/domain/session";
import { apiUrl } from "@/features/auth/services/http";

/**
 * O endereço da foto de um condomínio, pronto para exibir — ou `null`, e aí quem exibe mostra o
 * placeholder.
 *
 * A foto tem duas origens: a que o síndico ENVIOU chega como um caminho relativo e assinado
 * (`photoPath`), que precisa do endereço da API na frente; a dos condomínios de exemplo é um
 * endereço https inteiro (`imageUrl`). Toda tela que desenha a foto de um condomínio passa por
 * aqui, para nenhuma delas aprender a diferença.
 *
 * Mora em `services/`, e não no domínio, porque montar o endereço depende de saber onde a API está.
 *
 * O caminho assinado muda a cada carga do perfil e a foto não: quem exibe usa o `id` do condomínio
 * como chave de cache, para não baixar a mesma imagem de novo.
 */
export function condominiumPhotoUri(
  condominium: Pick<ProfileCondominium, "imageUrl" | "photoPath">
): string | null {
  if (condominium.photoPath !== null) {
    return apiUrl(condominium.photoPath);
  }
  return condominium.imageUrl;
}
