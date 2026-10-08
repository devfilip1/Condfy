import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth";
import { Notice } from "@/features/newsletter/domain/notice";
import { listNotices } from "@/features/newsletter/services/noticeService";

/**
 * O último aviso do condomínio em tela — para a home mostrar, sem a pessoa abrir nada.
 *
 * Concentra busca e estado; não devolve JSX e não importa componente visual (constituição,
 * Princípio I).
 *
 * **É o PRIMEIRO item da mesma lista que o módulo Newsletter mostra**, e não uma consulta própria.
 * Assim o card e o módulo nunca discordam sobre qual aviso é o primeiro: não existe uma segunda
 * ordenação que possa se afastar da do mural. O custo é baixar o mural inteiro para mostrar um
 * aviso. Os murais são curtos; no dia em que não forem, a resposta é um limite na rota que já
 * existe — não outra rota, com outra ideia de "último".
 *
 * **Nunca explica uma falha.** Sem condomínio, com o mural vazio ou com a busca recusada, devolve
 * `null`, e a home simplesmente não desenha o card. O card é um extra: quem explica e deixa tentar
 * de novo é o mural, no módulo dele.
 */
export function useLatestNotice(): Notice | null {
  const { selectedCondominiumId } = useAuth();
  const [latest, setLatest] = useState<{
    condominiumId: string;
    notice: Notice | null;
  } | null>(null);
  /** O condomínio da busca em andamento: a resposta de outro é descartada. */
  const wanted = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A cada vez que a home volta a ser a tela da frente: um aviso publicado nesse meio-tempo aparece
  // na volta, sem ninguém pedir.
  useFocusEffect(
    useCallback(() => {
      wanted.current = selectedCondominiumId;
      if (selectedCondominiumId === null) {
        return;
      }
      const condominiumId = selectedCondominiumId;
      listNotices(condominiumId)
        .then((notices) => {
          if (mounted.current && wanted.current === condominiumId) {
            setLatest({ condominiumId, notice: notices[0] ?? null });
          }
        })
        .catch(() => {
          // De propósito: a falha do card não é notícia na home.
          if (mounted.current && wanted.current === condominiumId) {
            setLatest({ condominiumId, notice: null });
          }
        });
    }, [selectedCondominiumId])
  );

  // O aviso guardado só vale para o condomínio de onde veio. Trocando de condomínio, o do anterior
  // some NA HORA — antes de a busca do novo responder —, e não por um instante sequer aparece na
  // home de outro prédio. Derivar aqui, em vez de apagar num efeito, é o que garante o "na hora".
  return latest !== null && latest.condominiumId === selectedCondominiumId
    ? latest.notice
    : null;
}
