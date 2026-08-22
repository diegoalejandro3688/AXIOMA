import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CompetitiveContext } from '@axioma/contracts';
import { describeMyPosition } from '../../lib/leaderboard/paginate-leaderboard';
import { describePositionCardEmptyState, type PositionCardVariant } from '../../lib/competitive/position-card-copy';
import { Text, Card, Button, Icon } from '../ui';
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
      <Card variant="brand" style={[styles.card, styles.cardEmpty]}>
        <View style={styles.header}>
          <Icon name="shield" size={16} color="onInverse" />
          <Text variant="bodySmall" color="onInverse" style={styles.emptyMessage}>
            {empty.message}
          </Text>
        </View>
        {empty.showAction ? (
          <Button
            variant="primary"
            size="small"
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
      <View style={styles.header}>
        <Icon name="shield" size={18} color="onInverse" />
        <Text variant="titleMedium" weight="bold" color="onInverse">
          {view.leagueName}
        </Text>
      </View>
      <Text variant="bodySmall" color="onInverse">
        Posición #{view.rankPosition} · {view.metricValue} puntos de liga
      </Text>
    </Card>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    card: { gap: 4, paddingVertical: 12 },
    cardEmpty: { gap: 8 },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    emptyMessage: { flex: 1 },
    actionButton: { alignSelf: 'flex-start' as const },
  };
}
