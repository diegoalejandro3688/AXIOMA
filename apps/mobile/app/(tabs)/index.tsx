import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { UserProfileResponse } from '@axioma/contracts';
import { getProfile } from '../../lib/api/user';
import { pickContinueTarget, type ContinueTarget } from '../../lib/progress/pick-continue-topic';
import { LoadingState } from '../../components/loading-state';
import { ErrorState } from '../../components/error-state';
import { useThemedStyles } from '../../theme';
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
        <Text style={styles.greeting} accessibilityRole="header">
          Hola, {greetingName}
        </Text>
        <View style={styles.streakShell} accessibilityLabel="Racha -- próximamente">
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>Próximamente</Text>
        </View>
      </View>

      <View style={styles.levelShell} accessibilityLabel="Nivel y experiencia -- próximamente">
        <Text style={styles.levelShellText}>Nivel y XP -- Próximamente</Text>
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.goalLabel}>{goalLabel(state.target)}</Text>
        <Text style={styles.goalTitle} accessibilityRole="header">
          {goalTitle(state.target)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar estudiando"
          disabled={state.target.kind !== 'topic'}
          style={[styles.continueButton, state.target.kind !== 'topic' && styles.continueButtonDisabled]}
          onPress={goToTarget}
        >
          <Text style={state.target.kind === 'topic' ? styles.continueButtonText : styles.continueButtonTextDisabled}>
            {continueButtonLabel(state.target)}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.leagueShell]} accessibilityLabel="Liga -- próximamente">
        <View style={styles.leagueIconWrap}>
          <Text style={styles.leagueIcon}>🏆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.leagueTitle}>Liga</Text>
          <Text style={styles.leagueSubtitle}>Próximamente</Text>
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
    greeting: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    streakShell: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      backgroundColor: t.color.action.disabledBackground,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
    },
    streakIcon: { fontSize: 13, opacity: 0.6 },
    streakText: { fontSize: 11, fontWeight: '500' as const, color: t.color.action.disabledText },
    levelShell: {
      backgroundColor: t.color.action.disabledBackground,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignSelf: 'flex-start' as const,
    },
    levelShellText: { fontSize: 12, color: t.color.action.disabledText },
    // Superficie de marca fija (navy) -- ver nota de contraste en tokens.ts.
    goalCard: { backgroundColor: t.color.background.inverse, borderRadius: 16, padding: 20, gap: 4 },
    // Ambos usan `text.onInverse` (texto pensado para esta superficie fija),
    // nunca `accent.default`/`text.primary` -- ese fue el bug real de
    // contraste en oscuro (ver hallazgo de validación Android).
    goalLabel: { fontSize: 12, color: t.color.text.onInverse, opacity: 0.75 },
    goalTitle: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.onInverse, marginBottom: 12 },
    // Botón habilitado: fondo `accent.default` (azul brillante) -> texto
    // `onAccent` (navy oscuro), NUNCA `text.primary`/`background.inverse`.
    continueButton: { backgroundColor: t.color.accent.default, borderRadius: 10, padding: 12, alignItems: 'center' as const },
    continueButtonDisabled: { backgroundColor: t.color.action.disabledBackground },
    continueButtonText: { color: t.color.text.onAccent, fontSize: 14, fontWeight: '500' as const },
    // Botón deshabilitado: fondo `action.disabledBackground` -> texto
    // `action.disabledText` (par ya calibrado para AA), no `onAccent`.
    continueButtonTextDisabled: { color: t.color.action.disabledText, fontSize: 14, fontWeight: '500' as const },
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
    leagueIcon: { fontSize: 15, opacity: 0.5 },
    leagueTitle: { fontSize: 13, fontWeight: '500' as const, color: t.color.action.disabledText },
    leagueSubtitle: { fontSize: 12, color: t.color.action.disabledText },
    chevron: { fontSize: 16, color: t.color.action.disabledText },
  };
}
