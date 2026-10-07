import { Octicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Modal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FoundItem } from "@/features/lostAndFound/domain/foundItem";
import { makeStyles, useTheme } from "@/shared/theme";

/**
 * A foto de um item, sozinha e inteira, sobre a tela.
 *
 * Só a foto, de propósito: o card já mostra a descrição, o local e o status, e o que falta nele é
 * espaço para enxergar o objeto. Por isso `contain` aqui, onde o card usa `cover` — no card a foto
 * é cortada para caber na faixa; aqui nada dela fica de fora.
 *
 * Componente puro: recebe o item e o endereço por props e não acessa serviço nem hook de estado.
 */

export interface FoundItemPhotoModalProps {
  /** O item cuja foto está aberta, ou `null` com o pop-up fechado. */
  item: FoundItem | null;
  /** Endereço completo da foto, já montado por quem conhece o endereço da API. */
  photoUri: string | null;
  onClose: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      paddingHorizontal: 16,
    },
    close: {
      alignSelf: "flex-end",
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    photo: {
      flex: 1,
      width: "100%",
    },
  })
);

export default function FoundItemPhotoModal({
  item,
  photoUri,
  onClose,
}: FoundItemPhotoModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tocar em qualquer lugar fecha, a foto inclusive: não há mais nada aqui em que tocar. */}
      <Pressable
        style={[
          styles.backdrop,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
        onPress={onClose}
        accessible={false}
      >
        <Pressable
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          <Octicons name="x" size={24} color={colors.textOnOverlay} />
        </Pressable>

        {item !== null && photoUri !== null ? (
          // A mesma chave de cache do card: a imagem já está no aparelho, não é baixada de novo.
          <Image
            style={styles.photo}
            source={{ uri: photoUri, cacheKey: item.id }}
            contentFit="contain"
            transition={200}
            accessibilityLabel={`Photo of ${item.description}`}
          />
        ) : null}
      </Pressable>
    </Modal>
  );
}
