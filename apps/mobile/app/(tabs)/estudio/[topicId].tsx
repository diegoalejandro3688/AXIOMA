import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { LearningResourceResponse, QuestionResponse } from '@axioma/contracts';
import { getPublishedResource, listPublishedQuestions } from '../../../lib/api/education';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { ContentBlockRenderer } from '../../../components/content-block-renderer';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; resource: LearningResourceResponse | null; questions: QuestionResponse[] };

/**
 * Detalle de unidad -- recurso publicado + preguntas publicadas, ambos de
 * SOLO LECTURA (ver ADR-0013: responder preguntas y recibir retroalimentación
 * evaluada es Bloque III/IV -- `isCorrect` nunca llega aquí, ADR-0012).
 */
export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const [resourceResult, questionsResult] = await Promise.all([
      getPublishedResource(topicId),
      listPublishedQuestions(topicId),
    ]);

    if (!questionsResult.ok) {
      setState({ status: 'error', message: questionsResult.message });
      return;
    }

    if (!resourceResult.ok) {
      if (resourceResult.kind === 'http' && resourceResult.status === 404) {
        setState({ status: 'ready', resource: null, questions: questionsResult.data });
        return;
      }
      setState({ status: 'error', message: resourceResult.message });
      return;
    }

    setState({ status: 'ready', resource: resourceResult.data, questions: questionsResult.data });
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando unidad…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
          {state.questions.map((question, index) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionNumber}>Pregunta {index + 1}</Text>
              <ContentBlockRenderer blocks={question.stemContent} />
              <View style={styles.options}>
                {question.answerOptions.map((option, optionIndex) => (
                  <View key={option.id} style={styles.option}>
                    <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}.</Text>
                    <ContentBlockRenderer blocks={[option.content]} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState message="Todavía no hay preguntas publicadas para esta unidad." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  resourceTitle: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  questionCard: { padding: 16, borderRadius: 8, backgroundColor: '#f2f2f2', gap: 12 },
  questionNumber: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  options: { gap: 8 },
  option: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  optionLetter: { fontWeight: '700' },
});
