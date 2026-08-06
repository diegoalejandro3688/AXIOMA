import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CompetitiveContext } from '@axioma/contracts';
import { describeMyPosition } from '../../lib/leaderboard/paginate-leaderboard';
import { describePositionCardEmptyState, type PositionCardVariant } from '../../lib/competitive/position-card-copy';
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
      <View style={styles.card}>
        <Text style={styles.emptyMessage}>{empty.message}</Text>
        {empty.showAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Ir a Competir" onPress={() => router.push('/(tabs)/competir')} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Ir a Competir</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.league}>{view.leagueName}</Text>
      <Text style={styles.rank}>Posición #{view.rankPosition}</Text>
      <Text style={styles.points}>{view.metricValue} puntos de liga</Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    card: {
      backgroundColor: t.color.background.inverse,
      borderRadius: 14,
      padding: 16,
      gap: 4,
    },
    emptyMessage: { fontSize: 14, color: t.color.text.onInverse },
    actionButton: { marginTop: 8, alignSelf: 'flex-start' as const, backgroundColor: t.color.accent.default, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    actionButtonText: { color: t.color.text.onAccent, fontWeight: '700' as const },
    league: { fontSize: 16, fontWeight: '700' as const, color: t.color.text.onInverse },
    rank: { fontSize: 14, color: t.color.text.onInverse },
    points: { fontSize: 13, color: t.color.text.onInverse },
  };
}
