import { View } from 'react-native';
import { useTheme, useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Dialog } from '../ui/dialog';
import { Text } from '../ui/text';
import { Icon } from '../ui/icon';
import { PREMIUM_PRICE_DISPLAY } from '../../lib/entitlement/pricing';
import type { PaywallOrigin } from '../../lib/entitlement/types';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.1.
 *
 * Paywall pre-Billing. Construido sobre el primitivo `Dialog` (Modal +
 * overlay + card) -- SIN route nueva, SIN bottom sheet, SIN modal custom.
 * Se renderiza UNA sola vez, por `PaywallProvider` (patron host): ninguna
 * pantalla lo importa directamente.
 *
 * Reglas congeladas:
 *   - encabezado contextual por `origin` (1 linea); el cuerpo es identico;
 *   - copy literal, SIN "sin limites" (el Tutor IA conserva limites diarios
 *     y de conversacion);
 *   - precio: UNICAMENTE de `lib/entitlement/pricing.ts` (constante temporal
 *     de Capa 2; Capa 3 la reemplaza por metadata real de Google Play);
 *   - "Disponible proximamente" es TEXTO DE ESTADO no interactivo, nunca un
 *     boton -- no hay compra en Capa 2;
 *   - "Ahora no" es la UNICA accion interactiva y cierra el Dialog.
 */
const HEADING: Record<PaywallOrigin, string> = {
  unit: 'Desbloquea esta unidad',
  resources: 'Accede a todos los recursos',
  exams: 'Desbloquea los Ensayos PAES',
  ai_quota: 'Amplía tu Tutor IA',
};

const BENEFITS: readonly string[] = [
  'Todas las unidades de cada materia',
  'Todos los recursos',
  'Todos los Ensayos PAES',
  'Más consultas con el Tutor IA',
];

export function PremiumPaywall({
  origin,
  onRequestClose,
}: {
  origin: PaywallOrigin | null;
  onRequestClose: () => void;
}) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Dialog
      visible={origin !== null}
      onRequestClose={onRequestClose}
      title="ZETRYND Premium"
      secondaryAction={{ label: 'Ahora no', onPress: onRequestClose, variant: 'tertiary' }}
    >
      {origin ? (
        <View style={styles.body}>
          <Text variant="titleMedium">{HEADING[origin]}</Text>

          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Icon name="check" size={16} color={tokens.color.state.warning.text} />
                <Text variant="bodySmall" color="secondary" style={styles.benefitText}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          <Text variant="titleMedium" style={styles.price}>
            {PREMIUM_PRICE_DISPLAY}
          </Text>

          {/* Estado, no accion: no hay compra en Capa 2. */}
          <Text variant="caption" color="muted" accessibilityRole="text">
            Disponible próximamente
          </Text>
        </View>
      ) : null}
    </Dialog>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    body: { gap: spacing.space3 },
    benefits: { gap: spacing.space2 },
    benefitRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: spacing.space2 },
    benefitText: { flex: 1 },
    price: { color: t.color.text.primary },
  };
}
