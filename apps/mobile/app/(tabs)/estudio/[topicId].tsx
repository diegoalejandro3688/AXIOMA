import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { LearningResourceResponse, QuestionResponse, TopicProgressStatus } from '@axioma/contracts';
import { getPublishedResource, listPublishedQuestions } from '../../../lib/api/education';
import { getTopicProgress } from '../../../lib/api/progress';
import { submitResponseViaOutbox } from '../../../lib/progress/submit-response';
import { syncPendingOperations } from '../../../lib/offline/sync-worker';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { ContentBlockRenderer } from '../../../components/content-block-renderer';

/** `isCorrect: null` = respondida localmente, todavía pendiente de confirmación del servidor (ver ADR-0014, punto 5). */
interface AnsweredState {
  answerOptionId: string;
  isCorrect: boolean | null;
}

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      resource: LearningResourceResponse | null;
      questions: QuestionResponse[];
      topicStatus: TopicProgressStatus;
      answers: Record<string, AnsweredState>;
    };

/**
 * Detalle de unidad -- ver ADR-0014. Recurso de solo lectura + preguntas
 * interactivas: responder revela `isCorrect` y la explicación (ya presente
 * en `question.explanationContent` desde Bloque I/II -- PROGRESS nunca la
 * duplica, ver ADR-0014 "Alternativas descartadas").
 */
export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [submittingQuestionId, setSubmittingQuestionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    // Disparador "montaje de pantalla" del worker offline (ADR-0014, punto 5)
    // -- antes de leer el progreso, para no mostrar un estado desactualizado
    // si quedó una respuesta pendiente de una visita anterior.
    await syncPendingOperations();

    const [resourceResult, questionsResult, progressResult] = await Promise.all([
      getPublishedResource(topicId),
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

    let resource: LearningResourceResponse | null = null;
    if (resourceResult.ok) {
      resource = resourceResult.data;
    } else if (!(resourceResult.kind === 'http' && resourceResult.status === 404)) {
      setState({ status: 'error', message: resourceResult.message });
      return;
    }

    const answers: Record<string, AnsweredState> = {};
    for (const response of progressResult.data.responses) {
      answers[response.questionVersionId] = { answerOptionId: response.answerOptionId, isCorrect: response.isCorrect };
    }

    setState({
      status: 'ready',
      resource,
      questions: questionsResult.data,
      topicStatus: progressResult.data.status,
      answers,
    });
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(question: QuestionResponse, answerOptionId: string) {
    if (state.status !== 'ready') return;
    if (state.answers[question.versionId]) return; // ya respondida -- inmutable (ADR-0014).
    setSubmitError(null);
    setSubmittingQuestionId(question.versionId);

    const outcome = await submitResponseViaOutbox({
      curriculumTopicId: topicId,
      questionVersionId: question.versionId,
      answerOptionId,
    });

    setSubmittingQuestionId(null);
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
        // Reconciliar con la verdad del servidor -- nunca confiar en la selección local si difiere.
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [question.versionId]: { answerOptionId: outcome.existingResponse.answerOptionId, isCorrect: outcome.existingResponse.isCorrect },
          },
        };
      }
      if ((outcome.kind === 'network' || (outcome.kind === 'error' && outcome.status >= 500)) && Platform.OS !== 'web') {
        // Nativo: SIEMPRE pasa por la cola offline primero (ADR-0014) -- un
        // fallo de red aquí significa que la operación ya quedó encolada
        // localmente y se sincronizará sola. isCorrect todavía desconocido.
        return { ...prev, answers: { ...prev.answers, [question.versionId]: { answerOptionId, isCorrect: null } } };
      }
      // Web nunca encola (expo-sqlite no funciona en ese target -- ver
      // ADR-0011/ADR-0014): un fallo de red o servidor aquí significa que
      // la respuesta NO quedó guardada en ningún lado. No se marca como
      // respondida -- el estudiante puede reintentar la misma pregunta.
      return prev;
    });

    if (outcome.kind === 'error' && outcome.status < 500) {
      setSubmitError(outcome.message);
    } else if (outcome.kind === 'network' && Platform.OS === 'web') {
      setSubmitError('No se pudo enviar la respuesta. Revisa tu conexión e inténtalo de nuevo.');
    } else if (outcome.kind === 'error' && outcome.status >= 500 && Platform.OS === 'web') {
      setSubmitError('El servidor no pudo procesar la respuesta. Inténtalo de nuevo.');
    }
  }

  if (state.status === 'loading') return <LoadingState message="Cargando unidad…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{topicStatusLabel(state.topicStatus)}</Text>
      </View>

      {state.resource ? (
        <View style={styles.section}>
          <Text style={styles.resourceTitle} accessibilityRole="header">
            {state.resource.title}
          </Text>
          <ContentBlockRenderer blocks={state.resource.contentBlocks} />
        </View>
      ) : (
        <EmptyState message="Todavía no hay un recurso publicado para esta unidad." />
      )}

      {state.questions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Preguntas
          </Text>
          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
          {state.questions.map((question, index) => {
            const answered = state.answers[question.versionId];
            const submitting = submittingQuestionId === question.versionId;
            return (
              <View key={question.id} style={styles.questionCard}>
                <Text style={styles.questionNumber}>Pregunta {index + 1}</Text>
                <ContentBlockRenderer blocks={question.stemContent} />
                <View style={styles.options}>
                  {question.answerOptions.map((option, optionIndex) => {
                    const isSelected = answered?.answerOptionId === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Alternativa ${String.fromCharCode(65 + optionIndex)}`}
                        disabled={!!answered || submitting}
                        onPress={() => handleSelect(question, option.id)}
                        style={[
                          styles.option,
                          isSelected && answered?.isCorrect === true && styles.optionCorrect,
                          isSelected && answered?.isCorrect === false && styles.optionIncorrect,
                          isSelected && answered?.isCorrect === null && styles.optionPending,
                        ]}
                      >
                        <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}.</Text>
                        <ContentBlockRenderer blocks={[option.content]} />
                        {submitting ? <ActivityIndicator size="small" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
                {answered && answered.isCorrect === null ? (
                  <Text style={styles.pendingNote}>Guardada localmente -- pendiente de sincronizar.</Text>
                ) : null}
                {answered && answered.isCorrect !== null ? (
                  <View style={styles.feedback}>
                    <Text style={answered.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                      {answered.isCorrect ? 'Correcto' : 'Incorrecto'}
                    </Text>
                    <ContentBlockRenderer blocks={question.explanationContent} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <EmptyState message="Todavía no hay preguntas publicadas para esta unidad." />
      )}
    </ScrollView>
  );
}

function topicStatusLabel(status: TopicProgressStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Unidad completada';
    case 'IN_PROGRESS':
      return 'En progreso';
    default:
      return 'Sin comenzar';
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#eee' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#444' },
  section: { gap: 12 },
  resourceTitle: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  submitError: { color: '#c00', fontSize: 13 },
  questionCard: { padding: 16, borderRadius: 8, backgroundColor: '#f2f2f2', gap: 12 },
  questionNumber: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  options: { gap: 8 },
  option: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 6, backgroundColor: '#fff' },
  optionCorrect: { backgroundColor: '#dcf5df' },
  optionIncorrect: { backgroundColor: '#fbdada' },
  optionPending: { backgroundColor: '#f0e6c8' },
  optionLetter: { fontWeight: '700' },
  pendingNote: { fontSize: 12, color: '#8a6d00', fontStyle: 'italic' },
  feedback: { gap: 8, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
  feedbackCorrect: { color: '#1a7a2e', fontWeight: '700' },
  feedbackIncorrect: { color: '#a11', fontWeight: '700' },
});
