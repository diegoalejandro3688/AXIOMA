import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { QuestionResponse, TopicProgressResponse } from '@axioma/contracts';
import { listPublishedQuestions } from '../../../../../lib/api/education';
import { getTopicProgress } from '../../../../../lib/api/progress';
import { submitResponseViaOutbox } from '../../../../../lib/progress/submit-response';
import { syncPendingOperations } from '../../../../../lib/offline/sync-worker';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { EmptyState } from '../../../../../components/empty-state';
import { ContentBlockRenderer } from '../../../../../components/content-block-renderer';
import { useThemedStyles } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';

/** `isCorrect: null` = respondida localmente, pendiente de confirmación del servidor (ver ADR-0014, punto 5). */
interface AnsweredState {
  answerOptionId: string;
  isCorrect: boolean | null;
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; questions: QuestionResponse[]; topicStatus: TopicProgressResponse['status']; answers: Record<string, AnsweredState> };

/**
 * Ejercicio -- segundo paso del recorrido. Se alcanza cuando la unidad ya
 * tiene al menos una respuesta (ver `resolve-continuation.ts`, ADR-0014).
 * Una pregunta por pantalla (wireframe aprobado): `displayedQuestionVersionId`
 * es independiente de "primera pregunta no respondida" -- así, al responder,
 * la pantalla se queda mostrando la retroalimentación de ESA pregunta hasta
 * que el estudiante pulsa "Continuar", en vez de saltar a la siguiente en el
 * mismo render y ocultar el resultado antes de que pueda verlo.
 */
export default function EjercicioScreen() {
  const { topicId, subjectId, name } = useLocalSearchParams<{ topicId: string; subjectId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [displayedQuestionVersionId, setDisplayedQuestionVersionId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    setSubmitError(null);
    // Disparador "montaje de pantalla" del worker offline (ADR-0014, punto 5).
    await syncPendingOperations();

    const [questionsResult, progressResult] = await Promise.all([
      listPublishedQuestions(topicId),
      getTopicProgress(topicId),
    ]);

    if (!questionsResult.ok) {
      setState({ status: 'error', message: questionsResult.message });
      return;
    }
    if (!progressResult.ok) {
      setState({ status: 'error', message: progressResult.message });
      return;
    }

    const answers: Record<string, AnsweredState> = {};
    for (const response of progressResult.data.responses) {
      answers[response.questionVersionId] = { answerOptionId: response.answerOptionId, isCorrect: response.isCorrect };
    }

    const firstUnanswered = questionsResult.data.find((question) => !answers[question.versionId]);
    setDisplayedQuestionVersionId(firstUnanswered?.versionId ?? null);
    setShowCompleted(!firstUnanswered);

    setState({ status: 'ready', questions: questionsResult.data, topicStatus: progressResult.data.status, answers });
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(question: QuestionResponse, answerOptionId: string) {
    if (state.status !== 'ready') return;
    if (state.answers[question.versionId]) return; // ya respondida -- inmutable (ADR-0014).
    setSubmitError(null);
    setSubmitting(true);

    const outcome = await submitResponseViaOutbox({
      curriculumTopicId: topicId,
      questionVersionId: question.versionId,
      answerOptionId,
    });

    setSubmitting(false);
    setState((prev) => {
      if (prev.status !== 'ready') return prev;
      if (outcome.kind === 'ok') {
        return {
          ...prev,
          topicStatus: outcome.data.topicStatus,
          answers: { ...prev.answers, [question.versionId]: { answerOptionId: outcome.data.answerOptionId, isCorrect: outcome.data.isCorrect } },
        };
      }
      if (outcome.kind === 'conflict') {
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [question.versionId]: { answerOptionId: outcome.existingResponse.answerOptionId, isCorrect: outcome.existingResponse.isCorrect },
          },
        };
      }
      if ((outcome.kind === 'network' || (outcome.kind === 'error' && outcome.status >= 500)) && Platform.OS !== 'web') {
        return { ...prev, answers: { ...prev.answers, [question.versionId]: { answerOptionId, isCorrect: null } } };
      }
      return prev;
    });

    if (outcome.kind === 'error' && outcome.status < 500) {
      setSubmitError(outcome.message);
    } else if (outcome.kind === 'network' && Platform.OS === 'web') {
      setSubmitError('No se pudo enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.');
    } else if (outcome.kind === 'error' && outcome.status >= 500 && Platform.OS === 'web') {
      setSubmitError('El servidor no pudo procesar la respuesta. Inténtalo de nuevo.');
    }
    // `displayedQuestionVersionId` deliberadamente NO cambia aquí -- la
    // pantalla se queda en esta pregunta mostrando su retroalimentación
    // hasta que el estudiante pulse "Continuar" (ver `handleContinue`).
  }

  function handleContinue() {
    if (state.status !== 'ready') return;
    const next = state.questions.find((question) => !state.answers[question.versionId]);
    if (next) {
      setDisplayedQuestionVersionId(next.versionId);
    } else {
      setShowCompleted(true);
    }
  }

  function backToUnidades() {
    router.push({ pathname: '/(tabs)/estudio/[subjectId]/unidades', params: { subjectId, name: name ?? '' } });
  }

  if (state.status === 'loading') return <LoadingState message="Cargando preguntas…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.questions.length === 0) {
    return <EmptyState message="Todavía no hay preguntas publicadas para esta unidad." actionLabel="Volver a la unidad" onAction={backToUnidades} />;
  }

  if (showCompleted) {
    return (
      <View style={[styles.completedScreen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.completedBadge}>
          <Text style={styles.completedIcon}>✓</Text>
        </View>
        <Text style={styles.completedTitle} accessibilityRole="header">
          Unidad completada
        </Text>
        <Text style={styles.completedMessage}>Respondiste todas las preguntas de esta unidad.</Text>
        <Pressable accessibilityRole="button" style={styles.continueButton} onPress={backToUnidades}>
          <Text style={styles.continueButtonText}>Volver a Unidades</Text>
        </Pressable>
      </View>
    );
  }

  const currentQuestion = state.questions.find((question) => question.versionId === displayedQuestionVersionId) ?? null;
  if (!currentQuestion) return <LoadingState message="Cargando pregunta…" />;

  const answeredCount = state.questions.filter((question) => state.answers[question.versionId]).length;
  const totalSteps = 1 + state.questions.length; // 1 = paso de Recurso ya completado.
  const currentStep = 1 + answeredCount;
  const questionIndex = state.questions.findIndex((question) => question.versionId === currentQuestion.versionId);
  const answered = state.answers[currentQuestion.versionId];
  const isAnswered = !!answered;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar ejercicio" onPress={backToUnidades} hitSlop={8}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel={`Paso ${currentStep} de ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View key={index} style={[styles.progressSegment, index < currentStep ? styles.progressSegmentDone : styles.progressSegmentPending]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.questionNumber}>Pregunta {questionIndex + 1}</Text>
        <ContentBlockRenderer blocks={currentQuestion.stemContent} />

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

        <View style={styles.options}>
          {currentQuestion.answerOptions.map((option, optionIndex) => {
            const isSelected = answered?.answerOptionId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                disabled={isAnswered || submitting}
                onPress={() => handleSelect(currentQuestion, option.id)}
                style={[
                  styles.option,
                  isSelected && answered?.isCorrect === true && styles.optionCorrect,
                  isSelected && answered?.isCorrect === false && styles.optionIncorrect,
                  isSelected && answered?.isCorrect === null && styles.optionPending,
                ]}
              >
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)})</Text>
                <ContentBlockRenderer blocks={[option.content]} />
                {submitting && isSelected ? <ActivityIndicator size="small" /> : null}
              </Pressable>
            );
          })}
        </View>

        {answered && answered.isCorrect === null ? (
          <Text style={styles.pendingNote}>Guardada localmente -- pendiente de sincronizar.</Text>
        ) : null}

        {answered && answered.isCorrect !== null ? (
          <View style={[styles.feedback, answered.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
            <Text style={answered.isCorrect ? styles.feedbackTextCorrect : styles.feedbackTextIncorrect}>
              {answered.isCorrect ? 'Correcto' : 'Incorrecto'}
            </Text>
            <ContentBlockRenderer blocks={currentQuestion.explanationContent} />
            {/*
              Acceso contextual al Tutor IA -- LEF Bloque VI, Incremento 8
              (punto de entrada 2, §28). Solo se envía el IDENTIFICADOR de la
              versión de pregunta: el backend resuelve por su cuenta materia,
              tema, alternativa elegida, corrección y explicación desde sus
              fuentes canónicas (`AiAcademicContextBuilder`). Mobile NUNCA
              envía `correctAnswer`/`isCorrect`/explicación/progreso.
              Deliberadamente aparece solo DESPUÉS de responder (la
              retroalimentación ya está revelada), sin alterar en nada el
              flujo del ejercicio.
            */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Preguntar al Tutor IA sobre esta pregunta"
              onPress={() => router.push({ pathname: '/(tabs)/ia', params: { contextQuestionVersionId: currentQuestion.versionId } })}
              style={styles.tutorButton}
            >
              <Text style={styles.tutorButtonText}>Preguntar al Tutor IA</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {answered && answered.isCorrect !== null ? (
        <Pressable accessibilityRole="button" style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continuar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default, paddingHorizontal: 18 },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 20 },
    closeIcon: { fontSize: 16, color: t.color.text.secondary },
    progressTrack: { flex: 1, flexDirection: 'row' as const, gap: 4 },
    progressSegment: { flex: 1, height: 6, borderRadius: 3 },
    progressSegmentDone: { backgroundColor: t.color.accent.default },
    progressSegmentPending: { backgroundColor: t.color.border.default },
    content: { gap: 14, paddingBottom: 24 },
    questionNumber: {
      fontSize: 12,
      color: t.color.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    submitError: { color: t.color.state.error.text, fontSize: 13 },
    options: { gap: 10 },
    option: {
      flexDirection: 'row' as const,
      gap: 8,
      alignItems: 'center' as const,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.color.border.default,
      backgroundColor: t.color.background.surface,
    },
    optionCorrect: { backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border },
    optionIncorrect: { backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border },
    optionPending: { backgroundColor: t.color.state.warning.background, borderColor: t.color.state.warning.border },
    optionLetter: { fontWeight: '700' as const, color: t.color.text.primary },
    pendingNote: { fontSize: 12, color: t.color.state.warning.text, fontStyle: 'italic' as const },
    feedback: { gap: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
    feedbackCorrect: { backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border },
    feedbackIncorrect: { backgroundColor: t.color.state.error.background, borderColor: t.color.state.error.border },
    feedbackTextCorrect: { color: t.color.state.success.text, fontWeight: '700' as const },
    feedbackTextIncorrect: { color: t.color.state.error.text, fontWeight: '700' as const },
    tutorButton: {
      alignSelf: 'flex-start' as const,
      borderWidth: 1,
      borderColor: t.color.accent.default,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginTop: 4,
    },
    tutorButtonText: { color: t.color.accent.strong, fontWeight: '600' as const, fontSize: 13 },
    completedScreen: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 14,
      padding: 24,
      backgroundColor: t.color.background.default,
    },
    completedBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.color.state.success.background,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    completedIcon: { fontSize: 28, color: t.color.state.success.text, fontWeight: '700' as const },
    completedTitle: { fontSize: 19, fontWeight: '700' as const, color: t.color.text.primary },
    completedMessage: { fontSize: 14, color: t.color.text.secondary, textAlign: 'center' as const },
    continueButton: {
      backgroundColor: t.color.background.inverse,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center' as const,
      marginTop: 8,
    },
    continueButtonText: { color: t.color.text.onInverse, fontSize: 14, fontWeight: '500' as const },
  };
}
