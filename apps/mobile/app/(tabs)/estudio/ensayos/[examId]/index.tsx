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
import { Text, Card, Button } from '../../../../../components/ui';
import { useThemedStyles, spacing } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; exam: ExamDetailResponse; resumeAttemptId: string | null };

/**
 * Intro / detalle de un Ensayo -- ENSAYOS-M1-C. Consume `GET /exams/:examId`.
 * Distingue "Comenzar" de "Continuar" mirando una cache LOCAL de id de intento
 * (`lib/exams/attempt-cache`) y validándola contra el backend -- ver el
 * comentario de ese módulo: mirar la intro NUNCA debe crear un intento.
 */
export default function EnsayoIntroScreen() {
  const { examId, name } = useLocalSearchParams<{ examId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [starting, setStarting] = useState(false);

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
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="heading2" accessibilityRole="header">
          {exam.title}
        </Text>

        <Card variant="outlined" style={styles.factCard}>
          <Text variant="bodySmall">{exam.questionCount} preguntas</Text>
          <Text variant="bodySmall">Duración: {formatDuration(exam.durationSeconds)}</Text>
          {name ? <Text variant="bodySmall" color="secondary">{name}</Text> : null}
        </Card>

        <Text variant="body" color="secondary">
          Es una simulación completa: responde en el orden que quieras y ajusta tus respuestas hasta que decidas entregar.
        </Text>

        <Card variant="subtle" style={styles.noteCard}>
          <Text variant="bodySmall" color="secondary">
            El tiempo sigue corriendo aunque cierres la app. No hay pausa.
          </Text>
          <Text variant="bodySmall" color="secondary">
            Puedes navegar entre las preguntas y cambiar cualquier respuesta antes de entregar.
          </Text>
        </Card>
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

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, paddingHorizontal: 16, backgroundColor: t.color.background.default },
    content: { gap: 16, paddingBottom: 24 },
    factCard: { gap: spacing.space1 },
    noteCard: { gap: spacing.space2 },
    cta: { marginTop: 8 },
  };
}
