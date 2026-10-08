/**
 * API pública da feature de newsletter.
 *
 * As duas telas e, desde a feature 017, o que a HOME usa para mostrar o último aviso: o hook que o
 * busca e o card que o desenha. Os dois moram aqui, e não na home, porque são feitos do tipo
 * `Notice` e da regra de prévia do mural — a home os compõe, sem redeclarar nada. É a única outra
 * feature que consome avisos, e só por esta porta (constituição, Princípio I).
 */
export { useLatestNotice } from "@/features/newsletter/hooks/useLatestNotice";
export { default as LatestNoticeCard } from "@/features/newsletter/components/LatestNoticeCard";
export type { Notice } from "@/features/newsletter/domain/notice";
export { default as NewsletterScreen } from "@/features/newsletter/NewsletterScreen";
export { default as NoticeScreen } from "@/features/newsletter/NoticeScreen";
