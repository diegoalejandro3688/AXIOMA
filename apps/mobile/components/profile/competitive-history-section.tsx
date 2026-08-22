import { View } from 'react-native';
import type { CompetitiveHistoryResponse, SeasonHistoryEntry } from '@axioma/contracts';
import { Text, Card, Chip } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';
import type { ChipVariant } from '../ui';

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
      <Text variant="titleLarge" weight="bold" accessibilityRole="header">
        Historial competitivo
      </Text>
      {history.seasons.length === 0 ? (
        <Text variant="bodySmall" color="secondary">
          Todavía no has finalizado ninguna temporada.
        </Text>
      ) : (
        history.seasons.map((season) => <SeasonRow key={`${season.seasonKey}-${season.leagueKey}`} season={season} />)
      )}
    </View>
  );
}

function SeasonRow({ season }: { season: SeasonHistoryEntry }) {
  const styles = useThemedStyles(createStyles);
  const outcome = describeOutcome(season.outcome);

  return (
    <Card variant="outlined" style={styles.row}>
      <View style={styles.rowHeader}>
        <Text variant="bodySmall" weight="bold">
          {season.seasonName}
        </Text>
        <Chip label={outcome.label} variant={outcome.chipVariant} />
      </View>
      <Text variant="bodySmall" color="secondary">
        {season.leagueName}
      </Text>
      <Text variant="caption" color="muted">
        Posición final #{season.finalRank} · {season.metricValue} puntos de liga
      </Text>
    </Card>
  );
}

/**
 * `Chip` (UI-1) no tiene una variante "info" -- el original usaba
 * `state.info` (azul) para RETAINED. Se usa `accent` (también azul) como
 * la variante existente más cercana, mismo criterio de desviación menor
 * documentado en Unidades (UI-4).
 */
function describeOutcome(outcome: SeasonHistoryEntry['outcome']): { label: string; chipVariant: ChipVariant } {
  switch (outcome) {
    case 'PROMOTED':
      return { label: 'Ascendiste', chipVariant: 'success' };
    case 'DEMOTED':
      return { label: 'Descendiste', chipVariant: 'error' };
    case 'RETAINED':
      return { label: 'Te mantuviste', chipVariant: 'accent' };
  }
}

function createStyles(_t: ThemeTokens) {
  return {
    container: { gap: 12 },
    row: { gap: 4 },
    rowHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  };
}
