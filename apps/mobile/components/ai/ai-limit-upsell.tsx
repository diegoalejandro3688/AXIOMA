import { View } from 'react-native';
import { useTheme, useThemedStyles, spacing, radii } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { useEntitlement } from '../../lib/entitlement/entitlement-provider';
import { usePaywall } from '../../lib/entitlement/paywall-context';
import { shouldShowAiLimitUpsell } from '../../lib/entitlement/ai-limit-upsell';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.4.
 *
 * Upsell OPCIONAL del Tutor IA. Vive FUERA de la superficie escaneada por
 * `verify:ai-mobile-gate.ts` (`allAiSources`) a proposito: es el unico lugar
 * de la superficie IA donde aparece el concepto comercial. Las pantallas del
 * Tutor (`ia/index.tsx`, `ia/conversation/[conversationId].tsx`) solo montan
 * `<AiLimitUpsell blocked={...} />` pasandole el estado de bloqueo que YA
 * derivan del servidor (`resolveSendAvailability`) -- sin literales de plan,
 * sin numeros de cuota, sin "premium"/"free" en su codigo.
 *
 * Contrato (congelado):
 *   - NO detecta cuota ni turnos, NO hace requests: recibe `blocked` ya
 *     resuelto por el servidor (cupo diario O limite de turnos, indistinto).
 *   - El servidor sigue siendo la unica autoridad de los limites.
 *   - Se muestra SOLO con `entitlement.state.status === 'ready'` Y
 *     `tier === 'FREE'` Y `blocked` -- ver `shouldShowAiLimitUpsell`.
 *   - PREMIUM (tiene sus propios limites V1), entitlement cargando y
 *     entitlement en error -> NO se muestra (nunca se infiere FREE).
 *   - NUNCA abre el paywall solo: solo al pulsar el CTA (`open('ai_quota')`).
 *   - Copy modesto: no "mejor modelo", no "mas rapido", no "sin limites".
 *   - Reutiliza el paywall global de C2.1 (`usePaywall`), sin modal/route
 *     propio, sin compra ni simulacion.
 *
 * El predicado vive en `lib/entitlement/ai-limit-upsell.ts` (puro, testable).
 */
export function AiLimitUpsell({ blocked }: { blocked: boolean }) {
  const { state } = useEntitlement();
  const { open } = usePaywall();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);

  if (!shouldShowAiLimitUpsell(state, blocked)) return null;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.headingRow}>
        <Icon name="ai" size={16} color={tokens.color.accent.strong} />
        <Text variant="titleMedium" style={styles.heading}>
          ¿Necesitas seguir estudiando con el Tutor?
        </Text>
      </View>
      <Text variant="bodySmall" color="secondary">
        Premium amplía tus consultas disponibles.
      </Text>
      <Button
        variant="primary"
        label="Amplía tu Tutor IA"
        accessibilityLabel="Amplía tu Tutor IA"
        onPress={() => open('ai_quota')}
        style={styles.cta}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    card: {
      marginHorizontal: spacing.space4,
      marginBottom: spacing.space2,
      gap: spacing.space2,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: radii.medium,
      padding: spacing.space3,
    },
    headingRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space2 },
    heading: { flex: 1 },
    cta: { alignSelf: 'flex-start' as const },
  };
}
