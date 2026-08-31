import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ChallengeSummary, CompetitiveContext, CompetitiveZone, SeasonHistoryEntry } from '@axioma/contracts';
import { listChallenges } from '../../../lib/api/challenges';
import { getLeagueParticipation, joinLeague, getLeagueHistory } from '../../../lib/api/league';
import { getMyCompetitiveProfile } from '../../../lib/api/competitive';
import { selectHubChallenges } from '../../../lib/challenges/select-hub-challenges';
import { describeParticipation, type LeagueParticipationView } from '../../../lib/league/participation-view';
import { seasonCountdown } from '../../../lib/league/season-countdown';
import { leagueVisual } from '../../../lib/league/league-visual';
import { describeMyPosition } from '../../../lib/leaderboard/paginate-leaderboard';
import { Text, Card, Button, Icon, Divider } from '../../../components/ui';
import { QuickQuestionIllustration } from '../../../components/competitive/quick-question-illustration';
import { LeagueEmblem } from '../../../components/competitive/league-emblem';
import { LeagueTrophy } from '../../../components/competitive/league-trophy';
import { ChallengeRow } from '../../../components/challenges/challenge-row';
import { useChallengeClaim } from '../../../components/challenges/use-challenge-claim';
import { useTheme, useThemedStyles, useColorSchemeName, spacing, radii } from '../../../theme';
import type { ThemeTokens, IconName } from '../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; challenges: ChallengeSummary[] };

type LeagueSectionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; view: LeagueParticipationView };

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
const LEAGUE_EMBLEM_SIZE = 78;

/**
 * Competir -- hub. Tarjeta de Liga (COMPETITIVE V1, rediseño visual: escudo
 * real, nombre prominente, posición, LP con trofeo, zona en vivo, cuenta
 * regresiva; y estado de temporada finalizada) + Pregunta rápida + vista
 * previa COMPACTA de Desafíos.
 *
 * Un solo `ScrollView`. Las tres secciones son INDEPENDIENTES -- un fallo en
 * una no bloquea las otras: Liga y Desafíos renderizan su propio
 * loading/error/empty DENTRO de su tarjeta, nunca en lugar de toda la
 * pantalla.
 *
 * Desafíos es SUBORDINADO a Liga y a Pregunta rápida: una sola tarjeta con
 * 1 preview DIARIO + 1 preview SEMANAL (selección determinista por
 * `challengeKey`) + "Ver todos los desafíos" (navega a `competir/desafios`,
 * la pantalla completa). La colección completa se carga igual. La
 * inscripción a liga se dispara SOLO desde el `onPress` explícito de
 * "Unirme a la liga", nunca desde un efecto (gate-verificado).
 */
export default function CompetirScreen() {
  const tokens = useTheme();
  const scheme = useColorSchemeName();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

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

  /**
   * COMPETITIVE V1 (Incremento 11) -- `silent` refresca en segundo plano al
   * recuperar el foco del hub (p. ej. al volver de Pregunta rápida): NO
   * vuelve a "loading"/"unknown", NO borra una posición ya conocida y NO
   * pisa la pantalla con un error si el refresco falla -- conserva lo último
   * bueno mientras el backend (autoridad) responde. El LP mostrado
   * (`view.leaguePoints`) es el saldo VIVO de la participación, así que este
   * refresco basta para verlo actualizado; nunca se suma nada localmente.
   */
  const loadLeague = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setLeagueState({ status: 'loading' });
      setMyContext('unknown');
      setFinalizedSeason(null);
    }
    const result = await getLeagueParticipation();
    if (!result.ok) {
      if (!silent) setLeagueState({ status: 'error', message: result.message });
      return;
    }
    const view = describeParticipation(result.data);
    setLeagueState({ status: 'ready', view });
    if (view.kind !== 'enrolled') {
      if (silent) {
        setMyContext('unknown');
        setFinalizedSeason(null);
      }
      return;
    }

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
      if (match || !silent) setFinalizedSeason(match ?? null);
      return;
    }

    // Temporada en curso: reutiliza el endpoint YA existente
    // (`me/competitive-profile`) para rango + zona -- nunca recalcula
    // ranking en el cliente. En la carga normal, 404/error -> `null`
    // (pending), no un error de pantalla. En un refresco `silent`, un fallo
    // CONSERVA la última posición conocida (§8: no reemplazarla por
    // "Actualizando posición…").
    const profile = await getMyCompetitiveProfile();
    if (profile.ok) setMyContext(profile.data.competitive);
    else if (!silent) setMyContext(null);
  }, []);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listChallenges();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setState({ status: 'ready', challenges: result.data.challenges });
  }, []);

  // DESAFÍOS -- flujo de claim compartido (mismo comportamiento que antes,
  // extraído a `useChallengeClaim`). El hub sigue siendo dueño de la
  // colección: `onClaimed` aplica la fila REAL del servidor, `onReconcile`
  // recarga cuando el backend contradice la vista local.
  const applyClaimed = useCallback((updated: ChallengeSummary) => {
    setState((prev) =>
      prev.status === 'ready' ? { status: 'ready', challenges: prev.challenges.map((c) => (c.id === updated.id ? updated : c)) } : prev,
    );
  }, []);
  const { claimingId, errors: claimErrors, claim, claiming } = useChallengeClaim({ onClaimed: applyClaimed, onReconcile: load });

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
  // Al recuperar el foco: adelanta la cuenta regresiva y refresca en
  // segundo plano el estado de Liga (LP vivo + posición) -- el hub queda
  // montado en el stack de tabs y de otro modo no se re-consultaría al
  // volver de Pregunta rápida.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      void loadLeague({ silent: true });
    }, [loadLeague]),
  );

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
        <LeagueTrophy size={26} />
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

  /**
   * DESAFÍOS -- vista previa COMPACTA (subordinada a Liga y Pregunta
   * rápida): una sola tarjeta con 1 preview DIARIO + 1 SEMANAL
   * (`selectHubChallenges`, determinista) + "Ver todos los desafíos" ->
   * `competir/desafios`. loading/error/empty viven DENTRO de esta tarjeta,
   * nunca reemplazan la pantalla. El claim va por el MISMO
   * `useChallengeClaim` (Incremento 5).
   */
  function renderChallengesSection() {
    const preview = state.status === 'ready' ? selectHubChallenges(state.challenges) : { daily: null, weekly: null };
    const { daily, weekly } = preview;
    const empty = state.status === 'ready' && !daily && !weekly;

    return (
      <Card variant="surface" style={styles.challengesCard}>
        <Text variant="label" color="secondary" style={styles.challengesTitle}>
          Desafíos
        </Text>

        {state.status === 'loading' ? (
          <ActivityIndicator color={tokens.color.accent.default} />
        ) : state.status === 'error' ? (
          <>
            <Text variant="bodySmall" color="error">
              {state.message}
            </Text>
            <Button label="Reintentar" onPress={load} variant="tertiary" size="small" />
          </>
        ) : empty ? (
          <Text variant="bodySmall" color="secondary">
            Todavía no tienes desafíos asignados. Sigue estudiando y aparecerán aquí.
          </Text>
        ) : (
          <>
            {daily ? (
              <ChallengeRow
                variant="compact"
                challenge={daily}
                claiming={claimingId === daily.id}
                claimDisabled={claiming}
                error={claimErrors[daily.id]}
                onClaim={() => claim(daily.id)}
              />
            ) : null}
            {daily && weekly ? <Divider /> : null}
            {weekly ? (
              <ChallengeRow
                variant="compact"
                challenge={weekly}
                claiming={claimingId === weekly.id}
                claimDisabled={claiming}
                error={claimErrors[weekly.id]}
                onClaim={() => claim(weekly.id)}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver todos los desafíos"
              onPress={() => router.push('/(tabs)/competir/desafios')}
              style={styles.seeAll}
            >
              <Text variant="label" style={{ color: tokens.color.accent.strong }}>
                Ver todos los desafíos
              </Text>
              <Icon name="chevron-right" size={16} color="accent" />
            </Pressable>
          </>
        )}
      </Card>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
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
          Responde correctamente y gana LP
        </Text>
        <View style={styles.quickQuestionButton}>
          <Text variant="titleMedium" weight="semibold" color="onAccent">
            Comenzar
          </Text>
          <Icon name="chevron-right" size={18} color={tokens.color.text.onAccent} />
        </View>
      </Card>

      {renderChallengesSection()}
    </ScrollView>
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
    subtitle: { marginTop: -spacing.space2, marginBottom: spacing.space1 },
    // Incremento 11 + micro-parche final (pulido QA físico, Samsung A54) --
    // card más compacta en altura: menos padding vertical y menos gap entre
    // bloques, escudo 92->78. NO se quita ninguna información y la jerarquía
    // (nombre protagonista, escudo identidad, rank+LP stats, zona, countdown,
    // CTA) se conserva -- no es una fila horizontal comprimida.
    leagueCard: { gap: 6, paddingVertical: 8 },
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
    leagueStatsRow: { flexDirection: 'row' as const, gap: spacing.space5, alignItems: 'flex-end' as const },
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
    // DESAFÍOS -- tarjeta compacta subordinada: menos altura que la
    // implementación anterior (varias cards + secciones), sin competir con
    // la tarjeta de Liga.
    challengesCard: { gap: spacing.space1, paddingVertical: spacing.space2 },
    challengesTitle: { textTransform: 'uppercase' as const, letterSpacing: 0.6 },
    seeAll: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      gap: 2,
      marginTop: spacing.space1,
    },
  };
}
