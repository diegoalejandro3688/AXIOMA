import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { UserProfileResponse, LevelProgressResponse, StreakResponse, CompetitiveContext, ChallengeSummary } from '@axioma/contracts';
import { getProfile } from '../../lib/api/user';
import { getLevel, getStreak } from '../../lib/api/progression';
import { getMyCompetitiveProfile } from '../../lib/api/competitive';
import { listChallenges } from '../../lib/api/challenges';
import { groupChallenges, progressRatio as challengeProgressRatio } from '../../lib/challenges/group-challenges';
import { pickContinueTarget, type ContinueTarget } from '../../lib/progress/pick-continue-topic';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { Text, Icon, Card, Progress, LevelBadge } from '../../components/ui';
import { HomeMathIllustration } from '../../components/home/home-math-illustration';
import { useTheme, useThemedStyles, spacing, radii } from '../../theme';
import type { ThemeTokens } from '../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      profile: UserProfileResponse | null;
      target: ContinueTarget;
      streak: StreakResponse | null;
      level: LevelProgressResponse | null;
      // COMPETITIVE row removed from Inicio (product decision, INICIO Increment 1
      // -- visual only). The fetch/state are RETAINED for now: dropping the
      // `getMyCompetitiveProfile()` call is a separate dead-code cleanup for the
      // next functional increment (see report), not a visual change.
      competitive: CompetitiveContext | null;
      dailyChallenges: ChallengeSummary[];
    };

/**
 * Inicio -- ver ADR-0009 (semánticamente distinto de los otros 4 módulos).
 *
 * HOME-1: racha, nivel/XP y liga ya se resuelven con datos REALES
 * (`gamification/me/streak`, `gamification/me/level`,
 * `user/public-profile/me/competitive-profile`) -- estos tres, y el
 * resumen de Desafíos, se tratan como secciones INDEPENDIENTES de "Continuar
 * estudiando": si cualquiera de ellas falla o no tiene datos (sin racha
 * todavía, sin desafíos asignados), se muestra un estado honesto en esa
 * sección -- nunca bloquea la pantalla ni inventa un valor. Solo
 * `pickContinueTarget()` (el card principal) sigue siendo obligatorio para
 * que Inicio cargue -- mismo criterio que antes de HOME-1.
 *
 * INICIO Increment 1 (visual only) -- jerarquía: encabezado (saludo + racha)
 * como SOPORTE, tarjeta "Continuar estudiando" como bloque DOMINANTE, y
 * Nivel/XP + Desafíos como tarjetas SECUNDARIAS coherentes. Sin cambios de
 * comportamiento: misma carga, misma lógica de continuidad, mismas rutas,
 * mismo filtrado de desafíos, sin focus refresh. La fila de Liga se retiró
 * de la presentación (decisión de producto).
 */
export default function InicioScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const [profileResult, targetResult, streakResult, levelResult, competitiveResult, challengesResult] = await Promise.all([
      getProfile(),
      pickContinueTarget(),
      getStreak(),
      getLevel(),
      getMyCompetitiveProfile(),
      listChallenges(),
    ]);

    if (!targetResult.ok) {
      setState({ status: 'error', message: targetResult.message });
      return;
    }

    const profile = profileResult.ok ? profileResult.data : null;
    const streak = streakResult.ok ? streakResult.data : null;
    const level = levelResult.ok ? levelResult.data : null;
    // 404 (sin public_profile todavía) se trata igual que "sin participación" -- estado informativo, no error (mismo criterio que el resto de autoconsultas competitivas).
    const competitive = competitiveResult.ok ? competitiveResult.data.competitive : null;
    const dailyChallenges = challengesResult.ok
      ? groupChallenges(challengesResult.data.challenges).active.filter((c) => c.challengeType === 'DAILY')
      : [];

    setState({ status: 'ready', profile, target: targetResult.target, streak, level, competitive, dailyChallenges });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando tu progreso…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  function goToTarget() {
    if (state.status !== 'ready') return;
    if (state.target.kind !== 'topic') return;
    const screen = state.target.entry === 'resource' ? 'recurso' : 'ejercicio';
    router.push({
      pathname: `/(tabs)/estudio/topic/[topicId]/${screen}`,
      params: { topicId: state.target.topic.id, subjectId: state.target.subject.id, name: state.target.subject.name },
    });
  }

  const greetingName = state.profile?.displayName ?? 'estudiante';
  const isActionable = state.target.kind === 'topic';
  const kicker = continueKicker(state.target);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.space4 }]}>
      {/* SOPORTE -- saludo (título de pantalla) + racha compacta, sin competir con el título. */}
      <View style={styles.header}>
        <Text variant="heading1" accessibilityRole="header" numberOfLines={1} style={styles.greeting}>
          Hola, {greetingName}
        </Text>
        {state.streak ? (
          <View style={styles.streakPill} accessibilityLabel={`Racha de ${state.streak.currentStreak} días`}>
            <Icon name="flame" size={13} color={tokens.color.accent.strong} />
            <Text variant="micro" weight="semibold" style={{ color: tokens.color.accent.strong }}>
              Racha de {state.streak.currentStreak} días
            </Text>
          </View>
        ) : (
          <View style={styles.streakPillMuted} accessibilityLabel="Racha no disponible">
            <Icon name="flame" size={13} color={tokens.color.action.disabledText} />
            <Text variant="micro" weight="semibold" style={{ color: tokens.color.action.disabledText }}>
              Sin datos
            </Text>
          </View>
        )}
      </View>

      {/* SECUNDARIO -- Nivel / XP como una sola unidad. */}
      {state.level ? (
        <Card variant="outlined" style={styles.statusCard}>
          <View style={styles.statusRow} accessibilityLabel="Nivel y experiencia">
            <View style={styles.statusLeft}>
              <LevelBadge levelNumber={state.level.currentLevel.levelNumber} size={36} />
              <Text variant="titleMedium">Nivel {state.level.currentLevel.levelNumber}</Text>
            </View>
            <Text variant="caption" color="secondary" style={styles.statusXp}>
              {state.level.xpForNextLevel !== null
                ? `${state.level.xpIntoLevel} / ${state.level.xpForNextLevel} XP`
                : `${state.level.lifetimeXp} XP`}
            </Text>
          </View>
          <Progress
            value={state.level.progressRatio}
            accessibilityLabel={`Progreso de nivel: ${Math.round(state.level.progressRatio * 100)}%`}
          />
        </Card>
      ) : (
        <Card variant="outlined" style={styles.statusCard}>
          <Text variant="caption" style={{ color: tokens.color.action.disabledText }} accessibilityLabel="Nivel y experiencia no disponibles">
            Nivel y XP — sin datos
          </Text>
        </Card>
      )}

      {/* PRIMARIO -- Continuar estudiando. Bloque dominante. */}
      <Card variant="brand" style={styles.continueCard}>
        <HomeMathIllustration />
        {kicker ? (
          <Text variant="label" color="onInverse" style={styles.continueKicker}>
            {kicker}
          </Text>
        ) : null}
        <Text variant="heading3" color="onInverse" numberOfLines={2} style={styles.continueTitle} accessibilityRole="header">
          {goalTitle(state.target)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar estudiando"
          disabled={!isActionable}
          style={[styles.continueButton, !isActionable && styles.continueButtonDisabled]}
          onPress={goToTarget}
        >
          <View style={styles.continueButtonContent}>
            <Text
              variant="titleMedium"
              color={isActionable ? 'onAccent' : undefined}
              style={isActionable ? undefined : { color: tokens.color.action.disabledText }}
            >
              {continueButtonLabel(state.target)}
            </Text>
            {isActionable ? <Icon name="chevron-right" size={20} color="onAccent" /> : null}
          </View>
        </Pressable>
      </Card>

      {/* SECUNDARIO -- Desafíos de hoy (solo lectura, menos peso que "Continuar"). */}
      <Card variant="outlined" style={styles.challengesCard}>
        <View style={styles.challengesHeader}>
          <Text variant="titleMedium" accessibilityRole="header">
            Desafíos de hoy
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos los desafíos"
            hitSlop={8}
            style={styles.seeAllButton}
            onPress={() => router.push('/(tabs)/competir')}
          >
            <Text variant="label" style={{ color: tokens.color.accent.default }}>
              Ver todos
            </Text>
            <Icon name="chevron-right" size={16} color="accent" />
          </Pressable>
        </View>
        {state.dailyChallenges.length === 0 ? (
          <Text variant="bodySmall" color="secondary">
            Todavía no tienes desafíos diarios asignados.
          </Text>
        ) : (
          <View style={styles.challengesList}>
            {state.dailyChallenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeRow}>
                <View style={styles.challengeRowHeader}>
                  <Text variant="bodySmall" numberOfLines={1} style={styles.challengeName}>
                    {challenge.name}
                  </Text>
                  <Text variant="caption" color="muted" style={styles.challengeCount}>
                    {challenge.progressValue} / {challenge.targetValue}
                  </Text>
                </View>
                <Progress
                  value={challengeProgressRatio(challenge)}
                  accessibilityLabel={`${challenge.name}: ${challenge.progressValue} de ${challenge.targetValue}`}
                  height={6}
                />
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

/**
 * Kicker del card principal -- refleja el estado REAL (ADR-0014): "Continúa
 * donde quedaste" si hay respuestas registradas, "Sigue estudiando" si el
 * recurso está sin comenzar. `null` para "todo completado" / "sin contenido"
 * (ahí el título ya lo explica y el botón está deshabilitado). NO es un
 * objetivo diario -- ese concepto no existe.
 */
function continueKicker(target: ContinueTarget): string | null {
  if (target.kind !== 'topic') return null;
  return target.entry === 'exercise' ? 'Continúa donde quedaste' : 'Sigue estudiando';
}

function goalTitle(target: ContinueTarget): string {
  if (target.kind === 'topic') return target.topic.name;
  if (target.kind === 'all-completed') return `¡Completaste todo el contenido de ${target.subject.name}!`;
  return 'Todavía no hay contenido disponible.';
}

function continueButtonLabel(target: ContinueTarget): string {
  if (target.kind === 'topic') return target.entry === 'resource' ? 'Comenzar' : 'Continuar';
  return 'Sin acción disponible';
}

function createStyles(t: ThemeTokens) {
  return {
    scroll: { flex: 1, backgroundColor: t.color.background.default },
    container: { padding: spacing.space4, gap: spacing.space4, paddingBottom: spacing.space8 },

    // SOPORTE -- encabezado
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    greeting: { flex: 1, minWidth: 0 },
    streakPill: {
      flexShrink: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space1,
      backgroundColor: t.color.accent.subtleBg,
      paddingVertical: spacing.space1,
      paddingHorizontal: spacing.space2,
      borderRadius: radii.full,
    },
    streakPillMuted: {
      flexShrink: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space1,
      backgroundColor: t.color.action.disabledBackground,
      paddingVertical: spacing.space1,
      paddingHorizontal: spacing.space2,
      borderRadius: radii.full,
    },

    // SECUNDARIO -- Nivel / XP (una sola unidad)
    statusCard: { gap: spacing.space3 },
    statusRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space3 },
    statusLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space2, flexShrink: 1, minWidth: 0 },
    statusXp: { flexShrink: 0 },

    // PRIMARIO -- Continuar estudiando
    // `paddingVertical` fijo: la base del Card ya trae `padding: spacing.space4` (16)
    // horizontal; este valor SOLO sube/baja el borde vertical -- 27px validado en
    // dispositivo físico (HOME-ASSET-2), se conserva.
    continueCard: { gap: spacing.space1, overflow: 'hidden' as const, paddingVertical: 27 },
    continueKicker: { opacity: 0.75 },
    continueTitle: { marginBottom: spacing.space3 },
    // Botón habilitado: fondo `accent.default` (azul brillante) -> texto `onAccent`
    // (navy oscuro). NUNCA `text.primary`/`background.inverse` -- fue el bug real de
    // contraste en oscuro (validación Android).
    continueButton: {
      backgroundColor: t.color.accent.default,
      borderRadius: radii.medium,
      paddingVertical: spacing.space3,
      paddingHorizontal: spacing.space4,
      alignItems: 'center' as const,
    },
    continueButtonDisabled: { backgroundColor: t.color.action.disabledBackground },
    continueButtonContent: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space2 },

    // SECUNDARIO -- Desafíos de hoy
    challengesCard: { gap: spacing.space3 },
    challengesHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: spacing.space3 },
    seeAllButton: {
      flexShrink: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space1,
      paddingVertical: spacing.space2,
      paddingLeft: spacing.space2,
    },
    challengesList: { gap: spacing.space3 },
    challengeRow: { gap: spacing.space1 },
    challengeRowHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: spacing.space3 },
    challengeName: { flex: 1, minWidth: 0 },
    challengeCount: { flexShrink: 0 },
  };
}
