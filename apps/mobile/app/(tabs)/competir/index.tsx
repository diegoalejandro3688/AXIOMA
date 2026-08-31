import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ChallengeSummary, CompetitiveContext, CompetitiveZone, SeasonHistoryEntry } from '@axioma/contracts';
import { listChallenges, claimChallenge } from '../../../lib/api/challenges';
import { getLeagueParticipation, joinLeague, getLeagueHistory } from '../../../lib/api/league';
import { getMyCompetitiveProfile } from '../../../lib/api/competitive';
import { groupChallenges, progressRatio, canClaim } from '../../../lib/challenges/group-challenges';
import { challengeTypeLabel, formatCountdown, formatRewardXp, claimCtaLabel, isPastPeriod } from '../../../lib/challenges/challenge-card-view';
import { describeParticipation, type LeagueParticipationView } from '../../../lib/league/participation-view';
import { seasonCountdown } from '../../../lib/league/season-countdown';
import { leagueVisual } from '../../../lib/league/league-visual';
import { describeMyPosition } from '../../../lib/leaderboard/paginate-leaderboard';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Card, Button, Progress, Icon } from '../../../components/ui';
import { QuickQuestionIllustration } from '../../../components/competitive/quick-question-illustration';
import { LeagueEmblem } from '../../../components/competitive/league-emblem';
import { LeagueTrophy } from '../../../components/competitive/league-trophy';
import { useTheme, useThemedStyles, useColorSchemeName, spacing, radii } from '../../../theme';
import type { ThemeTokens, IconName } from '../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; challenges: ChallengeSummary[] };

type LeagueSectionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; view: LeagueParticipationView };

const STATUS_LABEL: Record<ChallengeSummary['challengeStatus'], string> = {
  ACCEPTED: 'Por empezar',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado -- reclama tu recompensa',
  CLAIMED: 'Reclamado',
};

/**
 * COMPETITIVE V1 -- copy de los estados "finales" de participación: el
 * outcome que el móvil muestra en la tarjeta de Liga tras finalizar la
 * temporada (`season_league_participation.participation_status`).
 */
const PARTICIPATION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Temporada en curso',
  SEASON_ENDED: 'Temporada finalizada',
  PROMOTED: 'Ascendiste de liga',
  DEMOTED: 'Descendiste de liga',
  RETAINED: 'Te mantuviste en tu liga',
};

type OutcomeTone = 'promotion' | 'demotion' | 'neutral';
const PARTICIPATION_STATUS_TONE: Record<string, OutcomeTone> = {
  PROMOTED: 'promotion',
  DEMOTED: 'demotion',
  RETAINED: 'neutral',
  SEASON_ENDED: 'neutral',
  ACTIVE: 'neutral',
};

/** Una participación deja de estar "en curso" en cualquiera de estos estados -- ver `PARTICIPATION_STATUS_LABEL`. */
const FINAL_PARTICIPATION_STATUSES = new Set(['PROMOTED', 'DEMOTED', 'RETAINED', 'SEASON_ENDED']);
function isFinalParticipation(status: string): boolean {
  return FINAL_PARTICIPATION_STATUSES.has(status);
}

/**
 * COMPETITIVE V1 (rediseño visual, Incremento 3) -- presentación de la zona
 * competitiva EN VIVO. La zona la decide el backend (`competitiveZone` de
 * `CompetitiveContext`, gramática `promotion-grammar.ts`); esto SOLO la
 * traduce a copy + flecha. El móvil NUNCA calcula la zona.
 */
const LEAGUE_ZONE: Record<CompetitiveZone, { label: string; icon: IconName | null; tone: OutcomeTone }> = {
  PROMOTION: { label: 'Zona de ascenso', icon: 'chevron-up', tone: 'promotion' },
  RETENTION: { label: 'Zona de permanencia', icon: null, tone: 'neutral' },
  DEMOTION: { label: 'Zona de descenso', icon: 'chevron-down', tone: 'demotion' },
};

/**
 * Referencia inicial del lado del escudo (~<=35% del ancho útil de la
 * tarjeta, dentro de la banda 104–132). Deliberadamente una constante única
 * y fácil de ajustar tras el QA en dispositivo físico -- no un valor "de
 * diseño final".
 */
const LEAGUE_EMBLEM_SIZE = 108;

/**
 * Competir -- hub. Tarjeta de Liga (COMPETITIVE V1, rediseño visual: escudo
 * real, nombre prominente, posición, LP con trofeo, zona en vivo, cuenta
 * regresiva; y estado de temporada finalizada con escudo + posición final +
 * LP final + outcome) + Pregunta rápida + Desafíos (Bloque III 4.d, CERRADO
 * -- sin cambios de comportamiento).
 *
 * Una sola superficie de scroll: encabezado, tarjeta de Liga y Pregunta
 * rápida viajan en `ListHeaderComponent` de la misma `SectionList` de
 * Desafíos. La sección de Liga y la de Desafíos son INDEPENDIENTES -- un
 * fallo en una no bloquea la otra. La inscripción se dispara SOLO desde el
 * `onPress` explícito de "Unirme a la liga", nunca desde un efecto
 * (gate-verificado).
 */
export default function CompetirScreen() {
  const tokens = useTheme();
  const scheme = useColorSchemeName();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const [leagueState, setLeagueState] = useState<LeagueSectionState>({ status: 'loading' });
  const [joining, setJoining] = useState(false);
  // COMPETITIVE V1 -- contexto competitivo propio (rango + zona en vivo).
  // `null` = la proyección de ranking aún no calculó una posición (estado
  // "pending" honesto, nunca #0). `'unknown'` = todavía no consultado. Los
  // LP NO salen de aquí -- salen del saldo vivo de la participación.
  const [myContext, setMyContext] = useState<CompetitiveContext | null | 'unknown'>('unknown');
  // COMPETITIVE V1 -- temporada finalizada más reciente (instantánea
  // inmutable), SOLO para la posición final de la tarjeta cuando la
  // participación ya no está ACTIVE. `null` = sin instantánea todavía.
  const [finalizedSeason, setFinalizedSeason] = useState<SeasonHistoryEntry | null>(null);
  // Cuenta regresiva a nivel de minuto -- sin ticker por segundo.
  const [now, setNow] = useState(() => new Date());

  const loadLeague = useCallback(async () => {
    setLeagueState({ status: 'loading' });
    setMyContext('unknown');
    setFinalizedSeason(null);
    const result = await getLeagueParticipation();
    if (!result.ok) {
      setLeagueState({ status: 'error', message: result.message });
      return;
    }
    const view = describeParticipation(result.data);
    setLeagueState({ status: 'ready', view });
    if (view.kind !== 'enrolled') return;

    if (isFinalParticipation(view.status)) {
      // Temporada finalizada: la posición final vive en la instantánea
      // INMUTABLE del historial (`leaderboard_snapshot_entry`), nunca en el
      // ranking live. Se busca EXACTAMENTE la temporada de esta
      // participación (por su ventana), nunca "la más reciente" a ciegas. Un
      // fallo, un historial vacío o una temporada sin instantánea todavía
      // (p. ej. SEASON_ENDED) -> la tarjeta simplemente omite la posición
      // final y muestra escudo + outcome + LP.
      const history = await getLeagueHistory();
      const match = history.ok ? history.data.seasons.find((s) => s.seasonStartsAt === view.season.startsAt) : undefined;
      setFinalizedSeason(match ?? null);
      return;
    }

    // Temporada en curso: reutiliza el endpoint YA existente
    // (`me/competitive-profile`) para rango + zona -- nunca recalcula
    // ranking en el cliente. 404/ error -> `null` (pending), no un error de
    // pantalla.
    const profile = await getMyCompetitiveProfile();
    setMyContext(profile.ok ? profile.data.competitive : null);
  }, []);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listChallenges();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setItemErrors({});
    setState({ status: 'ready', challenges: result.data.challenges });
  }, []);

  useEffect(() => {
    load();
    loadLeague();
  }, [load, loadLeague]);

  // Refresca la hora cada minuto mientras la pantalla está montada, y al
  // recuperar el foco -- suficiente para una cuenta regresiva de días.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  useFocusEffect(useCallback(() => setNow(new Date()), []));

  async function handleJoinLeague() {
    if (joining) return;
    setJoining(true);
    const result = await joinLeague();
    setJoining(false);
    if (!result.ok) {
      setLeagueState({ status: 'error', message: result.message });
      return;
    }
    const view = describeParticipation(result.data);
    setLeagueState({ status: 'ready', view });
    if (view.kind === 'enrolled') {
      // Recién inscrita -> siempre ACTIVE, nunca un estado final: se pide el
      // contexto competitivo, nunca el historial.
      const profile = await getMyCompetitiveProfile();
      setMyContext(profile.ok ? profile.data.competitive : null);
    }
  }

  async function handleClaim(id: string) {
    if (claimingId !== null) return;

    setClaimingId(id);
    setItemErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const outcome = await claimChallenge(id);
    setClaimingId(null);

    if (outcome.kind === 'ok') {
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', challenges: prev.challenges.map((c) => (c.id === id ? outcome.data : c)) } : prev));
      return;
    }

    if (outcome.kind === 'not_completed' || outcome.kind === 'not_found') {
      await load();
      return;
    }

    const message = outcome.kind === 'retryable' || outcome.kind === 'network' ? outcome.message : outcome.message;
    setItemErrors((prev) => ({ ...prev, [id]: message }));
  }

  /** Encabezado simple con escudo genérico -- SOLO para los estados sin participación (sin temporada / no inscrito). */
  function leagueHeader(icon: ReactNode, title: string) {
    return (
      <View style={styles.leagueHeader}>
        {icon}
        <Text variant="titleLarge">{title}</Text>
      </View>
    );
  }

  /** Fila de estadística: valor grande arriba, etiqueta pequeña debajo. */
  function leagueStat(value: ReactNode, label: string) {
    return (
      <View style={styles.leagueStat}>
        {value}
        <Text variant="caption" color="muted">
          {label}
        </Text>
      </View>
    );
  }

  function lpValue(points: number) {
    return (
      <View style={styles.lpValueRow}>
        <LeagueTrophy size={22} />
        <Text variant="titleLarge" weight="bold">
          {points}
        </Text>
      </View>
    );
  }

  function zoneChip(zone: CompetitiveZone) {
    const z = LEAGUE_ZONE[zone];
    const color =
      z.tone === 'promotion' ? tokens.color.state.success.text : z.tone === 'demotion' ? tokens.color.state.warning.text : tokens.color.text.secondary;
    return (
      <View style={styles.zoneChip}>
        {z.icon ? (
          <Icon name={z.icon} size={14} color={color} />
        ) : (
          <Text variant="caption" weight="bold" style={{ color }}>
            —
          </Text>
        )}
        <Text variant="caption" weight="semibold" style={{ color }}>
          {z.label}
        </Text>
      </View>
    );
  }

  function outcomePill(status: string) {
    const tone = PARTICIPATION_STATUS_TONE[status] ?? 'neutral';
    return (
      <View style={[styles.outcomePill, outcomePillStyle(tokens, tone)]}>
        {tone === 'promotion' ? <Icon name="chevron-up" size={14} color={tokens.color.state.success.text} /> : null}
        {tone === 'demotion' ? <Icon name="chevron-down" size={14} color={tokens.color.state.warning.text} /> : null}
        <Text variant="bodySmall" weight="semibold" style={{ color: outcomePillTextColor(tokens, tone) }}>
          {PARTICIPATION_STATUS_LABEL[status] ?? status}
        </Text>
      </View>
    );
  }

  function renderLeagueSection() {
    if (leagueState.status === 'loading') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          <ActivityIndicator color={tokens.color.accent.default} />
        </Card>
      );
    }
    if (leagueState.status === 'error') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          <Text variant="bodySmall" color="error">
            {leagueState.message}
          </Text>
          <Button label="Reintentar" onPress={loadLeague} variant="tertiary" size="small" />
        </Card>
      );
    }

    const { view } = leagueState;

    if (view.kind === 'no_active_season') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          {leagueHeader(
            <View style={styles.leagueIconWrap}>
              <Icon name="shield" size={18} color="accent" />
            </View>,
            'Liga',
          )}
          <Text variant="bodySmall" color="secondary">
            No hay una temporada de liga activa en este momento. Vuelve pronto para competir por tu ascenso.
          </Text>
        </Card>
      );
    }

    if (view.kind === 'not_enrolled') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          {leagueHeader(
            <View style={styles.leagueIconWrap}>
              <Icon name="shield" size={18} color="accent" />
            </View>,
            'Liga',
          )}
          <Text variant="bodySmall" color="secondary">
            Hay una temporada activa. Únete para competir en tu grupo de 30 y subir de liga.
          </Text>
          <Button label="Unirme a la liga" onPress={handleJoinLeague} loading={joining} variant="primary" size="small" />
        </Card>
      );
    }

    // view.kind === 'enrolled' -- identidad de liga compartida por el estado
    // "en curso" y el "finalizado": misma arquitectura, cambian el escudo y
    // el acento/tinte/halo (`leagueVisual`), nunca la estructura.
    const visual = leagueVisual(view.leagueTier, scheme);
    const cardStyle = [styles.leagueCard, styles.leagueCardTinted, { backgroundColor: visual.tint, borderColor: visual.accent }];

    const topRow = (kicker: string) => (
      <View style={styles.leagueTopRow}>
        <View style={styles.leagueTopText}>
          <Text variant="caption" color="muted" style={styles.leagueKicker}>
            {kicker}
          </Text>
          <Text variant="heading2" weight="bold" numberOfLines={2} style={styles.leagueName}>
            {view.leagueName.toUpperCase()}
          </Text>
        </View>
        <LeagueEmblem tier={view.leagueTier} size={LEAGUE_EMBLEM_SIZE} accessibilityLabel={`Escudo de la liga ${view.leagueName}`} />
      </View>
    );

    if (isFinalParticipation(view.status)) {
      return (
        <Card variant="surface" style={cardStyle}>
          {topRow('TEMPORADA FINALIZADA')}
          {outcomePill(view.status)}
          <View style={styles.leagueStatsRow}>
            {finalizedSeason ? leagueStat(<Text variant="titleLarge" weight="bold">#{finalizedSeason.finalRank}</Text>, 'Posición final') : null}
            {leagueStat(lpValue(view.leaguePoints), 'LP')}
          </View>
        </Card>
      );
    }

    // Temporada EN CURSO. LP = saldo VIVO de la participación
    // (`view.leaguePoints`, ~cada minuto), SIEMPRE visible. Posición = del
    // leaderboard (`position`, recalculado :00/:15/:30/:45): el número solo
    // aparece cuando el backend ya calculó uno real, nunca #0. Zona = del
    // backend (`ctx.competitiveZone`), nunca calculada aquí.
    const ctx = myContext === 'unknown' ? null : myContext;
    const position = describeMyPosition(ctx);
    const countdown = seasonCountdown(view.season.endsAt, now);

    return (
      <Card variant="surface" style={cardStyle}>
        {topRow('LIGA ACTUAL')}

        <View style={styles.leagueStatsRow}>
          {leagueStat(
            position.kind === 'known' ? (
              <Text variant="titleLarge" weight="bold">
                #{position.rankPosition}
              </Text>
            ) : (
              <Text variant="bodySmall" color="secondary" style={styles.leagueStatPending}>
                Actualizando posición…
              </Text>
            ),
            'Posición',
          )}
          {leagueStat(lpValue(view.leaguePoints), 'LP')}
        </View>

        {ctx ? zoneChip(ctx.competitiveZone) : null}

        <Text variant="caption" color="secondary">
          {countdown.ended ? 'La temporada está terminando…' : `${countdown.label} restantes`}
        </Text>

        <Button label="Ver ranking" onPress={() => router.push('/(tabs)/competir/ranking')} variant="tertiary" size="small" />
      </Card>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.headerBlock}>
        <Text variant="heading1" accessibilityRole="header">
          Competir
        </Text>
        <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
          Compite, sube de liga y demuestra lo que sabes.
        </Text>

        {renderLeagueSection()}

        <Card
          variant="brand"
          accessibilityLabel="Jugar Pregunta rápida"
          onPress={() => router.push('/(tabs)/competir/quick-question')}
          style={styles.quickQuestionCard}
        >
          <QuickQuestionIllustration />
          <Text variant="titleLarge" color="onInverse">
            Pregunta rápida
          </Text>
          <Text variant="bodySmall" color="onInverse" style={styles.quickQuestionDescription}>
            Responde preguntas y gana XP
          </Text>
          <View style={styles.quickQuestionButton}>
            <Text variant="titleMedium" weight="semibold" color="onAccent">
              Comenzar
            </Text>
            <Icon name="chevron-right" size={18} color={tokens.color.text.onAccent} />
          </View>
        </Card>

        <Text variant="label" color="secondary" style={styles.challengesTitle}>
          Desafíos
        </Text>
      </View>
    );
  }

  if (state.status === 'loading') return <LoadingState message="Cargando…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const grouped = groupChallenges(state.challenges);
  const sections = [
    { key: 'active', title: 'Activos', data: grouped.active },
    { key: 'completed', title: 'Completados', data: grouped.completed },
    { key: 'claimed', title: 'Reclamados', data: grouped.claimed },
  ].filter((section) => section.data.length > 0);

  return (
    <SectionList
      style={styles.scroll}
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
      ListHeaderComponent={renderHeader()}
      ListEmptyComponent={
        <Card variant="outlined" style={styles.challengesEmptyCard}>
          <Text variant="bodySmall" color="secondary">
            Todavía no tienes desafíos asignados. Sigue estudiando y aparecerán aquí.
          </Text>
        </Card>
      }
      renderSectionHeader={({ section }) => (
        <Text variant="label" color="secondary" style={styles.sectionTitle}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => {
        const countdown = isPastPeriod(item) ? null : formatCountdown(item.periodEnd);
        const rewardXp = formatRewardXp(item.rewardXpBonus);
        return (
          <Card variant="outlined" style={styles.card}>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {item.name}
              </Text>
              <Text variant="caption" color="secondary" style={styles.cardBadge}>
                {challengeTypeLabel(item.challengeType)}
              </Text>
            </View>
            {item.description ? (
              <Text variant="bodySmall" color="secondary">
                {item.description}
              </Text>
            ) : null}

            {rewardXp ? (
              <Text variant="label" color="primary">
                Recompensa: {rewardXp}
              </Text>
            ) : null}

            <Progress value={progressRatio(item)} accessibilityLabel={`Progreso: ${item.progressValue} de ${item.targetValue}`} />
            <Text variant="caption" color="muted">
              {item.progressValue}/{item.targetValue}
            </Text>

            <View style={styles.cardMetaRow}>
              <Text variant="label" color="secondary">
                {STATUS_LABEL[item.challengeStatus]}
              </Text>
              {countdown ? (
                <Text variant="caption" color="muted">
                  {countdown}
                </Text>
              ) : null}
            </View>

            {itemErrors[item.id] ? (
              <Text variant="bodySmall" color="error">
                {itemErrors[item.id]}
              </Text>
            ) : null}

            {canClaim(item) ? (
              <Button
                label={claimCtaLabel(item.rewardXpBonus)}
                accessibilityLabel={`Reclamar recompensa de ${item.name}`}
                onPress={() => handleClaim(item.id)}
                loading={claimingId === item.id}
                disabled={claimingId !== null}
                variant="primary"
                size="small"
                style={styles.claimButton}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

function outcomePillStyle(t: ThemeTokens, tone: OutcomeTone) {
  if (tone === 'promotion') return { backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border };
  if (tone === 'demotion') return { backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border };
  return { backgroundColor: t.color.background.default, borderColor: t.color.border.default };
}
function outcomePillTextColor(t: ThemeTokens, tone: OutcomeTone): string {
  if (tone === 'promotion') return t.color.state.success.text;
  if (tone === 'demotion') return t.color.state.warning.text;
  return t.color.text.secondary;
}

function createStyles(t: ThemeTokens) {
  return {
    scroll: { flex: 1, backgroundColor: t.color.background.default },
    container: { padding: 16, gap: spacing.space3, paddingBottom: 32 },
    headerBlock: { gap: spacing.space3 },
    subtitle: { marginTop: -spacing.space2 },
    leagueCard: { gap: spacing.space3, paddingVertical: 20 },
    // Identidad de liga: superficie con tinte MUY sutil + hairline de acento.
    // El fondo sigue siendo una surface ZETRYND; el color de la liga solo
    // aparece como identidad discreta (el escudo carga la identidad visual).
    leagueCardTinted: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' as const },
    leagueHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    leagueIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.color.accent.subtleBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    leagueTopRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    leagueTopText: { flex: 1, gap: 2 },
    leagueKicker: { textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    leagueName: { textTransform: 'uppercase' as const },
    leagueStatsRow: { flexDirection: 'row' as const, gap: spacing.space6, alignItems: 'flex-end' as const },
    leagueStat: { gap: 2 },
    leagueStatPending: { paddingBottom: 2 },
    lpValueRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
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
    outcomePill: {
      alignSelf: 'flex-start' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      borderWidth: 1,
      borderRadius: radii.full,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    quickQuestionCard: { gap: spacing.space1, overflow: 'hidden' as const },
    quickQuestionDescription: { opacity: 0.85, marginBottom: spacing.space2 },
    quickQuestionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      gap: 6,
      backgroundColor: t.color.accent.default,
      borderRadius: 10,
      paddingVertical: spacing.space2,
      paddingHorizontal: spacing.space4,
    },
    challengesTitle: { textTransform: 'uppercase' as const, marginTop: spacing.space2 },
    challengesEmptyCard: { gap: spacing.space2 },
    sectionTitle: { marginTop: spacing.space3, marginBottom: spacing.space1, textTransform: 'uppercase' as const, backgroundColor: t.color.background.default },
    card: { gap: spacing.space2, marginBottom: spacing.space3 },
    cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    cardTitle: { flex: 1 },
    cardBadge: {
      textTransform: 'uppercase' as const,
      backgroundColor: t.color.accent.subtleBg,
      color: t.color.accent.default,
      borderRadius: 6,
      paddingHorizontal: spacing.space2,
      paddingVertical: 2,
      overflow: 'hidden' as const,
    },
    cardMetaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    claimButton: { marginTop: spacing.space2 },
  };
}
