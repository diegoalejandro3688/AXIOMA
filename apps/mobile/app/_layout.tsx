import { Stack } from 'expo-router';
import { FullScreenLoader } from '../components/full-screen-loader';
import { AuthProvider, useAuth } from '../lib/auth/auth-provider';
import { OnboardingProvider, useOnboarding } from '../lib/onboarding/onboarding-provider';

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
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <RootNavigator />
      </OnboardingProvider>
    </AuthProvider>
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
