import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ChallengeSummary, CompetitiveContext } from '@axioma/contracts';
import { listChallenges, claimChallenge } from '../../../lib/api/challenges';
import { getLeagueParticipation, joinLeague } from '../../../lib/api/league';
import { getMyCompetitiveProfile } from '../../../lib/api/competitive';
import { groupChallenges, progressRatio, canClaim } from '../../../lib/challenges/group-challenges';
import { challengeTypeLabel, formatCountdown, formatRewardXp, claimCtaLabel, isPastPeriod } from '../../../lib/challenges/challenge-card-view';
import { describeParticipation, type LeagueParticipationView } from '../../../lib/league/participation-view';
import { seasonCountdown } from '../../../lib/league/season-countdown';
import { describeMyPosition } from '../../../lib/leaderboard/paginate-leaderboard';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Card, Button, Progress, Icon } from '../../../components/ui';
import { QuickQuestionIllustration } from '../../../components/competitive/quick-question-illustration';
import { useTheme, useThemedStyles, spacing, radii } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

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

/** COMPETITIVE V1 -- copy compacto para los estados "finales" de participación (§20). */
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

/**
 * Competir -- hub. Participación de liga (COMPETITIVE V1: identidad de liga,
 * rango, LP, cuenta regresiva de 7 días, estados finales) + Pregunta rápida +
 * Desafíos (Bloque III 4.d, CERRADO -- sin cambios de comportamiento).
 *
 * COMPETITIVE V1 (§27) -- una sola superficie de scroll: el encabezado, la
 * tarjeta de Liga y Pregunta rápida viajan en `ListHeaderComponent` de la
 * misma `SectionList` de Desafíos. Las tarjetas de Desafío y su flujo de
 * `claim`/reconciliación NO cambian.
 *
 * La sección de liga y la de Desafíos son INDEPENDIENTES -- un fallo en una
 * no bloquea la otra. La inscripción se dispara SOLO desde el `onPress`
 * explícito de "Unirme a la liga", nunca desde un efecto (gate-verificado).
 */
export default function CompetirScreen() {
  const tokens = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const [leagueState, setLeagueState] = useState<LeagueSectionState>({ status: 'loading' });
  const [joining, setJoining] = useState(false);
  // COMPETITIVE V1 -- contexto competitivo propio (rango + LP). `null` = la
  // proyección de ranking aún no calculó una posición (estado "pending"
  // honesto, nunca #0). `'unknown'` = todavía no consultado.
  const [myContext, setMyContext] = useState<CompetitiveContext | null | 'unknown'>('unknown');
  // Cuenta regresiva a nivel de minuto -- sin ticker por segundo (§7).
  const [now, setNow] = useState(() => new Date());

  const loadLeague = useCallback(async () => {
    setLeagueState({ status: 'loading' });
    setMyContext('unknown');
    const result = await getLeagueParticipation();
    if (!result.ok) {
      setLeagueState({ status: 'error', message: result.message });
      return;
    }
    const view = describeParticipation(result.data);
    setLeagueState({ status: 'ready', view });
    if (view.kind === 'enrolled') {
      // Reutiliza el endpoint YA existente (`me/competitive-profile`) --
      // nunca recalcula ranking en el cliente. 404 (sin public_profile) o
      // error -> `null` (pending), no un error de pantalla.
      const profile = await getMyCompetitiveProfile();
      setMyContext(profile.ok ? profile.data.competitive : null);
    }
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

  /**
   * Insignia de liga a partir del `tierOrder` (1..7) -- SIN inferir la liga
   * del marco equipado (que puede ser de otra liga). Sin arte nuevo: `Icon
   * name="shield"` en un aro con tinte por tier, dentro del lenguaje visual
   * ya usado en la fila de Liga de Inicio.
   */
  function leagueBadge(tier: number) {
    const tint = LEAGUE_TIER_TINT(tokens)[Math.min(Math.max(tier, 1), 7) - 1];
    return (
      <View style={[styles.leagueBadge, { borderColor: tint, backgroundColor: tokens.color.accent.subtleBg }]}>
        <Icon name="shield" size={20} color={tint} />
      </View>
    );
  }

  function leagueHeader(icon: ReactNode, title: string) {
    return (
      <View style={styles.leagueHeader}>
        {icon}
        <Text variant="titleLarge">{title}</Text>
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

    // view.kind === 'enrolled'
    const isFinalOutcome = view.status === 'PROMOTED' || view.status === 'DEMOTED' || view.status === 'RETAINED' || view.status === 'SEASON_ENDED';
    const tone = PARTICIPATION_STATUS_TONE[view.status] ?? 'neutral';
    const countdown = seasonCountdown(view.season.endsAt, now);
    const position = describeMyPosition(myContext === 'unknown' ? null : myContext);

    return (
      <Card variant="surface" style={styles.leagueCard}>
        {leagueHeader(leagueBadge(view.leagueTier), view.leagueName)}

        {isFinalOutcome ? (
          <View style={[styles.outcomePill, outcomePillStyle(tokens, tone)]}>
            {tone === 'promotion' ? <Icon name="chevron-up" size={14} color={tokens.color.state.success.text} /> : null}
            <Text variant="bodySmall" weight="semibold" style={{ color: outcomePillTextColor(tokens, tone) }}>
              {PARTICIPATION_STATUS_LABEL[view.status] ?? view.status}
            </Text>
          </View>
        ) : (
          // COMPETITIVE V1 (parche final de QA) -- LP y POSICIÓN son dos
          // conceptos distintos con dos fuentes distintas: los LP son el
          // saldo VIVO de la participación (`view.leaguePoints`, se
          // actualiza ~cada minuto) y SIEMPRE se muestran; la posición
          // viene del leaderboard (`position`, recalculado en
          // :00/:15/:30/:45) y puede estar "poniéndose al día". El número de
          // posición solo aparece cuando el backend ya calculó uno real; los
          // LP solo son cero si el saldo real de la participación es cero.
          <View style={styles.leagueStatsRow}>
            <View style={styles.leagueStat}>
              {position.kind === 'known' ? (
                <Text variant="titleLarge" weight="bold">
                  #{position.rankPosition}
                </Text>
              ) : (
                <Text variant="bodySmall" color="secondary" style={styles.leagueStatPending}>
                  Actualizando posición…
                </Text>
              )}
              <Text variant="caption" color="muted">
                posición
              </Text>
            </View>
            <View style={styles.leagueStat}>
              <Text variant="titleLarge" weight="bold">
                {view.leaguePoints}
              </Text>
              <Text variant="caption" color="muted">
                LP
              </Text>
            </View>
          </View>
        )}

        {!isFinalOutcome ? (
          <Text variant="caption" color="secondary">
            {countdown.ended ? 'La temporada está terminando…' : `${countdown.label} restantes`}
          </Text>
        ) : null}

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

/** Tinte discreto por tier (1 Bronce … 7 Gran Maestro) -- solo para el aro de la insignia, nunca un fondo saturado. */
function LEAGUE_TIER_TINT(t: ThemeTokens): string[] {
  return [
    '#A9743F', // Bronce
    '#9AA3AC', // Plata
    t.color.state.warning.text, // Oro
    t.color.state.success.text, // Esmeralda
    t.color.accent.default, // Diamante
    t.color.accent.strong, // Maestro
    t.color.academic.violet.text, // Gran Maestro
  ];
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
    leagueCard: { gap: spacing.space3, paddingVertical: 24 },
    leagueHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    leagueIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.color.accent.subtleBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    leagueBadge: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    leagueStatsRow: { flexDirection: 'row' as const, gap: spacing.space6, alignItems: 'flex-end' as const },
    leagueStat: { gap: 2 },
    leagueStatPending: { paddingBottom: 2 },
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
