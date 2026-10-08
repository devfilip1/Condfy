import { Redirect, router } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BlockList from "@/features/condominiums/components/BlockList";
import {
  ADDRESS_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from "@/features/condominiums/domain/newCondominium";
import { useCreateCondominium } from "@/features/condominiums/hooks/useCreateCondominium";
import HeaderModule from "@/shared/components/HeaderModule";
import PhotoField from "@/shared/components/PhotoField";
import { fontSizes, fonts, makeStyles, radius, useTheme } from "@/shared/theme";

/**
 * Tela de criação de um condomínio: apenas composição.
 * Todo o state vem do hook `useCreateCondominium` (constituição, Princípio I).
 *
 * São quatro coisas, e mais nenhuma: o nome, o endereço, os blocos com as unidades, e a foto. Quem
 * confirma vira o SÍNDICO do condomínio e cai direto na home dele.
 */

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screenBackground,
    },
    flex: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 24,
      gap: 22,
    },
    label: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radius.control,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: fontSizes.body,
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    multiline: {
      minHeight: 76,
      textAlignVertical: "top",
    },
    error: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      color: colors.danger,
      marginTop: 6,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 30,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: 10,
    },
    submitError: {
      fontSize: fontSizes.label,
      fontFamily: fonts.regular,
      lineHeight: 18,
      color: colors.danger,
    },
    submit: {
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.control,
      backgroundColor: colors.accent,
    },
    submitDisabled: {
      opacity: 0.5,
    },
    submitLabel: {
      fontSize: fontSizes.heading,
      fontFamily: fonts.display,
      color: colors.textOnAccent,
    },
  })
);

export default function CreateCondominiumScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const form = useCreateCondominium();

  // Só cria um condomínio quem ainda não pertence a nenhum. Vale também para o instante depois de
  // criar: o perfil recarrega já com o condomínio novo, e o destino é a home de qualquer jeito.
  if (form.alreadyBelongs) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.screen}>
      <HeaderModule name="New condominium" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={form.setName}
              placeholder="Edifício Solar"
              placeholderTextColor={colors.textSecondary}
              maxLength={NAME_MAX_LENGTH}
              accessibilityLabel="Name of the condominium"
            />
            {form.errors.name ? (
              <Text style={styles.error}>{form.errors.name}</Text>
            ) : null}
          </View>

          <View>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={form.address}
              onChangeText={form.setAddress}
              placeholder="Street, number, city"
              placeholderTextColor={colors.textSecondary}
              maxLength={ADDRESS_MAX_LENGTH}
              multiline
              accessibilityLabel="Address of the condominium"
            />
            {form.errors.address ? (
              <Text style={styles.error}>{form.errors.address}</Text>
            ) : null}
          </View>

          <View>
            <Text style={styles.label}>Blocks</Text>
            <BlockList
              blocks={form.blocks}
              errors={form.errors}
              total={form.total}
              canAdd={form.canAddBlock}
              onAdd={form.addBlock}
              onRemove={form.removeBlock}
              onChangeCode={form.setBlockCode}
              onChangeUnitCount={form.setBlockUnitCount}
            />
          </View>

          <View>
            <Text style={styles.label}>Photo</Text>
            <PhotoField
              previewUri={form.photo?.previewUri ?? null}
              hint="Recommended: 1200 × 675 px (16:9)"
              accessibilityLabel="Photo of the condominium"
              error={form.errors.photo}
              disabled={form.submitting}
              onTake={() => form.pickPhoto("camera")}
              onChoose={() => form.pickPhoto("gallery")}
              onRemove={form.removePhoto}
            />
          </View>
        </ScrollView>

        {/*
          Fora do `ScrollView`: com muitos blocos a lista cresce, e o botão de confirmar precisa
          continuar alcançável sem rolar até o fim.
        */}
        <View style={styles.footer}>
          {form.submitError ? (
            <Text style={styles.submitError} accessibilityRole="alert">
              {form.submitError}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.submit, form.submitting && styles.submitDisabled]}
            onPress={form.submit}
            disabled={form.submitting}
            accessibilityRole="button"
            accessibilityState={{
              disabled: form.submitting,
              busy: form.submitting,
            }}
          >
            {form.submitting ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Text style={styles.submitLabel}>Create condominium</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
