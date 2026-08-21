import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { UserProfileResponse } from '@axioma/contracts';
import { getProfile } from '../../lib/api/user';
import { pickContinueTarget, type ContinueTarget } from '../../lib/progress/pick-continue-topic';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { Text, Icon } from '../../components/ui';
import { useTheme, useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: UserProfileResponse | null; target: ContinueTarget };

/**
 * Inicio -- ver ADR-0009 (semánticamente distinto de los otros 4 módulos) y
 * la aprobación de alcance de Bloque IV: racha/nivel/liga quedan como shells
 * visuales "Próximamente", nunca valores inventados. "Continuar estudiando"
 * se deriva siempre de PROGRESS/EDUCATION reales (`pickContinueTarget`),
 * nunca hardcodeado.
 */
export default function InicioScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const [profileResult, targetResult] = await Promise.all([getProfile(), pickContinueTarget()]);

    if (!targetResult.ok) {
      setState({ status: 'error', message: targetResult.message });
      return;
    }

    const profile = profileResult.ok ? profileResult.data : null;
    setState({ status: 'ready', profile, target: targetResult.target });
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="heading2" accessibilityRole="header">
          Hola, {greetingName}
        </Text>
        <View style={styles.streakShell} accessibilityLabel="Racha -- próximamente">
          <Icon name="flame" size={14} color={tokens.color.action.disabledText} />
          <Text variant="micro" style={{ color: tokens.color.action.disabledText }}>
            Próximamente
          </Text>
        </View>
      </View>

      <View style={styles.levelShell} accessibilityLabel="Nivel y experiencia -- próximamente">
        <Text variant="caption" style={{ color: tokens.color.action.disabledText }}>
          Nivel y XP -- Próximamente
        </Text>
      </View>

      <View style={styles.goalCard}>
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
          <Text
            variant="titleMedium"
            color={state.target.kind === 'topic' ? 'onAccent' : undefined}
            style={state.target.kind === 'topic' ? undefined : { color: tokens.color.action.disabledText }}
          >
            {continueButtonLabel(state.target)}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.leagueShell]} accessibilityLabel="Liga -- próximamente">
        <View style={styles.leagueIconWrap}>
          <Icon name="shield" size={16} color={tokens.color.action.disabledText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: tokens.color.action.disabledText }}>
            Liga
          </Text>
          <Text variant="caption" style={{ color: tokens.color.action.disabledText }}>
            Próximamente
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </View>
  );
}

function goalLabel(target: ContinueTarget): string {
  if (target.kind === 'topic') return 'Objetivo de hoy';
  if (target.kind === 'all-completed') return 'Objetivo de hoy';
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
    container: { flex: 1, padding: 18, gap: 16, backgroundColor: t.color.background.default },
    headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    streakShell: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: t.color.action.disabledBackground,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
    },
    levelShell: {
      backgroundColor: t.color.action.disabledBackground,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: 'flex-start' as const,
    },
    // Superficie de marca fija (navy) -- ver nota de contraste en tokens.ts.
    goalCard: { backgroundColor: t.color.background.inverse, borderRadius: 16, padding: 20, gap: 4 },
    // Ambos usan `text.onInverse` (texto pensado para esta superficie fija),
    // nunca `accent.default`/`text.primary` -- ese fue el bug real de
    // contraste en oscuro (ver hallazgo de validación Android).
    goalLabel: { opacity: 0.75 },
    goalTitle: { marginBottom: 12 },
    // Botón habilitado: fondo `accent.default` (azul brillante) -> texto
    // `onAccent` (navy oscuro), NUNCA `text.primary`/`background.inverse`.
    continueButton: { backgroundColor: t.color.accent.default, borderRadius: 10, padding: 12, alignItems: 'center' as const },
    continueButtonDisabled: { backgroundColor: t.color.action.disabledBackground },
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
    chevron: { fontSize: 16, color: t.color.action.disabledText },
  };
}
