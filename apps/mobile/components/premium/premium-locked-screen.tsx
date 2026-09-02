import { View } from 'react-native';
import { useTheme, useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { usePaywall } from '../../lib/entitlement/paywall-context';
import type { PaywallOrigin } from '../../lib/entitlement/types';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.1.
 *
 * Pantalla completa para una ruta Premium alcanzada por deep-link / restored
 * route con la cuenta en FREE (o cuando el backend devuelve `403
 * PREMIUM_REQUIRED` pese a un entitlement stale). Reemplaza a `ErrorState`
 * SOLO en ese caso.
 *
 * `onBack` es OBLIGATORIO y EXPLICITO -- este componente NO conoce rutas ni
 * infiere el destino de `origin`. Cada pantalla de C2.2 pasa su propio
 * `router.canGoBack() ? router.back() : router.replace(<padre seguro>)`.
 *
 * "Ver Premium" abre el paywall con el `origin` recibido; cerrarlo devuelve
 * a esta misma pantalla (sin re-fetch, sin re-navegacion -> sin bucle).
 */
const TITLE: Record<PaywallOrigin, string> = {
  unit: 'Esta unidad es Premium',
  resources: 'El modo Recursos es Premium',
  exams: 'Los Ensayos son Premium',
  ai_quota: 'Amplía tu Tutor IA',
};

const MESSAGE: Record<PaywallOrigin, string> = {
  unit: 'Desbloquea todas las unidades con ZETRYND Premium.',
  resources: 'Accede al catálogo completo de recursos con ZETRYND Premium.',
  exams: 'Rinde los Ensayos PAES con ZETRYND Premium.',
  ai_quota: 'Amplía tus consultas del Tutor IA con ZETRYND Premium.',
};

export function PremiumLockedScreen({
  origin,
  onBack,
  message,
}: {
  origin: PaywallOrigin;
  onBack: () => void;
  message?: string;
}) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const { open } = usePaywall();

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon name="lock" size={28} color={tokens.color.state.warning.text} />
      <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
        {TITLE[origin]}
      </Text>
      <Text variant="bodySmall" color="secondary" style={styles.message}>
        {message ?? MESSAGE[origin]}
      </Text>
      <Button variant="primary" label="Ver Premium" onPress={() => open(origin)} style={styles.cta} />
      <Button variant="tertiary" label="Volver" onPress={onBack} />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.space3,
      padding: spacing.space6,
      backgroundColor: t.color.background.default,
    },
    title: { textAlign: 'center' as const },
    message: { textAlign: 'center' as const },
    cta: { marginTop: spacing.space2 },
  };
}
