import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, Pressable, View } from 'react-native';
import type { LeaderboardRow } from '@axioma/contracts';
import { getLeaderboardPage } from '../../../lib/api/competitive';
import { mergeLeaderboardPages, describeMyPosition } from '../../../lib/leaderboard/paginate-leaderboard';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      entries: LeaderboardRow[];
      nextCursor: string | null;
      competitiveContext: import('@axioma/contracts').CompetitiveContext | null;
      loadingMore: boolean;
      loadMoreError: string | null;
    };

/**
 * Ranking -- Bloque IV, Incremento 5, sub-incremento 5.b. Consume el
 * backend ya cerrado (3.c, ADR-0021 §1/§5): `GET /user/public-profile/me/leaderboard`.
 * Sin lógica de redacción/privacidad propia -- renderiza EXACTAMENTE la
 * unión discriminada que entrega el backend (`presentable: true/false`),
 * nunca reinterpreta ni reconstruye campos.
 *
 * Paginación V1: botón "Ver más" explícito, NUNCA scroll infinito
 * (decisión del Product Owner). Páginas se ACUMULAN (`mergeLeaderboardPages`),
 * nunca reemplazan lo ya cargado. Un fallo al cargar una página adicional
 * conserva las filas ya visibles y ofrece un reintento LOCALIZADO (footer
 * de la lista) -- nunca `ErrorState` de pantalla completa, que solo se usa
 * para el fallo de la carga INICIAL.
 */
export default function RankingScreen() {
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getLeaderboardPage();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setState({
      status: 'ready',
      entries: result.data.entries,
      nextCursor: result.data.nextCursor,
      competitiveContext: result.data.competitiveContext,
      loadingMore: false,
      loadMoreError: null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLoadMore() {
    if (state.status !== 'ready' || state.nextCursor === null) return;
    // Protección contra doble toque -- una carga de página adicional ya en curso bloquea otra.
    if (state.loadingMore) return;

    const cursor = state.nextCursor;
    setState((prev) => (prev.status === 'ready' ? { ...prev, loadingMore: true, loadMoreError: null } : prev));

    const result = await getLeaderboardPage(cursor);

    if (!result.ok) {
      // Conserva las filas ya cargadas -- NUNCA ErrorState de pantalla completa por esto.
      setState((prev) => (prev.status === 'ready' ? { ...prev, loadingMore: false, loadMoreError: result.message } : prev));
      return;
    }

    setState((prev) =>
      prev.status === 'ready'
        ? {
            status: 'ready',
            entries: mergeLeaderboardPages(prev.entries, result.data.entries),
            nextCursor: result.data.nextCursor,
            competitiveContext: result.data.competitiveContext,
            loadingMore: false,
            loadMoreError: null,
          }
        : prev,
    );
  }

  if (state.status === 'loading') return <LoadingState message="Cargando ranking…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const myPosition = describeMyPosition(state.competitiveContext);

  return (
    <View style={styles.container}>
      <View style={styles.myPositionCard}>
        <Text style={styles.myPositionTitle}>Tu posición</Text>
        {myPosition.kind === 'pending' ? (
          <Text style={styles.myPositionPending}>Actualizando tu posición…</Text>
        ) : (
          <>
            <Text style={styles.myPositionLeague}>{myPosition.leagueName}</Text>
            <Text style={styles.myPositionRank}>Posición #{myPosition.rankPosition}</Text>
            <Text style={styles.myPositionPoints}>{myPosition.metricValue} puntos de liga</Text>
          </>
        )}
      </View>

      {state.entries.length === 0 ? (
        <EmptyState message="Todavía no hay participantes en tu grupo." />
      ) : (
        <FlatList
          data={state.entries}
          keyExtractor={(row) => String(row.rankPosition)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <LeaderboardRowCard row={item} styles={styles} />}
          ListFooterComponent={
            <View style={styles.footer}>
              {state.loadMoreError ? <Text style={styles.loadMoreError}>{state.loadMoreError}</Text> : null}
              {state.nextCursor !== null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver más"
                  onPress={handleLoadMore}
                  disabled={state.loadingMore}
                  style={[styles.loadMoreButton, state.loadingMore && styles.loadMoreButtonDisabled]}
                >
                  {state.loadingMore ? <ActivityIndicator /> : <Text style={styles.loadMoreButtonText}>Ver más</Text>}
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

/**
 * Renderiza EXACTAMENTE lo que la unión discriminada permite -- la rama
 * `presentable: false` no puede, ni en tiempo de compilación, leer
 * `username`/`avatar`/`equippedTitle`/`equippedCosmetics`/`levelNumber`/
 * `publicAchievements` (TypeScript los excluye del tipo de esa rama).
 */
function LeaderboardRowCard({ row, styles }: { row: LeaderboardRow; styles: ReturnType<typeof createStyles> }) {
  const highlight = row.isCurrentUser;

  if (!row.presentable) {
    return (
      <View style={[styles.row, highlight && styles.rowHighlighted]}>
        <Text style={styles.rankPosition}>#{row.rankPosition}</Text>
        <Text style={styles.redactedLabel}>Perfil privado</Text>
        <Text style={styles.metricValue}>{row.metricValue}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, highlight && styles.rowHighlighted]}>
      <Text style={styles.rankPosition}>#{row.rankPosition}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.username}>{row.username}</Text>
        {row.equippedTitle ? <Text style={styles.equippedTitle}>{row.equippedTitle.displayText}</Text> : null}
        <Text style={styles.levelNumber}>Nivel {row.levelNumber}</Text>
      </View>
      <Text style={styles.metricValue}>{row.metricValue}</Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: t.color.background.default },
    myPositionCard: {
      backgroundColor: t.color.background.inverse,
      borderRadius: 14,
      padding: 16,
      gap: 4,
    },
    myPositionTitle: { fontSize: 13, fontWeight: '700' as const, color: t.color.text.onInverse, textTransform: 'uppercase' as const },
    myPositionPending: { fontSize: 14, color: t.color.text.onInverse },
    myPositionLeague: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.onInverse },
    myPositionRank: { fontSize: 15, color: t.color.text.onInverse },
    myPositionPoints: { fontSize: 13, color: t.color.text.onInverse },
    list: { gap: 8, paddingBottom: 24 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 12,
      padding: 12,
    },
    rowHighlighted: { borderColor: t.color.accent.default, backgroundColor: t.color.accent.subtleBg },
    rankPosition: { fontSize: 15, fontWeight: '700' as const, color: t.color.text.secondary, minWidth: 36 },
    rowInfo: { flex: 1, gap: 2 },
    username: { fontSize: 15, fontWeight: '600' as const, color: t.color.text.primary },
    equippedTitle: { fontSize: 12, color: t.color.text.secondary },
    levelNumber: { fontSize: 12, color: t.color.text.muted },
    redactedLabel: { flex: 1, fontSize: 14, color: t.color.text.muted, fontStyle: 'italic' as const },
    metricValue: { fontSize: 15, fontWeight: '700' as const, color: t.color.text.primary },
    footer: { gap: 8, paddingTop: 8, alignItems: 'center' as const },
    loadMoreError: { fontSize: 13, color: t.color.state.error.text, textAlign: 'center' as const },
    loadMoreButton: { backgroundColor: t.color.accent.default, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' as const },
    loadMoreButtonDisabled: { opacity: 0.5 },
    loadMoreButtonText: { color: t.color.text.onAccent, fontWeight: '700' as const },
  };
}
