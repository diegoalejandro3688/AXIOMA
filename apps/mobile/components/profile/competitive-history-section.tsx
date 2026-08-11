import { Text, View } from 'react-native';
import type { CompetitiveHistoryResponse, SeasonHistoryEntry } from '@axioma/contracts';
import { useThemedStyles, useTheme } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * LEF Bloque V, Incremento 4/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §12) --
 * historial competitivo cross-temporada, PRIVADO sin excepción (§4.5).
 * Renderiza EXACTAMENTE los valores ya congelados que trae
 * `GET /user/me/advanced-profile` -- nunca recalcula `finalRank`/
 * `metricValue`/`outcome` (esas instantáneas son inmutables desde ADR-0020).
 *
 * `seasons: []` es un estado REAL ("nunca participó, o solo tiene la
 * temporada activa"), no un error -- se representa con un mensaje
 * informativo, mismo criterio que el resto de estados vacíos de este
 * bloque.
 */
export function CompetitiveHistorySection({ history }: { history: CompetitiveHistoryResponse }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Historial competitivo
      </Text>
      {history.seasons.length === 0 ? (
        <Text style={styles.emptyMessage}>Todavía no has finalizado ninguna temporada.</Text>
      ) : (
        history.seasons.map((season) => <SeasonRow key={`${season.seasonKey}-${season.leagueKey}`} season={season} />)
      )}
    </View>
  );
}

function SeasonRow({ season }: { season: SeasonHistoryEntry }) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const outcome = describeOutcome(season.outcome);
  const outcomeFamily = tokens.color.state[outcome.family];

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.seasonName}>{season.seasonName}</Text>
        <View style={[styles.outcomeBadge, { backgroundColor: outcomeFamily.background, borderColor: outcomeFamily.border }]}>
          <Text style={[styles.outcomeText, { color: outcomeFamily.text }]}>{outcome.label}</Text>
        </View>
      </View>
      <Text style={styles.leagueName}>{season.leagueName}</Text>
      <Text style={styles.rowMeta}>
        Posición final #{season.finalRank} · {season.metricValue} puntos de liga
      </Text>
    </View>
  );
}

function describeOutcome(outcome: SeasonHistoryEntry['outcome']): { label: string; family: 'success' | 'error' | 'info' } {
  switch (outcome) {
    case 'PROMOTED':
      return { label: 'Ascendiste', family: 'success' };
    case 'DEMOTED':
      return { label: 'Descendiste', family: 'error' };
    case 'RETAINED':
      return { label: 'Te mantuviste', family: 'info' };
  }
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12 },
    title: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    emptyMessage: { fontSize: 13, color: t.color.text.secondary },
    row: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    rowHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    seasonName: { fontSize: 14, fontWeight: '700' as const, color: t.color.text.primary },
    leagueName: { fontSize: 13, color: t.color.text.secondary },
    rowMeta: { fontSize: 12, color: t.color.text.muted },
    outcomeBadge: { borderWidth: 1, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
    outcomeText: { fontSize: 11, fontWeight: '700' as const },
  };
}
