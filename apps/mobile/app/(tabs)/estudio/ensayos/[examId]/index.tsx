import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamDetailResponse } from '@axioma/contracts';
import { getExam, getExamAttempt, startExamAttempt } from '../../../../../lib/api/exams';
import { formatDuration } from '../../../../../lib/exams/timer';
import { isTerminal } from '../../../../../lib/exams/attempt-state';
import { getRememberedAttempt, rememberActiveAttempt, forgetActiveAttempt } from '../../../../../lib/exams/attempt-cache';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { Text, Card, Button, Divider, Icon } from '../../../../../components/ui';
import type { IconName } from '../../../../../theme';
import { useThemedStyles, useTheme, spacing } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';
import { subjectIcon, subjectToneColor } from '../../../../../lib/academic/subject-icon';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; exam: ExamDetailResponse; resumeAttemptId: string | null };

/**
 * Intro / detalle de un Ensayo -- ENSAYOS-M1-C. Consume `GET /exams/:examId`.
 * Distingue "Comenzar" de "Continuar" mirando una cache LOCAL de id de intento
 * (`lib/exams/attempt-cache`) y validándola contra el backend -- ver el
 * comentario de ese módulo: mirar la intro NUNCA debe crear un intento.
 *
 * INCREMENTO E (visual) -- jerarquía: eyebrow de materia -> título -> card de
 * 2 métricas (Preguntas / Duración) -> sección "Antes de comenzar" con 3
 * reglas escaneables -> CTA. La regla del tiempo se mantiene explícita. Cero
 * cambios de datos, requests, `handleStart`/`handleResume`, navegación ni CTA.
 */
export default function EnsayoIntroScreen() {
  const { examId, name } = useLocalSearchParams<{ examId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [starting, setStarting] = useState(false);

  // Acento de materia MUY DISCRETO: solo tiñe el eyebrow y los iconos de las
  // reglas. Mismo helper que Unidades/Recursos, sin color local.
  const { tone } = subjectIcon(name ?? '');
  const subjectAccent = subjectToneColor(tokens, tone);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const examResult = await getExam(examId);
    if (!examResult.ok) {
      setState({ status: 'error', message: examResult.message });
      return;
    }

    let resumeAttemptId: string | null = null;
    const remembered = await getRememberedAttempt(examId);
    if (remembered) {
      const attemptResult = await getExamAttempt(remembered);
      if (attemptResult.ok && attemptResult.data.status === 'ACTIVE') {
        resumeAttemptId = remembered;
      } else {
        await forgetActiveAttempt(examId);
      }
    }
    setState({ status: 'ready', exam: examResult.data, resumeAttemptId });
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart() {
    if (state.status !== 'ready' || starting) return;
    setStarting(true);
    const result = await startExamAttempt(examId);
    setStarting(false);
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    const { attemptId, status } = result.data;
    await rememberActiveAttempt(examId, attemptId);
    if (isTerminal(status)) {
      router.replace({ pathname: '/(tabs)/estudio/ensayos/[examId]/result/[attemptId]', params: { examId, attemptId, name: name ?? '' } });
    } else {
      router.replace({ pathname: '/(tabs)/estudio/ensayos/[examId]/attempt/[attemptId]', params: { examId, attemptId, name: name ?? '' } });
    }
  }

  function handleResume() {
    if (state.status !== 'ready' || !state.resumeAttemptId) return;
    router.replace({
      pathname: '/(tabs)/estudio/ensayos/[examId]/attempt/[attemptId]',
      params: { examId, attemptId: state.resumeAttemptId, name: name ?? '' },
    });
  }

  if (state.status === 'loading') return <LoadingState message="Cargando ensayo…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { exam, resumeAttemptId } = state;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.space3, paddingBottom: insets.bottom + spacing.space4 }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          {name ? (
            <Text variant="label" style={[styles.eyebrow, { color: subjectAccent }]}>
              {name}
            </Text>
          ) : null}
          <Text variant="heading2" accessibilityRole="header">
            {exam.title}
          </Text>
        </View>

        <Card variant="outlined" style={styles.metricsCard}>
          <View style={styles.metric}>
            <Text variant="titleLarge">{exam.questionCount}</Text>
            <Text variant="caption" color="secondary">
              Preguntas
            </Text>
          </View>
          <Divider orientation="vertical" />
          <View style={styles.metric}>
            <Text variant="titleLarge">{formatDuration(exam.durationSeconds)}</Text>
            <Text variant="caption" color="secondary">
              Duración
            </Text>
          </View>
        </Card>

        <View style={styles.rules}>
          <Text variant="label" color="secondary" style={styles.rulesHeading}>
            Antes de comenzar
          </Text>
          <RuleRow
            icon="clock"
            iconColor={subjectAccent}
            title="El tiempo no se pausa"
            body="Sigue corriendo aunque cierres la app."
          />
          <RuleRow
            icon="study-mode-units"
            iconColor={subjectAccent}
            title="Navega libremente"
            body="Responde en el orden que quieras y cambia tus respuestas."
          />
          <RuleRow
            icon="check"
            iconColor={subjectAccent}
            title="Entrega cuando estés listo"
            body="Puedes revisar todo antes de finalizar."
          />
        </View>
      </ScrollView>

      {resumeAttemptId ? (
        <Button variant="primary" label="Continuar ensayo" onPress={handleResume} style={styles.cta} />
      ) : (
        <Button
          variant="primary"
          label="Comenzar ensayo"
          loading={starting}
          onPress={handleStart}
          style={styles.cta}
          accessibilityLabel="Comenzar ensayo"
        />
      )}
    </View>
  );
}

/** Fila de regla del pre-start -- componente LOCAL (2 pantallas no justifican uno global). */
function RuleRow({
  icon,
  iconColor,
  title,
  body,
}: {
  icon: IconName;
  iconColor: string;
  title: string;
  body: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.ruleRow}>
      <Icon name={icon} size={18} color={iconColor} />
      <View style={styles.ruleText}>
        <Text variant="titleMedium">{title}</Text>
        <Text variant="bodySmall" color="secondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, paddingHorizontal: spacing.space4, backgroundColor: t.color.background.default },
    content: { gap: spacing.space5, paddingBottom: spacing.space6 },
    titleBlock: { gap: spacing.space1 },
    eyebrow: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    metricsCard: {
      flexDirection: 'row' as const,
      alignItems: 'stretch' as const,
      gap: spacing.space4,
    },
    metric: { flex: 1, gap: spacing.space1 },
    rules: { gap: spacing.space3 },
    rulesHeading: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    ruleRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: spacing.space3 },
    ruleText: { flex: 1, gap: 2 },
    cta: { marginTop: spacing.space2 },
  };
}
