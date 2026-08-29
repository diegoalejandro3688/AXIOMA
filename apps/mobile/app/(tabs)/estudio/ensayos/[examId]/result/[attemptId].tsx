import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamAttemptResultResponse } from '@axioma/contracts';
import { getExamResult } from '../../../../../../lib/api/exams';
import { resultStatusLabel } from '../../../../../../lib/exams/attempt-state';
import { LoadingState } from '../../../../../../components/loading-state';
import { ErrorState } from '../../../../../../components/error-state';
import { Text, Card, Button } from '../../../../../../components/ui';
import { useThemedStyles, spacing } from '../../../../../../theme';
import type { ThemeTokens } from '../../../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; result: ExamAttemptResultResponse };

/** Porcentaje con coma decimal (es-CL) y sin decimales innecesarios: 40 -> "40%", 64.6 -> "64,6%". */
function formatPercentage(value: number | null): string {
  if (value === null) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${String(rounded).replace('.', ',')}%`;
}

/**
 * Resultado de un intento -- ENSAYOS-M1-C. Consume `GET /exams/me/attempts/:id/result`.
 * Muestra SOLO conteo global (ADR-0024): correctas / incorrectas / sin
 * responder / total / porcentaje. NUNCA: puntaje PAES, escala 100-1000,
 * percentil, comparación nacional, XP, LP, racha, liga, trofeos.
 */
export default function EnsayoResultScreen() {
  const { examId, attemptId, name } = useLocalSearchParams<{ examId: string; attemptId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getExamResult(attemptId);
    setState(result.ok ? { status: 'ready', result: result.data } : { status: 'error', message: result.message });
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Calculando tu resultado…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const { status, score } = state.result;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="label" color="secondary" style={styles.eyebrow}>
          {resultStatusLabel(status)}
        </Text>
        <Text variant="heading1" accessibilityRole="header">
          {score.correct} / {score.totalQuestions} correctas
        </Text>
        <Text variant="titleLarge" color="secondary">
          {formatPercentage(score.accuracyPercentage)} de aciertos
        </Text>

        <Card variant="outlined" style={styles.breakdown}>
          <Row label="Correctas" value={score.correct} />
          <Row label="Incorrectas" value={score.incorrect} />
          <Row label="Sin responder" value={score.unanswered} />
          <Row label="Total" value={score.totalQuestions} />
        </Card>

        <Text variant="bodySmall" color="secondary">
          El porcentaje se calcula sobre el total de preguntas: las que quedaron sin responder también restan.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          variant="primary"
          label="Revisar respuestas"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/estudio/ensayos/[examId]/review/[attemptId]',
              params: { examId, attemptId, name: name ?? '' },
            })
          }
        />
        <Button
          variant="secondary"
          label="Volver al ensayo"
          onPress={() =>
            router.replace({ pathname: '/(tabs)/estudio/ensayos/[examId]', params: { examId, name: name ?? '' } })
          }
        />
      </View>
    </View>
  );

  function Row({ label, value }: { label: string; value: number }) {
    return (
      <View style={styles.row}>
        <Text variant="body" color="secondary">
          {label}
        </Text>
        <Text variant="body" weight="semibold">
          {value}
        </Text>
      </View>
    );
  }
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, paddingHorizontal: 16, backgroundColor: t.color.background.default },
    content: { gap: 8, paddingBottom: 24 },
    eyebrow: { textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4 },
    breakdown: { gap: spacing.space2, marginTop: 12 },
    row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
    actions: { gap: spacing.space2, paddingTop: spacing.space2 },
  };
}
