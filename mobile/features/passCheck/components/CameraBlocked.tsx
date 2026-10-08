import { Octicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PrimaryButton from "@/shared/components/PrimaryButton";
import { fontSizes, fonts, makeStyles, useTheme } from "@/shared/theme";

/**
 * A câmera não pode ser usada: por quê, e o que fazer.
 *
 * Componente puro (constituição, Princípio II). Existe para que uma permissão recusada, ou um
 * aparelho sem câmera, não seja uma tela preta: a portaria continua funcionando pela lista de
 * visitantes, e esta tela aponta para ela nos três casos.
 */

export interface CameraBlockedProps {
  /**
   * - `denied` — recusada, e o aparelho deixa perguntar de novo.
   * - `blocked` — recusada de vez: só as configurações do aparelho mudam.
   * - `unavailable` — não há câmera que o aplicativo consiga usar.
   */
  reason: "denied" | "blocked" | "unavailable";
  onAsk: () => void;
  /** Ausente onde não existe uma tela de configurações para abrir — o navegador. */
  onOpenSettings?: () => void;
  onSeeVisitors: () => void;
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 16,
    },
    title: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      textAlign: "center",
      color: colors.textPrimary,
    },
    text: {
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      lineHeight: 22,
      textAlign: "center",
      color: colors.textMuted,
    },
    actions: {
      alignSelf: "stretch",
      gap: 8,
      marginTop: 8,
    },
    link: {
      paddingVertical: 12,
      alignItems: "center",
    },
    linkLabel: {
      fontSize: fontSizes.body,
      fontFamily: fonts.semibold,
      color: colors.textPrimary,
    },
  })
);

export default function CameraBlocked({
  reason,
  onAsk,
  onOpenSettings,
  onSeeVisitors,
}: CameraBlockedProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  const noCamera = reason === "unavailable";

  return (
    <View style={styles.container}>
      <Octicons name="device-camera" size={56} color={colors.textMuted} />
      <Text style={styles.title}>
        {noCamera
          ? "This device has no camera Condfy can use."
          : "Condfy needs the camera to read a pass."}
      </Text>
      <Text style={styles.text}>
        {noCamera
          ? "You can still see who is expected in the Visitors list."
          : reason === "blocked"
            ? "Allow the camera for Condfy in your device's settings. Meanwhile, the Visitors list shows who is expected."
            : "Allow the camera to check passes. Meanwhile, the Visitors list shows who is expected."}
      </Text>

      <View style={styles.actions}>
        {reason === "denied" ? (
          <PrimaryButton
            label="Allow camera"
            busyLabel="Allow camera"
            busy={false}
            onPress={onAsk}
          />
        ) : null}
        {reason === "blocked" && onOpenSettings ? (
          <PrimaryButton
            label="Open settings"
            busyLabel="Open settings"
            busy={false}
            onPress={onOpenSettings}
          />
        ) : null}
        <TouchableOpacity
          style={styles.link}
          onPress={onSeeVisitors}
          accessibilityRole="button"
          accessibilityLabel="See the Visitors list"
        >
          <Text style={styles.linkLabel}>See the Visitors list</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
