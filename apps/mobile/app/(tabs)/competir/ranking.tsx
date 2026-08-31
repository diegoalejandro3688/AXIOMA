import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { CompetitiveContext, CompetitiveZone, LeaderboardRow } from '@axioma/contracts';
import { getLeaderboardPage } from '../../../lib/api/competitive';
import { mergeLeaderboardPages, describeMyPosition, describeZone } from '../../../lib/leaderboard/paginate-leaderboard';
import { leagueVisual } from '../../../lib/league/league-visual';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { Text, Card, Button, Avatar, Icon } from '../../../components/ui';
import { LeagueEmblem } from '../../../components/competitive/league-emblem';
import { LeagueTrophy } from '../../../components/competitive/league-trophy';
import { useThemedStyles, useTheme, useColorSchemeName, radii, spacing } from '../../../theme';
import type { ThemeTokens, IconName } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      entries: LeaderboardRow[];
      nextCursor: string | null;
      competitiveContext: CompetitiveContext | null;
      loadingMore: boolean;
      loadMoreError: string | null;
    };

/**
 * COMPETITIVE V1 (rediseño visual, Incremento 4) -- copy de la zona
 * competitiva de la PROPIA posición (tarjeta superior). La zona la decide el
 * backend (`competitiveContext.competitiveZone`); esto solo la traduce. El
 * móvil NUNCA calcula la zona ni sus límites.
 */
const OWN_ZONE: Record<CompetitiveZone, { label: string; icon: IconName | null; tone: 'promotion' | 'demotion' | 'neutral' }> = {
  PROMOTION: { label: 'Zona de ascenso', icon: 'chevron-up', tone: 'promotion' },
  RETENTION: { label: 'Zona de permanencia', icon: null, tone: 'neutral' },
  DEMOTION: { label: 'Zona de descenso', icon: 'chevron-down', tone: 'demotion' },
};

/**
 * Ranking -- Bloque IV, Incremento 5, sub-incremento 5.b. Consume el
 * backend ya cerrado (3.c, ADR-0021 §1/§5): `GET /user/public-profile/me/leaderboard`.
 * Sin lógica de redacción/privacidad propia -- renderiza EXACTAMENTE la
 * unión discriminada que entrega el backend (`presentable: true/false`),
 * nunca reinterpreta ni reconstruye campos.
 *
 * COMPETITIVE V1 (rediseño visual, Incremento 4) -- misma identidad que la
 * tarjeta de Liga: escudo real, trofeo + número para los LP, zona del
 * backend. Top 3 con algo más de presencia (avatar mayor + acento sobrio,
 * NUNCA oro por ser #1). Filas 4+ compactas. El resalte de `isCurrentUser`
 * y la redacción de perfiles privados se conservan intactos.
 *
 * Paginación V1: botón "Ver más" explícito, NUNCA scroll infinito. Páginas
 * se ACUMULAN (`mergeLeaderboardPages`). Un fallo al cargar una página
 * adicional conserva las filas visibles y ofrece un reintento LOCALIZADO en
 * el footer -- nunca `ErrorState` de pantalla completa (que solo se usa
 * para el fallo de la carga INICIAL).
 */
export default function RankingScreen() {
  const styles = useThemedStyles(createStyles);
  const scheme = useColorSchemeName();
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
  const ctx = state.competitiveContext;

  return (
    <View style={styles.container}>
      <MyPositionCard myPosition={myPosition} ctx={ctx} scheme={scheme} styles={styles} />

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
 * Tarjeta superior "TU POSICIÓN" -- misma identidad que la tarjeta de Liga
 * del hub: escudo real + tinte/acento MUY sutil de `leagueVisual`, LP con
 * trofeo, zona del backend. `pending` (proyección aún sin calcular) -> copy
 * honesto, NUNCA #0.
 */
function MyPositionCard({
  myPosition,
  ctx,
  scheme,
  styles,
}: {
  myPosition: ReturnType<typeof describeMyPosition>;
  ctx: CompetitiveContext | null;
  scheme: 'light' | 'dark';
  styles: ReturnType<typeof createStyles>;
}) {
  const tokens = useTheme();

  if (myPosition.kind === 'pending' || !ctx) {
    return (
      <Card variant="surface" style={styles.myCard}>
        <Text variant="caption" color="muted" style={styles.kicker}>
          TU POSICIÓN
        </Text>
        <Text variant="body" color="secondary">
          Actualizando posición…
        </Text>
      </Card>
    );
  }

  const visual = leagueVisual(ctx.leagueTier, scheme);
  const zone = OWN_ZONE[ctx.competitiveZone];
  const zoneColor =
    zone.tone === 'promotion' ? tokens.color.state.success.text : zone.tone === 'demotion' ? tokens.color.state.warning.text : tokens.color.text.secondary;

  return (
    <Card variant="surface" style={[styles.myCard, styles.myCardTinted, { backgroundColor: visual.tint, borderColor: visual.accent }]}>
      <View style={styles.myTopRow}>
        <View style={styles.myTopText}>
          <Text variant="caption" color="muted" style={styles.kicker}>
            TU POSICIÓN
          </Text>
          <Text variant="heading3" weight="bold" numberOfLines={2} style={styles.leagueName}>
            {myPosition.leagueName.toUpperCase()}
          </Text>
        </View>
        <LeagueEmblem tier={ctx.leagueTier} size={84} accessibilityLabel={`Escudo de la liga ${myPosition.leagueName}`} />
      </View>

      <View style={styles.myStatsRow}>
        <View style={styles.myStat}>
          <Text variant="titleLarge" weight="bold">
            #{myPosition.rankPosition}
          </Text>
          <Text variant="caption" color="muted">
            Posición
          </Text>
        </View>
        <View style={styles.myStat}>
          <View style={styles.lpRow}>
            <LeagueTrophy size={22} />
            <Text variant="titleLarge" weight="bold">
              {myPosition.metricValue}
            </Text>
          </View>
          <Text variant="caption" color="muted">
            LP
          </Text>
        </View>
      </View>

      <View style={styles.zoneChip}>
        {zone.icon ? (
          <Icon name={zone.icon} size={14} color={zoneColor} />
        ) : (
          <Text variant="caption" weight="bold" style={{ color: zoneColor }}>
            —
          </Text>
        )}
        <Text variant="caption" weight="semibold" style={{ color: zoneColor }}>
          {zone.label}
        </Text>
      </View>
    </Card>
  );
}

/**
 * COMPETITIVE V1 -- indicador de zona compacto por fila (§5): ascenso/
 * descenso llevan flecha + etiqueta corta; permanencia (RETENTION) no
 * muestra nada (fila neutra) para no volver la lista ruidosa. La zona la
 * decide el backend (`row.competitiveZone`), este componente solo la
 * presenta.
 */
function ZoneIndicator({ zone, styles }: { zone: CompetitiveZone; styles: ReturnType<typeof createStyles> }) {
  const tokens = useTheme();
  const badge = describeZone(zone);
  if (!badge) return null;
  const isPromotion = badge.kind === 'promotion';
  const color = isPromotion ? tokens.color.state.success.text : tokens.color.state.warning.text;
  return (
    <View style={styles.rowZone}>
      <Icon name={isPromotion ? 'chevron-up' : 'chevron-down'} size={12} color={color} />
      <Text variant="micro" weight="bold" style={{ color }}>
        {badge.label}
      </Text>
    </View>
  );
}

/** Trofeo + número de LP -- misma representación primaria que la tarjeta de Liga, pequeña para las filas. */
function RowLp({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <LeagueTrophy size={20} />
      <Text variant="titleMedium" weight="bold">
        {value}
      </Text>
    </View>
  );
}

/**
 * Renderiza EXACTAMENTE lo que la unión discriminada permite -- la rama
 * `presentable: false` no puede, ni en tiempo de compilación, leer
 * `username`/`avatar`/`equippedTitle`/`equippedCosmetics`/`levelNumber`/
 * `publicAchievements` (TypeScript los excluye del tipo de esa rama).
 *
 * Navegación al perfil ÚNICAMENTE desde una fila presentable -- una fila
 * redactada no tiene `username` que navegar, ni siquiera se envuelve en
 * `Pressable`.
 */
function LeaderboardRowCard({ row, styles, router }: { row: LeaderboardRow; styles: ReturnType<typeof createStyles>; router: ReturnType<typeof useRouter> }) {
  const highlight = row.isCurrentUser;
  const isTopThree = row.rankPosition <= 3;

  if (!row.presentable) {
    return (
      <View style={[styles.row, isTopThree && styles.rowTopThree, highlight && styles.rowHighlighted]}>
        <Text variant="titleMedium" weight="bold" color="secondary" style={styles.rankPosition}>
          #{row.rankPosition}
        </Text>
        <View style={styles.redactedMiddle}>
          <Text variant="body" color="muted" style={styles.redactedLabel}>
            Perfil privado
          </Text>
          <ZoneIndicator zone={row.competitiveZone} styles={styles} />
        </View>
        <RowLp value={row.metricValue} />
      </View>
    );
  }

  return (
    <PresentableLeaderboardRow row={row} highlight={highlight} isTopThree={isTopThree} styles={styles} router={router} />
  );
}

/**
 * Separada de `LeaderboardRowCard` para que solo esta función (nunca la
 * rama redactada) acceda a los campos exclusivos de una fila presentable
 * (avatar, cosméticos equipados) -- garantía estructural adicional a la
 * que ya da TypeScript con la unión discriminada.
 */
function PresentableLeaderboardRow({
  row,
  highlight,
  isTopThree,
  styles,
  router,
}: {
  row: Extract<LeaderboardRow, { presentable: true }>;
  highlight: boolean;
  isTopThree: boolean;
  styles: ReturnType<typeof createStyles>;
  router: ReturnType<typeof useRouter>;
}) {
  const frame = row.equippedCosmetics.find((c) => c.cosmeticSlot === 'AVATAR_FRAME') ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${row.username}`}
      onPress={() => router.push({ pathname: '/(tabs)/competir/perfil/[username]', params: { username: row.username } })}
      style={[styles.row, isTopThree && styles.rowTopThree, highlight && styles.rowHighlighted]}
    >
      <Text variant="titleMedium" weight="bold" color="secondary" style={styles.rankPosition}>
        #{row.rankPosition}
      </Text>
      <Avatar avatarUri={row.avatar} frameUri={frame?.assetReference} size={isTopThree ? 'medium' : 'small'} accessibilityLabel={`Avatar de ${row.username}`} />
      <View style={styles.rowInfo}>
        <View style={styles.rowNameRow}>
          <Text variant="titleMedium" weight="semibold" numberOfLines={1} style={styles.rowName}>
            {row.username}
          </Text>
          {highlight ? (
            <Text variant="micro" weight="bold" style={styles.youBadge}>
              Tú
            </Text>
          ) : null}
        </View>
        {row.equippedTitle ? (
          <Text variant="bodySmall" color="secondary" numberOfLines={1}>
            {row.equippedTitle.displayText}
          </Text>
        ) : null}
        <View style={styles.rowMetaRow}>
          <Text variant="micro" color="muted">
            Nivel {row.levelNumber}
          </Text>
          <ZoneIndicator zone={row.competitiveZone} styles={styles} />
        </View>
      </View>
      <RowLp value={row.metricValue} />
    </Pressable>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: t.color.background.default },
    myCard: { gap: spacing.space3, paddingVertical: 16 },
    myCardTinted: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' as const },
    kicker: { textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    myTopRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    myTopText: { flex: 1, gap: 2 },
    leagueName: { textTransform: 'uppercase' as const },
    myStatsRow: { flexDirection: 'row' as const, gap: spacing.space6, alignItems: 'flex-end' as const },
    myStat: { gap: 2 },
    lpRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
    zoneChip: {
      alignSelf: 'flex-start' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      borderRadius: radii.full,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    list: { gap: 8, paddingBottom: 24 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      borderRadius: radii.large,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    // Top 3: algo más de aire + un borde de acento SOBRIO (nunca oro por ser
    // #1 -- la posición del ranking y la liga son conceptos distintos). Sin
    // fondo, para que el resalte del usuario actual siga siendo el único con
    // superficie de acento y funcione igual en claro y oscuro.
    rowTopThree: { paddingVertical: 16, borderColor: t.color.accent.default },
    rowHighlighted: { borderColor: t.color.accent.default, borderWidth: 2, backgroundColor: t.color.accent.subtleBg },
    rankPosition: { minWidth: 34 },
    rowInfo: { flex: 1, gap: 2 },
    rowNameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    rowName: { flexShrink: 1 },
    youBadge: {
      color: t.color.accent.strong,
      backgroundColor: t.color.accent.subtleBg,
      borderRadius: radii.full,
      paddingHorizontal: 6,
      paddingVertical: 1,
      overflow: 'hidden' as const,
      textTransform: 'uppercase' as const,
    },
    rowMetaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, flexWrap: 'wrap' as const },
    rowZone: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 2,
      borderRadius: radii.full,
      paddingHorizontal: 5,
      paddingVertical: 1,
      backgroundColor: t.color.background.default,
      borderWidth: 1,
      borderColor: t.color.border.default,
    },
    redactedMiddle: { flex: 1, gap: 2 },
    redactedLabel: { fontStyle: 'italic' as const },
    footer: { gap: 8, paddingTop: 8, alignItems: 'center' as const },
    loadMoreError: { textAlign: 'center' as const },
  };
}
