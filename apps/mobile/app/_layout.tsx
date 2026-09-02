import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { FullScreenLoader } from '../components/full-screen-loader';
import { AuthProvider, useAuth } from '../lib/auth/auth-provider';
import { OnboardingProvider, useOnboarding } from '../lib/onboarding/onboarding-provider';
// PREMIUM V1 -- Capa 2 (Mobile gating), C2.0. Fuente de verdad de authorization en mobile.
import { EntitlementProvider } from '../lib/entitlement/entitlement-provider';
import { ThemeProvider, useTheme, useColorSchemeName } from '../theme';

/**
 * Máquina de estados de navegación (ver ADR-0009):
 *   - auth cargando u onboarding cargando -> loader (nunca un flash de ruta incorrecta);
 *   - no autenticado -> solo (auth) es alcanzable;
 *   - autenticado + onboarding incompleto -> solo onboarding es alcanzable;
 *   - autenticado + onboarding completo -> solo (tabs) es alcanzable.
 *
 * `Stack.Protected` (expo-router) desmonta por completo la(s) rama(s) cuyo
 * guard es falso -- no quedan en el historial de navegación, por lo que un
 * enlace directo a una ruta protegida sin sesión, o "volver atrás" desde
 * onboarding hacia login, no aterrizan en un estado inválido.
 *
 * `ThemeProvider` (ver ADR-0015) envuelve todo el árbol -- header/fondo de
 * navegación y `StatusBar` quedan derivados de los mismos tokens que las
 * pantallas, para evitar el "flash" claro en modo oscuro al navegar.
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingProvider>
          <EntitlementProvider>
            <ThemedRootNavigator />
          </EntitlementProvider>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedRootNavigator() {
  const tokens = useTheme();
  const scheme = useColorSchemeName();

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: scheme === 'dark',
      colors: {
        ...base.colors,
        background: tokens.color.background.default,
        card: tokens.color.background.surface,
        text: tokens.color.text.primary,
        border: tokens.color.border.default,
        primary: tokens.color.accent.default,
        notification: tokens.color.state.error.text,
      },
    };
  }, [scheme, tokens]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationThemeProvider>
  );
}

function RootNavigator() {
  const auth = useAuth();
  const onboarding = useOnboarding();

  if (auth.status === 'loading' || onboarding.status === 'loading') {
    return <FullScreenLoader />;
  }

  const isAuthenticated = auth.status === 'authenticated';
  const isOnboardingComplete = onboarding.status === 'complete';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !isOnboardingComplete}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && isOnboardingComplete}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
