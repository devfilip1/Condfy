import { Octicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ProfileCondominium, condominiumPhotoUri } from "@/features/auth";
import Photo from "@/shared/components/Photo";
import { fontSizes, fonts, makeStyles, useTheme } from "@/shared/theme";

/**
 * O banner da home: a foto e o nome do condomínio em que a pessoa está.
 *
 * Componente puro: recebe o condomínio e o callback por props (constituição, Princípio II).
 *
 * Até a feature 009 isto era uma imagem fixa, a mesma para qualquer prédio. Agora a foto é DO
 * condomínio — a mesma que aparece no card dele na tela de escolha —, e é ela que diz, antes de
 * qualquer texto, em qual prédio a pessoa está agindo.
 */

const BANNER_HEIGHT = 200;
const BANNER_RADIUS = 35;

export interface BannerProps {
  /** `null` enquanto o perfil não chegou, ou para quem não tem condomínio nenhum. */
  condominium: ProfileCondominium | null;
  /** Abre a escolha de condomínio. Ausente para quem tem um só: não há para o que trocar. */
  onSwitch?: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    // Altura fixa: sem foto, com foto lenta ou quebrada, o que vem embaixo não sai do lugar.
    banner: {
      width: "100%",
      height: BANNER_HEIGHT,
      borderRadius: BANNER_RADIUS,
      overflow: "hidden",
    },
    photo: {
      width: "100%",
      height: BANNER_HEIGHT,
    },
    // Faixa escura atrás do nome: a foto é de qualquer cor, e texto branco direto sobre ela ficaria
    // ilegível num céu claro.
    nameStrip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: colors.overlay,
    },
    name: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      textTransform: "uppercase",
      color: colors.textOnOverlay,
    },
    switch: {
      position: "absolute",
      top: 14,
      right: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 14,
      paddingVertical: 8,
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.15)",
    },
    switchText: {
      fontSize: fontSizes.label,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
  })
);

export default function Banner({ condominium, onSwitch }: BannerProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.banner}>
      <Photo
        // `condominiumPhotoUri` resolve as duas origens da foto. O `id` é a chave de cache: o
        // caminho de uma foto enviada é assinado e muda a cada carga do perfil, a foto não.
        uri={condominium ? condominiumPhotoUri(condominium) : null}
        cacheKey={condominium?.id}
        style={styles.photo}
        iconSize={48}
        accessibilityLabel={
          condominium ? `Photo of ${condominium.name}` : undefined
        }
      />

      {condominium ? (
        <View style={styles.nameStrip}>
          <Text style={styles.name} numberOfLines={1}>
            {condominium.name}
          </Text>
        </View>
      ) : null}

      {onSwitch ? (
        <TouchableOpacity
          style={styles.switch}
          onPress={onSwitch}
          accessibilityRole="button"
          accessibilityLabel="Switch condominium"
        >
          <Octicons name="arrow-switch" size={14} color={colors.textPrimary} />
          <Text style={styles.switchText}>Switch</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
