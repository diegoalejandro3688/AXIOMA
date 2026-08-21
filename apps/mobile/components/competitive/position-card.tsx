import { useRouter } from 'expo-router';
import type { CompetitiveContext } from '@axioma/contracts';
import { describeMyPosition } from '../../lib/leaderboard/paginate-leaderboard';
import { describePositionCardEmptyState, type PositionCardVariant } from '../../lib/competitive/position-card-copy';
import { Text, Card, Button } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Tarjeta de contexto competitivo -- MISMO componente para el perfil
 * PROPIO y el de un TERCERO (`variant`), copy contextual cuando
 * `competitive` es `null` (precisión obligatoria del Product Owner, ver
 * `lib/competitive/position-card-copy.ts`). Reutiliza `describeMyPosition`
 * ya construido y gateado en 5.b -- sin una segunda implementación
 * paralela del mismo mapeo.
 */
export function CompetitivePositionCard({ competitive, variant }: { competitive: CompetitiveContext | null; variant: PositionCardVariant }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const view = describeMyPosition(competitive);

  if (view.kind === 'pending') {
    const empty = describePositionCardEmptyState(variant);
    return (
      <Card variant="brand" style={styles.card}>
        <Text variant="body" color="onInverse">
          {empty.message}
        </Text>
        {empty.showAction ? (
          <Button
            variant="primary"
            label="Ir a Competir"
            accessibilityLabel="Ir a Competir"
            onPress={() => router.push('/(tabs)/competir')}
            style={styles.actionButton}
          />
        ) : null}
      </Card>
    );
  }

  return (
    <Card variant="brand" style={styles.card}>
      <Text variant="titleMedium" weight="bold" color="onInverse">
        {view.leagueName}
      </Text>
      <Text variant="body" color="onInverse">
        Posición #{view.rankPosition}
      </Text>
      <Text variant="caption" color="onInverse">
        {view.metricValue} puntos de liga
      </Text>
    </Card>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    card: { gap: 4 },
    actionButton: { marginTop: 8, alignSelf: 'flex-start' as const },
  };
}
