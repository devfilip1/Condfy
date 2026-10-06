/**
 * API pública da feature de achados e perdidos.
 *
 * Uma tela só. Nenhuma outra feature consome o domínio nem os componentes desta, então nada mais é
 * exportado — o que não está aqui é interno (Princípio I).
 */
export { default as LostAndFoundScreen } from "@/features/lostAndFound/LostAndFoundScreen";
