import { Ionicons } from "@expo/vector-icons";
import { RefObject, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import VisitorPass from "@/features/visitors/components/VisitorPass";
import { OpenPass } from "@/features/visitors/domain/visitor";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * O pop-up do comprovante: o quadrado e, EMBAIXO dele, o botão de compartilhar.
 *
 * Puro: recebe o comprovante aberto e callbacks (Princípio II). Só guarda a referência do quadrado,
 * que é o que quem compartilha precisa capturar.
 *
 * **O botão fica FORA do quadrado de propósito.** A imagem compartilhada é a captura do quadrado e
 * de mais nada; um botão dentro dele sairia na foto (SC-006).
 *
 * O quadrado é sempre claro; o véu, o botão e o aviso seguem a aparência em uso.
 */

/** Margem em volta do quadrado, e o maior lado que ele chega a ter numa tela larga. */
const MARGIN = 24;
const MAX_SIDE = 420;

export interface VisitorPassModalProps {
  /** O comprovante aberto, ou `null` com o pop-up fechado. */
  pass: OpenPass | null;
  /** Compartilhamento em andamento: o botão fica parado. */
  sharing: boolean;
  /** O que dizer embaixo do quadrado: a imagem foi salva, ou não deu para compartilhar. */
  notice: string | null;
  /**
   * Recebe a referência do quadrado, que é o que vai ser capturado. O tipo é escrito aqui, e não
   * importado do serviço: componente não importa de `services/` (constituição, regras de
   * dependência).
   */
  onShare: (target: RefObject<View | null>) => void;
  onClose: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.overlay,
    },
    column: {
      gap: 16,
    },
    close: {
      alignSelf: "flex-end",
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    notice: {
      fontSize: 13,
      lineHeight: 18,
      textAlign: "center",
      color: colors.textOnOverlay,
    },
    shareButton: {
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      backgroundColor: colors.accent,
    },
    shareButtonBusy: {
      opacity: 0.6,
    },
    shareLabel: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textOnAccent,
    },
  })
);

export default function VisitorPassModal({
  pass,
  sharing,
  notice,
  onShare,
  onClose,
}: VisitorPassModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const passRef = useRef<View>(null);

  // Quadrado: o lado é o que couber na largura, sem passar do teto nem estourar a altura — abaixo
  // dele ainda precisam caber o fechar e o botão.
  const side = Math.max(
    220,
    Math.min(
      width - MARGIN * 2,
      height - insets.top - insets.bottom - 200,
      MAX_SIDE
    )
  );

  return (
    <Modal
      visible={pass !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tocar no véu fecha; tocar no quadrado ou no botão, não. */}
      <Pressable
        style={[
          styles.overlay,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
        onPress={onClose}
        accessible={false}
      >
        {pass !== null ? (
          <Pressable
            style={[styles.column, { width: side }]}
            onPress={(event) => event.stopPropagation()}
            accessible={false}
          >
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close pass"
            >
              <Ionicons name="close" size={26} color={colors.textOnOverlay} />
            </Pressable>

            <VisitorPass
              ref={passRef}
              visitor={pass.visitor}
              condominiumName={pass.condominiumName}
              expired={pass.expired}
              size={side}
            />

            {notice !== null ? (
              <Text style={styles.notice} accessibilityRole="alert">
                {notice}
              </Text>
            ) : null}

            {/* Comprovante vencido não se compartilha: ele já diz que não vale mais (FR-021). */}
            {pass.expired ? null : (
              <TouchableOpacity
                style={[styles.shareButton, sharing && styles.shareButtonBusy]}
                onPress={() => onShare(passRef)}
                disabled={sharing}
                accessibilityRole="button"
                accessibilityLabel="Share the pass"
                accessibilityState={{ disabled: sharing, busy: sharing }}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent} />
                ) : (
                  <>
                    <Ionicons
                      name="share-social-outline"
                      size={20}
                      color={colors.textOnAccent}
                    />
                    <Text style={styles.shareLabel}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}
