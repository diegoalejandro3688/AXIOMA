import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SubjectResponse, CurriculumTopicResponse } from '@axioma/contracts';
import { listSubjects, listRootTopics } from '../../../lib/api/education';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; subject: SubjectResponse | null; topics: CurriculumTopicResponse[] };

/**
 * Estudio real -- ver ADR-0013 (reemplaza el placeholder de ADR-0009).
 * Selecciona la materia sembrada (M1 tiene una sola) y lista sus unidades.
 * Recorrido: materia -> unidad -> [topicId] (recurso + preguntas).
 */
export default function EstudioIndexScreen() {
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const subjectsResult = await listSubjects();
    if (!subjectsResult.ok) {
      setState({ status: 'error', message: subjectsResult.message });
      return;
    }
    const subject = subjectsResult.data[0] ?? null;
    if (!subject) {
      setState({ status: 'ready', subject: null, topics: [] });
      return;
    }
    const topicsResult = await listRootTopics(subject.id);
    if (!topicsResult.ok) {
      setState({ status: 'error', message: topicsResult.message });
      return;
    }
    setState({ status: 'ready', subject, topics: topicsResult.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando materias…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (!state.subject) return <EmptyState message="Todavía no hay materias disponibles." />;
  if (state.topics.length === 0) return <EmptyState message={`${state.subject.name} todavía no tiene unidades disponibles.`} />;

  return (
    <View style={styles.container}>
      <Text style={styles.subjectName} accessibilityRole="header">
        {state.subject.name}
      </Text>
      <FlatList
        data={state.topics}
        keyExtractor={(topic) => topic.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir unidad ${item.name}`}
            style={styles.topicCard}
            onPress={() => router.push({ pathname: '/(tabs)/estudio/[topicId]', params: { topicId: item.id } })}
          >
            <Text style={styles.topicName}>{item.name}</Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  subjectName: { fontSize: 22, fontWeight: '700' },
  list: { gap: 12 },
  topicCard: { padding: 16, borderRadius: 8, backgroundColor: '#f2f2f2' },
  topicName: { fontSize: 16, fontWeight: '600' },
});
