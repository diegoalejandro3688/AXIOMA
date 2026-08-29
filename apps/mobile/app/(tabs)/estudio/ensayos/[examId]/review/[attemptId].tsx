import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamAttemptReviewResponse } from '@axioma/contracts';
import { getExamReview } from '../../../../../../lib/api/exams';
import { reviewOptionState, reviewNavCellState } from '../../../../../../lib/exams/attempt-state';
import { LoadingState } from '../../../../../../components/loading-state';
import { ErrorState } from '../../../../../../components/error-state';
import { ContentBlockRenderer } from '../../../../../../components/content-block-renderer';
import { ExamQuestionNavigator, type NavigatorCellState } from '../../../../../../components/exams/exam-question-navigator';
import { IconButton, Text, Button, AnswerOption } from '../../../../../../components/ui';
import type { AnswerOptionState } from '../../../../../../components/ui';
import { useThemedStyles, spacing, radii } from '../../../../../../theme';
import type { ThemeTokens } from '../../../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; review: ExamAttemptReviewResponse };

/**
 * Revisión de un intento -- ENSAYOS-M1-C. Consume `GET /exams/me/attempts/:id/review`
 * (el backend la bloquea con 409 mientras el intento sigue ACTIVE). Recién
 * AQUÍ se muestran la alternativa correcta, el acierto/error y la explicación.
 * Reutiliza `ContentBlockRenderer` (fórmulas incluidas) y `AnswerOption`.
 */
export default function EnsayoReviewScreen() {
  const { examId, attemptId, name } = useLocalSearchParams<{ examId: string; attemptId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [navigatorOpen, setNavigatorOpen] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getExamReview(attemptId);
    if (result.ok) {
      setState({ status: 'ready', review: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 409) {
      // El intento aún está ACTIVE -> la revisión no aplica todavía.
      router.replace({ pathname: '/(tabs)/estudio/ensayos/[examId]/result/[attemptId]', params: { examId, attemptId, name: name ?? '' } });
      return;
    }
    setState({ status: 'error', message: result.message });
  }, [attemptId, examId, name, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando la revisión…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const questions = state.review.questions;
  const total = questions.length;
  const safeIndex = Math.min(currentIndex, total - 1);
  const question = questions[safeIndex];
  const unanswered = question.selectedAnswerOptionId === null;

  const navigatorStates: NavigatorCellState[] = questions.map((q, index) => {
    const cell = reviewNavCellState({ isCurrent: index === safeIndex, question: q });
    return cell === 'current' ? 'current' : cell === 'correct' ? 'correct' : cell === 'incorrect' ? 'incorrect' : 'unanswered';
  });

  const statusLabel = unanswered ? 'Sin responder' : question.isCorrect ? 'Correcta' : 'Incorrecta';
  const statusColor = unanswered ? 'secondary' : question.isCorrect ? 'success' : 'error';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.header}>
        <IconButton name="close" accessibilityLabel="Cerrar la revisión" onPress={() => router.back()} color="secondary" />
        <Text variant="label" color="secondary" style={styles.progressLabel}>
          Pregunta {safeIndex + 1} de {total}
        </Text>
        <Text variant="label" color={statusColor} weight="semibold">
          {statusLabel}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={navigatorOpen ? 'Ocultar el listado de preguntas' : 'Ver el listado de preguntas'}
        onPress={() => setNavigatorOpen((open) => !open)}
        style={styles.navToggle}
      >
        <Text variant="bodySmall" color="secondary">
          {navigatorOpen ? 'Ocultar preguntas' : 'Ver preguntas'}
        </Text>
      </Pressable>
      {navigatorOpen ? (
        <View style={styles.navigatorWrap}>
          <ExamQuestionNavigator
            count={total}
            states={navigatorStates}
            onSelect={(index) => {
              setCurrentIndex(index);
              setNavigatorOpen(false);
            }}
          />
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ContentBlockRenderer blocks={question.stemContent} />

        <View style={styles.options}>
          {question.answerOptions.map((option, optionIndex) => {
            const review = reviewOptionState(question, option.id);
            const optionState: AnswerOptionState =
              review === 'correct' ? 'correct' : review === 'incorrect' ? 'incorrect' : 'default';
            return (
              <AnswerOption
                key={option.id}
                label={String.fromCharCode(65 + optionIndex)}
                state={optionState}
                disabled
                accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}${
                  option.id === question.correctAnswerOptionId ? ', correcta' : ''
                }${option.id === question.selectedAnswerOptionId ? ', tu respuesta' : ''}`}
                onPress={() => undefined}
              >
                <ContentBlockRenderer blocks={[option.content]} formulaContext="option" />
              </AnswerOption>
            );
          })}
        </View>

        {unanswered ? (
          <Text variant="bodySmall" color="secondary">
            No respondiste esta pregunta.
          </Text>
        ) : null}

        {question.explanationContent ? (
          <View style={styles.explanation}>
            <Text variant="label" color="secondary" style={styles.explanationEyebrow}>
              Explicación
            </Text>
            <ContentBlockRenderer blocks={question.explanationContent} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.navRow}>
        <Button
          variant="secondary"
          size="small"
          label="Anterior"
          disabled={safeIndex === 0}
          onPress={() => setCurrentIndex(Math.max(0, safeIndex - 1))}
        />
        <Button
          variant="secondary"
          size="small"
          label="Siguiente"
          disabled={safeIndex === total - 1}
          onPress={() => setCurrentIndex(Math.min(total - 1, safeIndex + 1))}
        />
      </View>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, paddingHorizontal: 16, backgroundColor: t.color.background.default },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space2,
      marginBottom: spacing.space2,
    },
    progressLabel: { flex: 1, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    navToggle: { alignSelf: 'flex-start' as const, paddingVertical: spacing.space1 },
    navigatorWrap: {
      paddingVertical: spacing.space2,
      paddingHorizontal: spacing.space1,
      borderRadius: radii.medium,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      marginBottom: spacing.space2,
    },
    // ENSAYOS-M1-D -- mismo motivo que la pantalla de intento: el ScrollView
    // debe quedar acotado entre el header y la fila de navegación.
    scroll: { flex: 1 },
    content: { gap: 14, paddingBottom: 32 },
    options: { gap: spacing.space3 },
    explanation: {
      gap: spacing.space2,
      borderRadius: radii.medium,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
      padding: 14,
    },
    explanationEyebrow: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    navRow: { flexDirection: 'row' as const, gap: spacing.space2, paddingTop: spacing.space2 },
  };
}
