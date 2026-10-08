import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import StatusBadge from "@/features/lostAndFound/components/StatusBadge";
import { FoundItem } from "@/features/lostAndFound/domain/foundItem";
import Photo from "@/shared/components/Photo";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";
import { toDisplayDateTime } from "@/shared/lib/calendar";

/**
 * Card de um item encontrado. De cima para baixo, na ordem pedida: a foto, a descrição, o local em
 * texto menor, e o momento da postagem.
 *
 * Componente puro: recebe o item e o callback por props e não acessa serviço, storage nem
 * navegação (constituição, Princípio II).
 *
 * O botão de status só existe quando `onToggleStatus` é passado — e a tela só o passa para o
 * administrador. Para um morador o card não tem botão nenhum, nem desabilitado (FR-032).
 */

/** Altura fixa: a foto ausente, lenta ou quebrada ocupa o mesmo espaço (FR-016). */
const PHOTO_HEIGHT = 180;

export interface FoundItemCardProps {
  item: FoundItem;
  /**
   * Endereço completo da foto, já montado por quem conhece o endereço da API. O card é puro: não
   * sabe onde o servidor mora.
   */
  photoUri: string;
  /** Tocar no card — na foto ou no texto — abre a foto sozinha. */
  onOpenPhoto: (item: FoundItem) => void;
  /** Ausente para quem não pode trocar o status. */
  onToggleStatus?: (item: FoundItem) => void;
  /** A troca deste item está em voo. */
  changing?: boolean;
  /** Outra troca está em voo: o botão deste fica parado até ela terminar. */
  disabled?: boolean;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      // Para a foto herdar os cantos de cima do card sem repetir o raio nela.
      overflow: "hidden",
    },
    photo: {
      width: "100%",
      height: PHOTO_HEIGHT,
    },
    info: {
      padding: 15,
    },
    description: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
    // Menor e mais apagado que a descrição, de propósito: são duas informações, e uma é a principal
    // (FR-011).
    place: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 6,
    },
    postedAt: {
      flexShrink: 1,
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.textMuted,
    },
    action: {
      height: 44,
      marginHorizontal: 15,
      marginBottom: 15,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.control,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.screenBackground,
    },
    actionDisabled: {
      opacity: 0.5,
    },
    actionText: {
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
  })
);

export default function FoundItemCard({
  item,
  photoUri,
  onOpenPhoto,
  onToggleStatus,
  changing = false,
  disabled = false,
}: FoundItemCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const postedAt = toDisplayDateTime(item.postedAt);
  const actionLabel =
    item.status === "found" ? "Mark as returned" : "Mark as found";

  return (
    <View style={styles.card}>
      {/*
        A área tocável é a foto e o texto, e o botão de status fica FORA dela, como irmão: um botão
        dentro de outro é HTML inválido na web, e no aparelho o toque no botão abriria a foto junto.
      */}
      <Pressable
        onPress={() => onOpenPhoto(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.description}, found at ${item.place}, posted ${postedAt}, ${item.status}`}
        accessibilityHint="Opens the photo"
      >
        {/*
          O caminho da foto é assinado e muda a cada carga da lista; a foto de um item nunca muda. O
          `id` como chave do cache é o que impede baixar a mesma imagem de novo a cada visita.
        */}
        <Photo
          uri={photoUri}
          cacheKey={item.id}
          style={styles.photo}
          iconSize={40}
          accessibilityLabel={`Photo of ${item.description}`}
        />

        <View style={styles.info}>
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
          <Text style={styles.place} numberOfLines={2}>
            {item.place}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.postedAt}>{postedAt}</Text>
            <StatusBadge status={item.status} />
          </View>
        </View>
      </Pressable>

      {/*
        Sem confirmação: a troca se desfaz apertando o mesmo botão de novo, então um diálogo só
        acrescentaria um toque a algo que não tem como dar errado de vez.
      */}
      {onToggleStatus ? (
        <TouchableOpacity
          style={[
            styles.action,
            (changing || disabled) && styles.actionDisabled,
          ]}
          onPress={() => onToggleStatus(item)}
          disabled={changing || disabled}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${item.description}`}
          accessibilityState={{
            disabled: changing || disabled,
            busy: changing,
          }}
        >
          {changing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.actionText}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
