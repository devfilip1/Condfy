import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import {
  readAppearance,
  writeAppearance,
} from "@/features/settings/services/appearanceStorage";
import { Scheme, ThemeProvider } from "@/shared/theme";

/**
 * Quem DECIDE a aparência do aplicativo.
 *
 * `shared/theme` carrega a paleta e não sabe de onde ela vem; aqui é onde se lê o que a pessoa
 * escolheu e, na falta disso, como o aparelho está configurado. O resultado desce para
 * `ThemeProvider` por prop.
 *
 * São três situações e duas opções: `preference` é `null` até a primeira escolha, e enquanto for
 * `null` o aplicativo segue o aparelho — inclusive quando ele troca de claro para escuro com o
 * aplicativo aberto. Depois de escolher não há como voltar a "seguir o aparelho": o pedido foi de
 * duas opções.
 */

export type AppearancePreference = Scheme | null;

export interface UseAppearanceResult {
  /** O que está na tela agora. */
  scheme: Scheme;
  /** O que a pessoa escolheu, ou `null` se nunca escolheu. */
  preference: AppearancePreference;
  setAppearance: (scheme: Scheme) => void;
}

const AppearanceContext = createContext<UseAppearanceResult | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const deviceScheme: Scheme = useColorScheme() === "dark" ? "dark" : "light";
  const [preference, setPreference] = useState<AppearancePreference>(null);

  // Enquanto a leitura não termina vale a aparência do aparelho. É rápido, e um instante na
  // aparência do aparelho é melhor que segurar a abertura do aplicativo por isso.
  useEffect(() => {
    let cancelled = false;
    void readAppearance().then((stored) => {
      if (!cancelled && stored !== null) {
        setPreference(stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearance = useCallback((scheme: Scheme) => {
    setPreference(scheme);
    void writeAppearance(scheme);
  }, []);

  const scheme = preference ?? deviceScheme;

  const value = useMemo<UseAppearanceResult>(
    () => ({ scheme, preference, setAppearance }),
    [scheme, preference, setAppearance]
  );

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider scheme={scheme}>{children}</ThemeProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): UseAppearanceResult {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error("useAppearance precisa estar dentro de <AppearanceProvider>.");
  }
  return value;
}
