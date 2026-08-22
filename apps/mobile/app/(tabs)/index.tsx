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
import { useTheme, useThemedStyles } from '../../theme';
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
 * todavía, sin participación de liga activa, sin desafíos asignados), se
 * muestra un estado honesto en esa sección -- nunca bloquea la pantalla ni
 * inventa un valor. Solo `pickContinueTarget()` (el card principal) sigue
 * siendo obligatorio para que Inicio cargue -- mismo criterio que antes de
 * HOME-1.
 *
 * "Materia"/"Unidad" visibles en el card principal y el progreso hacia la
 * siguiente liga quedan diferidos a HOME-2 (requieren auditar la jerarquía
 * curricular y extender `CompetitiveContext`, respectivamente -- ver
 * HOME-AUDIT).
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + 18 }]}>
      <View style={styles.headerRow}>
        <Text variant="heading2" accessibilityRole="header">
          Hola, {greetingName}
        </Text>
        {state.streak ? (
          <View style={styles.streakShell} accessibilityLabel={`Racha de ${state.streak.currentStreak} días`}>
            <Icon name="flame" size={14} color={tokens.color.accent.strong} />
            <Text variant="micro" style={{ color: tokens.color.accent.strong }}>
              Racha de {state.streak.currentStreak} días
            </Text>
          </View>
        ) : (
          <View style={styles.streakShellDisabled} accessibilityLabel="Racha no disponible">
            <Icon name="flame" size={14} color={tokens.color.action.disabledText} />
            <Text variant="micro" style={{ color: tokens.color.action.disabledText }}>
              Sin datos
            </Text>
          </View>
        )}
      </View>

      {state.level ? (
        <View style={styles.levelBlock} accessibilityLabel="Nivel y experiencia">
          <LevelBadge levelNumber={state.level.currentLevel.levelNumber} size={40} />
          <View style={styles.levelMiddle}>
            <Text variant="caption" color="secondary">
              Nivel {state.level.currentLevel.levelNumber}
            </Text>
            <Progress
              value={state.level.progressRatio}
              accessibilityLabel={`Progreso de nivel: ${Math.round(state.level.progressRatio * 100)}%`}
            />
          </View>
          <Text variant="caption" color="secondary">
            {state.level.xpForNextLevel !== null
              ? `${state.level.xpIntoLevel} / ${state.level.xpForNextLevel} XP`
              : `${state.level.lifetimeXp} XP`}
          </Text>
        </View>
      ) : (
        <View style={styles.levelShell} accessibilityLabel="Nivel y experiencia no disponibles">
          <Text variant="caption" style={{ color: tokens.color.action.disabledText }}>
            Nivel y XP -- sin datos
          </Text>
        </View>
      )}

      <Card variant="brand" style={styles.goalCard}>
        <Text variant="label" color="onInverse" style={styles.goalLabel}>
          {goalLabel(state.target)}
        </Text>
        <Text variant="heading3" color="onInverse" style={styles.goalTitle} accessibilityRole="header">
          {goalTitle(state.target)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar estudiando"
          disabled={state.target.kind !== 'topic'}
          style={[styles.continueButton, state.target.kind !== 'topic' && styles.continueButtonDisabled]}
          onPress={goToTarget}
        >
          <View style={styles.continueButtonContent}>
            <Text
              variant="titleMedium"
              color={state.target.kind === 'topic' ? 'onAccent' : undefined}
              style={state.target.kind === 'topic' ? undefined : { color: tokens.color.action.disabledText }}
            >
              {continueButtonLabel(state.target)}
            </Text>
            {state.target.kind === 'topic' ? <Icon name="chevron-right" size={20} color="onAccent" /> : null}
          </View>
        </Pressable>
      </Card>

      {state.competitive ? (
        <View style={styles.leagueRow} accessibilityLabel={`Liga: ${state.competitive.leagueName}, puesto ${state.competitive.rankPosition}`}>
          <View style={styles.leagueIconWrap}>
            <Icon name="shield" size={16} color="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium">{state.competitive.leagueName}</Text>
            <Text variant="caption" color="secondary">
              Puesto {state.competitive.rankPosition}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.leagueShell} accessibilityLabel="Sin liga activa">
          <View style={styles.leagueIconWrap}>
            <Icon name="shield" size={16} color={tokens.color.action.disabledText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: tokens.color.action.disabledText }}>
              Liga
            </Text>
            <Text variant="caption" style={{ color: tokens.color.action.disabledText }}>
              Sin liga activa
            </Text>
          </View>
        </View>
      )}

      <Card variant="outlined" style={styles.challengesCard}>
        <View style={styles.challengesHeader}>
          <Text variant="titleMedium" accessibilityRole="header">
            Desafíos de hoy
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todos los desafíos"
            style={styles.seeAllButton}
            onPress={() => router.push('/(tabs)/competir')}
          >
            <Text variant="titleMedium" color="primary" style={{ color: tokens.color.accent.default }}>
              Ver todos
            </Text>
            <Icon name="chevron-right" size={18} color="accent" />
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
                  <Text variant="bodySmall">{challenge.name}</Text>
                  <Text variant="bodySmall" color="secondary">
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

function goalLabel(target: ContinueTarget): string {
  if (target.kind === 'topic') return target.entry === 'exercise' ? 'Continúa donde quedaste' : 'Objetivo de hoy';
  return 'Objetivo de hoy';
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
    container: { padding: 18, gap: 16, paddingBottom: 32 },
    headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    streakShell: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: t.color.accent.subtleBg,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
    },
    streakShellDisabled: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: t.color.action.disabledBackground,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
    },
    levelBlock: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
    levelMiddle: { flex: 1, gap: 6 },
    levelShell: {
      backgroundColor: t.color.action.disabledBackground,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: 'flex-start' as const,
    },
    goalCard: { gap: 4 },
    // Ambos usan `text.onInverse` (texto pensado para esta superficie fija),
    // nunca `accent.default`/`text.primary` -- ese fue el bug real de
    // contraste en oscuro (ver hallazgo de validación Android).
    goalLabel: { opacity: 0.75 },
    goalTitle: { marginBottom: 12 },
    // Botón habilitado: fondo `accent.default` (azul brillante) -> texto
    // `onAccent` (navy oscuro), NUNCA `text.primary`/`background.inverse`.
    continueButton: { backgroundColor: t.color.accent.default, borderRadius: 10, padding: 12, alignItems: 'center' as const },
    continueButtonDisabled: { backgroundColor: t.color.action.disabledBackground },
    continueButtonContent: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
    leagueRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 16,
      padding: 14,
    },
    leagueShell: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      backgroundColor: t.color.action.disabledBackground,
      borderWidth: 1,
      borderColor: t.color.action.disabledBorder,
      borderRadius: 16,
      padding: 14,
    },
    leagueIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.color.background.surface,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    challengesCard: { gap: 10 },
    challengesHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    seeAllButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2 },
    challengesList: { gap: 10 },
    challengeRow: { gap: 4 },
    challengeRowHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  };
}
