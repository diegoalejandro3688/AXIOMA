import { View } from 'react-native';
import { useTheme, useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Dialog } from '../ui/dialog';
import { Text } from '../ui/text';
import { Icon } from '../ui/icon';
import { Button } from '../ui/button';
import { PREMIUM_PRICE_DISPLAY } from '../../lib/entitlement/pricing';
import { useBilling } from '../../lib/billing/billing-provider';
import type { PaywallOrigin } from '../../lib/entitlement/types';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.1 -> Capa 3 (Google Play Billing),
 * PB-2B (cableado minimo de compra; PB-2C es el rediseño comercial final).
 *
 * Paywall sobre el primitivo `Dialog` -- SIN route nueva, SIN bottom sheet,
 * SIN modal custom. Se renderiza UNA sola vez por `PaywallProvider`.
 *
 * Reglas congeladas:
 *   - encabezado contextual por `origin`; cuerpo identico; copy SIN "sin
 *     limites";
 *   - PRECIO: cuando `useBilling().product === 'available'`, se muestra el
 *     precio LOCALIZADO real de Google Play (`premiumProduct.localizedPrice`)
 *     -- esa es la autoridad de compra. Cuando NO hay metadata de Google
 *     disponible, se muestra `PREMIUM_PRICE_DISPLAY` de
 *     `lib/entitlement/pricing.ts` EXPLICITAMENTE etiquetado como
 *     "precio referencial" y el boton de compra queda DESHABILITADO -- el
 *     string estatico NUNCA se presenta como precio comprable en vivo.
 *   - COMPRA: `useBilling().purchase()` lanza el flujo nativo con atribucion
 *     de cuenta (billing-context -> obfuscatedAccountId). El resultado se
 *     deriva SIEMPRE del backend: este componente NUNCA concede Premium. La
 *     UI de estado (`purchaseFlow`) es informativa.
 *   - "Restaurar compras": `useBilling().restore()` -- reconcilia por backend,
 *     nunca concede localmente.
 *   - "Ahora no" cierra el Dialog (y resetea el estado de compra).
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

const FLOW_MESSAGE: Record<string, string> = {
  launching: 'Abriendo Google Play…',
  reconciling: 'Verificando tu compra…',
  success: '¡Listo! Tu acceso Premium se activará en un momento.',
  pending: 'Tu pago está pendiente. Te avisaremos cuando se confirme.',
  cancelled: 'Cancelaste la compra.',
};

const ERROR_MESSAGE: Record<string, string> = {
  billing_context_failed: 'No pudimos preparar la compra. Revisa tu conexión e inténtalo de nuevo.',
  launch_failed: 'No se pudo abrir Google Play. Inténtalo de nuevo.',
  account_mismatch: 'Esta suscripción está asociada a otra cuenta.',
  unverifiable: 'No pudimos verificar la compra. Inténtalo más tarde.',
  invalid_product: 'La compra no corresponde a ZETRYND Premium.',
  retryable: 'No pudimos confirmar la compra. Vuelve a intentarlo en un momento.',
  store_error: 'Ocurrió un problema con Google Play. Inténtalo de nuevo.',
};

export function PremiumPaywall({
  origin,
  onRequestClose,
}: {
  origin: PaywallOrigin | null;
  onRequestClose: () => void;
}) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const billing = useBilling();

  const liveProduct =
    billing.supported && billing.product === 'available' ? billing.premiumProduct : null;
  const displayPrice = liveProduct ? liveProduct.localizedPrice : PREMIUM_PRICE_DISPLAY;
  const canPurchase = liveProduct !== null && !billing.busy;

  const handleClose = () => {
    billing.resetPurchaseFlow();
    onRequestClose();
  };

  const flowMsg =
    billing.purchaseFlow === 'error'
      ? ERROR_MESSAGE[billing.purchaseError ?? 'store_error']
      : FLOW_MESSAGE[billing.purchaseFlow];

  return (
    <Dialog
      visible={origin !== null}
      onRequestClose={handleClose}
      title="ZETRYND Premium"
      secondaryAction={{ label: 'Ahora no', onPress: handleClose, variant: 'tertiary' }}
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
            {displayPrice}
          </Text>

          {liveProduct ? (
            <Button
              label="Suscribirme"
              accessibilityLabel="Suscribirme a ZETRYND Premium"
              onPress={() => {
                void billing.purchase();
              }}
              loading={billing.busy}
              disabled={!canPurchase}
            />
          ) : (
            <>
              <Text variant="caption" color="muted">
                Precio referencial. El precio final lo confirma Google Play.
              </Text>
              {/* Estado, no accion: sin metadata de Google no hay compra disponible. */}
              <Text variant="caption" color="muted" accessibilityRole="text">
                Disponible próximamente
              </Text>
            </>
          )}

          {flowMsg ? (
            <Text
              variant="caption"
              color={billing.purchaseFlow === 'error' ? 'muted' : 'secondary'}
              accessibilityRole="text"
            >
              {flowMsg}
            </Text>
          ) : null}

          {billing.supported ? (
            <Button
              label="Restaurar compras"
              accessibilityLabel="Restaurar compras anteriores"
              variant="tertiary"
              size="small"
              onPress={() => {
                void billing.restore();
              }}
              disabled={billing.busy}
            />
          ) : null}
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
