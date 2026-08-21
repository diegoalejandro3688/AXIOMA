import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LeaderboardRow } from '@axioma/contracts';
import { getLeaderboardPage } from '../../../lib/api/competitive';
import { mergeLeaderboardPages, describeMyPosition } from '../../../lib/leaderboard/paginate-leaderboard';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { Text, Card, Button } from '../../../components/ui';
import { useThemedStyles, radii } from '../../../theme';
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
  const router = useRouter();
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
      <Card variant="brand" style={styles.myPositionCard}>
        <Text variant="caption" weight="bold" color="onInverse" style={styles.myPositionTitle}>
          Tu posición
        </Text>
        {myPosition.kind === 'pending' ? (
          <Text variant="body" color="onInverse">
            Actualizando tu posición…
          </Text>
        ) : (
          <>
            <Text variant="heading2" color="onInverse">
              {myPosition.leagueName}
            </Text>
            <Text variant="titleMedium" color="onInverse">
              Posición #{myPosition.rankPosition}
            </Text>
            <Text variant="caption" color="onInverse">
              {myPosition.metricValue} puntos de liga
            </Text>
          </>
        )}
      </Card>

      {state.entries.length === 0 ? (
        <EmptyState message="Todavía no hay participantes en tu grupo." />
      ) : (
        <FlatList
          data={state.entries}
          keyExtractor={(row) => String(row.rankPosition)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <LeaderboardRowCard row={item} styles={styles} router={router} />}
          ListFooterComponent={
            <View style={styles.footer}>
              {state.loadMoreError ? (
                <Text variant="bodySmall" color="error" style={styles.loadMoreError}>
                  {state.loadMoreError}
                </Text>
              ) : null}
              {state.nextCursor !== null ? (
                <Button
                  variant="secondary"
                  label="Ver más"
                  accessibilityLabel="Ver más"
                  onPress={handleLoadMore}
                  disabled={state.loadingMore}
                  loading={state.loadingMore}
                />
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
 *
 * Navegación al perfil (sub-incremento 5.c) ÚNICAMENTE desde una fila
 * presentable -- una fila redactada no tiene `username` que navegar, ni
 * siquiera se envuelve en `Pressable` (sin `onPress`, sin
 * `accessibilityRole="button"`).
 */
function LeaderboardRowCard({ row, styles, router }: { row: LeaderboardRow; styles: ReturnType<typeof createStyles>; router: ReturnType<typeof useRouter> }) {
  const highlight = row.isCurrentUser;

  if (!row.presentable) {
    return (
      <Card variant="outlined" style={[styles.row, highlight && styles.rowHighlighted]}>
        <Text variant="titleMedium" weight="bold" color="secondary" style={styles.rankPosition}>
          #{row.rankPosition}
        </Text>
        <Text variant="body" color="muted" style={styles.redactedLabel}>
          Perfil privado
        </Text>
        <Text variant="titleMedium" weight="bold">
          {row.metricValue}
        </Text>
      </Card>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${row.username}`}
      onPress={() => router.push({ pathname: '/(tabs)/competir/perfil/[username]', params: { username: row.username } })}
      style={[styles.row, highlight && styles.rowHighlighted]}
    >
      <Text variant="titleMedium" weight="bold" color="secondary" style={styles.rankPosition}>
        #{row.rankPosition}
      </Text>
      <View style={styles.rowInfo}>
        <Text variant="titleMedium" weight="semibold">
          {row.username}
        </Text>
        {row.equippedTitle ? (
          <Text variant="bodySmall" color="secondary">
            {row.equippedTitle.displayText}
          </Text>
        ) : null}
        <Text variant="caption" color="muted">
          Nivel {row.levelNumber}
        </Text>
      </View>
      <Text variant="titleMedium" weight="bold">
        {row.metricValue}
      </Text>
    </Pressable>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: t.color.background.default },
    myPositionCard: { gap: 4 },
    myPositionTitle: { textTransform: 'uppercase' as const },
    list: { gap: 8, paddingBottom: 24 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      borderRadius: radii.large,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      padding: 16,
    },
    rowInfo: { flex: 1, gap: 2 },
    rowHighlighted: { borderColor: t.color.accent.default, backgroundColor: t.color.accent.subtleBg },
    rankPosition: { minWidth: 36 },
    redactedLabel: { flex: 1, fontStyle: 'italic' as const },
    footer: { gap: 8, paddingTop: 8, alignItems: 'center' as const },
    loadMoreError: { textAlign: 'center' as const },
  };
}
