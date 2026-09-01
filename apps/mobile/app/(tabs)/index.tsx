import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import type { UserProfileResponse, LevelProgressResponse, StreakResponse, ChallengeSummary } from '@axioma/contracts';
import { getProfile } from '../../lib/api/user';
import { getLevel, getStreak } from '../../lib/api/progression';
import { listChallenges } from '../../lib/api/challenges';
import { groupChallenges, progressRatio as challengeProgressRatio } from '../../lib/challenges/group-challenges';
import { pickContinueTarget, type ContinueTarget } from '../../lib/progress/pick-continue-topic';
import { LoadingState } from '../../components/loading-state';
import { Text, Icon, Card, Progress, LevelBadge } from '../../components/ui';
import { HomeKnowledgeIllustration } from '../../components/home/home-knowledge-illustration';
import { useTheme, useThemedStyles, spacing, radii } from '../../theme';
import type { ThemeTokens, IconName } from '../../theme';

/**
 * INICIO Increment 1.1 -- variedad visual entre los 2 previews de Desafíos.
 * Regla presentacional mínima por POSICIÓN (el contrato de `ChallengeSummary`
 * no expone dificultad/categoría; en Inicio todos son DAILY). Los glifos son
 * geométricos y neutros (diana / escalera) -- variedad visual, NO semántica
 * de negocio, sin iconos de recompensa/competición.
 */
const CHALLENGE_PREVIEW_ICONS: readonly IconName[] = ['study-mode-practice', 'study-mode-units'];

/** Máximo de previews de Desafíos en Inicio (decisión de producto Increment 1.1). */
const HOME_CHALLENGE_PREVIEW_LIMIT = 2;

/** Ruta canónica de la pantalla completa de Desafíos (registrada en `competir/_layout.tsx`, Competir Incremento 7). */
const HOME_CHALLENGES_ROUTE = '/(tabs)/competir/desafios' as const;

/**
 * Continuidad de estudio -- resultado real de `pickContinueTarget()` o, si la
 * consulta a EDUCATION/PROGRESS falla, `unavailable` (estado LOCAL del card,
 * nunca un error de pantalla completa -- INICIO Increment 2).
 */
type ContinuationView = { kind: 'target'; target: ContinueTarget } | { kind: 'unavailable' };

type ScreenState =
  | { status: 'loading' }
  | {
      status: 'ready';
      /** Un refresco silencioso (al recuperar el foco) está en curso. */
      refreshing: boolean;
      profile: UserProfileResponse | null;
      continuation: ContinuationView;
      streak: StreakResponse | null;
      level: LevelProgressResponse | null;
      dailyChallenges: ChallengeSummary[];
    };

/**
 * Inicio -- ver ADR-0009 (semánticamente distinto de los otros 4 módulos).
 *
 * Secciones INDEPENDIENTES: racha, nivel/XP, resumen de Desafíos y
 * "Continuar estudiando" se resuelven cada una por su cuenta. Si cualquiera
 * falla o no tiene datos, muestra un estado honesto EN ESA sección --
 * ninguna bloquea la pantalla ni inventa un valor. Tras INICIO Increment 2,
 * un fallo de continuidad tampoco tapa el resto: el card entra en un estado
 * "no disponible" local con "Reintentar". No queda ningún estado fatal a
 * nivel de pantalla -> se eliminó el `ErrorState` global.
 *
 * CICLO DE VIDA (Increment 2): un ÚNICO `useFocusEffect`. El primer foco
 * (montaje) hace la carga inicial con `LoadingState`; cada foco posterior
 * hace un refresco SILENCIOSO -- Expo Router retiene las pantallas de tab,
 * así que sin esto Inicio quedaría congelado tras estudiar y volver. Un
 * contador de generación descarta respuestas obsoletas (foco solapado /
 * respuesta lenta que llega tarde) y `mountedRef` evita `setState` tras
 * desmontar. Sin polling, sin aritmética optimista.
 *
 * Increment 1 / 1.1 / 1.2 (visual, aprobado y congelado): jerarquía
 * saludo+racha [soporte] / "Continuar" [dominante] / Nivel-XP + Desafíos
 * [secundario]; ilustración neutra; 2 previews de Desafíos; contorno de riel
 * de progreso.
 */
export default function InicioScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const mountedRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    const generation = ++loadGenerationRef.current;

    setState((prev) => {
      if (!silent) return { status: 'loading' };
      return prev.status === 'ready' ? { ...prev, refreshing: true } : prev;
    });

    const [profileResult, targetResult, streakResult, levelResult, challengesResult] = await Promise.all([
      getProfile(),
      pickContinueTarget(),
      getStreak(),
      getLevel(),
      listChallenges(),
    ]);

    // Descarta una respuesta obsoleta (otro foco disparó una carga más nueva)
    // o que llega tras desmontar.
    if (!mountedRef.current || generation !== loadGenerationRef.current) return;

    const freshProfile = profileResult.ok ? profileResult.data : undefined;
    const freshStreak = streakResult.ok ? streakResult.data : undefined;
    const freshLevel = levelResult.ok ? levelResult.data : undefined;
    const freshChallenges = challengesResult.ok
      ? groupChallenges(challengesResult.data.challenges).active.filter((c) => c.challengeType === 'DAILY')
      : undefined;

    setState((prev) => {
      const prevReady = prev.status === 'ready' ? prev : null;

      // En un refresco SILENCIOSO, una sección que falla CONSERVA su último
      // dato bueno (`prevReady?.x`); en la carga inicial cae a su estado
      // honesto (`null` / `[]`). Continuidad: igual, pero su fallback en la
      // carga inicial es el card "no disponible".
      const continuation: ContinuationView = targetResult.ok
        ? { kind: 'target', target: targetResult.target }
        : silent && prevReady
          ? prevReady.continuation
          : { kind: 'unavailable' };

      return {
        status: 'ready',
        refreshing: false,
        profile: freshProfile ?? (silent ? (prevReady?.profile ?? null) : null),
        streak: freshStreak ?? (silent ? (prevReady?.streak ?? null) : null),
        level: freshLevel ?? (silent ? (prevReady?.level ?? null) : null),
        dailyChallenges: freshChallenges ?? (silent ? (prevReady?.dailyChallenges ?? []) : []),
        continuation,
      };
    });
  }, []);

  // Un ÚNICO hook de ciclo de vida: primer foco -> carga inicial (con
  // LoadingState); focos posteriores -> refresco silencioso. Sin `useEffect`
  // de carga en paralelo -> nunca dos peticiones en el primer render.
  useFocusEffect(
    useCallback(() => {
      if (initializedRef.current) {
        void load({ silent: true });
      } else {
        initializedRef.current = true;
        void load({ silent: false });
      }
    }, [load]),
  );

  if (state.status === 'loading') return <LoadingState message="Cargando tu progreso…" />;

  const continuation = state.continuation;
  const target = continuation.kind === 'target' ? continuation.target : null;

  function goToTarget() {
    if (state.status !== 'ready' || state.continuation.kind !== 'target') return;
    const t = state.continuation.target;
    if (t.kind !== 'topic') return;
    const screen = t.entry === 'resource' ? 'recurso' : 'ejercicio';
    router.push({
      pathname: `/(tabs)/estudio/topic/[topicId]/${screen}`,
      params: { topicId: t.topic.id, subjectId: t.subject.id, name: t.subject.name },
    });
  }

  const greetingName = state.profile?.displayName ?? 'estudiante';
  const continuationUnavailable = continuation.kind === 'unavailable';
  const isActionable = target?.kind === 'topic';
  const kicker = target ? continueKicker(target) : null;
  const continueTitle = continuationUnavailable
    ? 'No pudimos cargar tu progreso de estudio.'
    : target
      ? goalTitle(target)
      : 'Todavía no hay contenido disponible.';
  const ctaEnabled = continuationUnavailable ? !state.refreshing : isActionable;
  const ctaLabel = continuationUnavailable
    ? state.refreshing
      ? 'Actualizando…'
      : 'Reintentar'
    : target
      ? continueButtonLabel(target)
      : 'Sin acción disponible';

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
          <View style={styles.progressTrack}>
            <Progress
              value={state.level.progressRatio}
              accessibilityLabel={`Progreso de nivel: ${Math.round(state.level.progressRatio * 100)}%`}
            />
          </View>
        </Card>
      ) : (
        <Card variant="outlined" style={styles.statusCard}>
          <Text variant="caption" style={{ color: tokens.color.action.disabledText }} accessibilityLabel="Nivel y experiencia no disponibles">
            Nivel y XP — sin datos
          </Text>
        </Card>
      )}

      {/* PRIMARIO -- Continuar estudiando. Bloque dominante. Un fallo de
          continuidad NO tapa el resto de Inicio: el card entra en un estado
          "no disponible" local con "Reintentar" (Increment 2). */}
      <Card variant="brand" style={styles.continueCard}>
        <HomeKnowledgeIllustration />
        {kicker ? (
          <Text variant="label" color="onInverse" style={styles.continueKicker}>
            {kicker}
          </Text>
        ) : null}
        <Text variant="heading3" color="onInverse" numberOfLines={2} style={styles.continueTitle} accessibilityRole="header">
          {continueTitle}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={continuationUnavailable ? 'Reintentar' : 'Continuar estudiando'}
          disabled={!ctaEnabled}
          style={[styles.continueButton, !ctaEnabled && styles.continueButtonDisabled]}
          onPress={continuationUnavailable ? () => void load({ silent: true }) : goToTarget}
        >
          <View style={styles.continueButtonContent}>
            <Text
              variant="titleMedium"
              color={ctaEnabled ? 'onAccent' : undefined}
              style={ctaEnabled ? undefined : { color: tokens.color.action.disabledText }}
            >
              {ctaLabel}
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
            onPress={() => router.push(HOME_CHALLENGES_ROUTE)}
          >
            <Text variant="label" style={{ color: tokens.color.accent.default }}>
              Ver todos
            </Text>
            <Icon name="chevron-right" size={16} color="accent" />
          </Pressable>
        </View>
        {state.dailyChallenges.length === 0 ? (
          <Text variant="bodySmall" color="secondary" style={styles.challengesEmpty}>
            Todavía no tienes desafíos diarios asignados.
          </Text>
        ) : (
          <View style={styles.challengesList}>
            {/* Presentación: como mucho 2 previews de la MISMA colección ya
                filtrada (`dailyChallenges` = activos DAILY). Sin nuevo
                algoritmo de selección, sin tocar orden/semántica. */}
            {state.dailyChallenges.slice(0, HOME_CHALLENGE_PREVIEW_LIMIT).map((challenge, index) => (
              <View key={challenge.id} style={styles.challengeRow}>
                <View style={styles.challengeIconTile}>
                  <Icon name={CHALLENGE_PREVIEW_ICONS[index] ?? CHALLENGE_PREVIEW_ICONS[0]} size={16} color="accent" />
                </View>
                <View style={styles.challengeContent}>
                  <View style={styles.challengeRowHeader}>
                    <Text variant="bodySmall" weight="medium" numberOfLines={1} style={styles.challengeName}>
                      {challenge.name}
                    </Text>
                    <Text variant="caption" color="muted" style={styles.challengeCount}>
                      {challenge.progressValue} / {challenge.targetValue}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <Progress
                      value={challengeProgressRatio(challenge)}
                      accessibilityLabel={`${challenge.name}: ${challenge.progressValue} de ${challenge.targetValue}`}
                      height={6}
                    />
                  </View>
                </View>
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
  // `all-completed` es GLOBAL (todas las materias con contenido) -- nunca se
  // nombra una sola materia (INICIO Increment 2).
  if (target.kind === 'all-completed') return '¡Completaste todo el contenido disponible!';
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

    // Contorno del riel de progreso -- INICIO Increment 1.2. La primitiva
    // `Progress` pinta su riel con `action.disabledBackground`, que en oscuro
    // es EXACTAMENTE `background.surface` (#0A1D30) -> el riel vacío se
    // funde con la tarjeta y a 0 % la barra desaparece. Este contorno de
    // 1px (`border.default`) define el riel a cualquier valor SIN falsear el
    // relleno (0 % sigue siendo 0 px). Subtle en claro (#D3D1C7), visible en
    // oscuro (#17324D sobre #0A1D30).
    progressTrack: {
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: t.color.border.default,
      overflow: 'hidden' as const,
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

    // SECUNDARIO -- Desafíos de hoy. Personalidad propia (icono + fila con
    // aire), calma / hábito -- nunca la tarjeta-juego de Competir.
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
    challengesEmpty: { paddingVertical: spacing.space1 },
    challengesList: { gap: spacing.space4 },
    challengeRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: spacing.space3 },
    challengeIconTile: {
      width: 32,
      height: 32,
      borderRadius: radii.small,
      backgroundColor: t.color.accent.subtleBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    challengeContent: { flex: 1, minWidth: 0, gap: spacing.space2, paddingTop: spacing.space1 },
    challengeRowHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: spacing.space3 },
    challengeName: { flex: 1, minWidth: 0 },
    challengeCount: { flexShrink: 0 },
  };
}
