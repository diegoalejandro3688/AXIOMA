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
 *
 * PRF-COPY-01 -- la etiqueta de cada fila se DERIVA de la ventana de la
 * temporada (`seasonStartsAt`), nunca del `seasonName` crudo del backend:
 * ese campo es "Temporada semanal {fecha}" para las temporadas canónicas
 * pero un identificador interno (seeds/QA/legacy, p.ej. nombres con "gate")
 * para el resto, y no debe llegar nunca a la UI. La derivación reproduce
 * exactamente el nombre canónico -- `startsAt` es el lunes 00:00 local
 * `America/Santiago`, cuyo instante UTC cae siempre en la misma fecha de
 * calendario, así que la fecha en UTC es la fecha local de inicio.
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

/**
 * Etiqueta visible de la temporada -- SIEMPRE derivada de la ventana, nunca
 * el `seasonName` interno (ver cabecera, PRF-COPY-01). Formato idéntico al
 * nombre canónico del backend: `Temporada semanal AAAA-MM-DD`.
 */
export function seasonWindowLabel(startsAtIso: string): string {
  const d = new Date(startsAtIso);
  if (Number.isNaN(d.getTime())) return 'Temporada anterior';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `Temporada semanal ${yyyy}-${mm}-${dd}`;
}

function SeasonRow({ season }: { season: SeasonHistoryEntry }) {
  const styles = useThemedStyles(createStyles);
  const outcome = describeOutcome(season.outcome);

  return (
    <Card variant="outlined" style={styles.row}>
      {/*
        PRF-COPY-02 -- encabezado en tres filas para que nada se recorte en
        pantallas angostas: (1) el título de temporada ocupa su propia línea
        y se lee completo; (2) liga a la izquierda / badge de resultado a la
        derecha, con `flexWrap` + `flexShrink` para que el chip nunca choque
        contra el borde ni se corte; (3) posición/puntos. Sin achicar la
        tipografía -- es un ajuste de estructura flex.
      */}
      <Text variant="bodySmall" weight="bold">
        {seasonWindowLabel(season.seasonStartsAt)}
      </Text>
      <View style={styles.metaRow}>
        <Text variant="bodySmall" color="secondary" style={styles.leagueName}>
          {season.leagueName}
        </Text>
        <Chip label={outcome.label} variant={outcome.chipVariant} />
      </View>
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
    row: { gap: 6 },
    // Liga <-> badge de resultado. `wrap` + `columnGap` dejan que el chip
    // baje a otra línea (alineado a la izquierda) antes de recortarse en
    // pantallas muy angostas; `leagueName` cede espacio primero.
    metaRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      columnGap: 8,
      rowGap: 4,
    },
    leagueName: { flexShrink: 1 },
  };
}
