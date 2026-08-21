import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';
import { listRootTopics } from '../../../../lib/api/education';
import { getTopicsProgressBatch } from '../../../../lib/api/progress';
import { resolveContinuationEntry } from '../../../../lib/progress/resolve-continuation';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { Text, Card, Chip } from '../../../../components/ui';
import { useThemedStyles, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import type { ChipVariant } from '../../../../components/ui';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; topics: CurriculumTopicResponse[]; progressByTopic: Record<string, TopicProgressResponse> };

/**
 * Lista de unidades de una materia, con progreso real (PROGRESS, ADR-0014).
 * Ver ADR-0015 (theming). UI-4: rediseño puramente visual -- preserva
 * exactamente `getTopicsProgressBatch()` (Progress Batch Fix, una sola
 * solicitud batch para todos los temas raíz, NUNCA revertir al patrón
 * N+1 `getTopicProgress` por tema) y el criterio de tema ausente del
 * batch -> `NOT_STARTED` (`progress?.status ?? 'NOT_STARTED'` implícito
 * en `topicStatusLabel`).
 */
export default function UnidadesScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const topicsResult = await listRootTopics(subjectId);
    if (!topicsResult.ok) {
      setState({ status: 'error', message: topicsResult.message });
      return;
    }

    // Una sola solicitud batch para TODOS los temas raíz -- antes era un
    // `GET /progress/topics/:id` POR TEMA (mismo fan-out N+1 corregido en
    // Inicio, reproducible aquí con los mismos datos reales). Un tema
    // ausente en la respuesta batch (ej. borrado entre `listRootTopics` y
    // esta llamada) se trata como sin progreso -- mismo criterio que ya usa
    // el render de abajo (`progress?.status ?? 'NOT_STARTED'`), nunca hace
    // fallar toda la pantalla por un solo tema.
    const progressResult = await getTopicsProgressBatch(topicsResult.data.map((topic) => topic.id));
    if (!progressResult.ok) {
      setState({ status: 'error', message: progressResult.message });
      return;
    }

    const progressByTopic: Record<string, TopicProgressResponse> = {};
    for (const progress of progressResult.data) {
      progressByTopic[progress.curriculumTopicId] = progress;
    }

    setState({ status: 'ready', topics: topicsResult.data, progressByTopic });
  }, [subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando unidades…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.topics.length === 0) return <EmptyState message="Todavía no hay unidades disponibles para esta materia." />;

  function openTopic(topic: CurriculumTopicResponse) {
    if (state.status !== 'ready') return;
    const progress = state.progressByTopic[topic.id];
    const entry = progress ? resolveContinuationEntry(progress) : 'resource';
    const screen = entry === 'resource' ? 'recurso' : 'ejercicio';
    router.push({
      pathname: `/(tabs)/estudio/topic/[topicId]/${screen}`,
      params: { topicId: topic.id, subjectId, name: name ?? '' },
    });
  }

  return (
    <View style={styles.container}>
      <Text variant="heading2" accessibilityRole="header">
        {name ?? 'Unidades'}
      </Text>
      <FlatList
        data={state.topics}
        keyExtractor={(topic) => topic.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const progress = state.status === 'ready' ? state.progressByTopic[item.id] : undefined;
          const status = progress?.status ?? 'NOT_STARTED';
          return (
            <Card
              variant="interactive"
              accessibilityLabel={`Abrir unidad ${item.name}, ${topicStatusLabel(status)}`}
              style={styles.topicCard}
              onPress={() => openTopic(item)}
            >
              <Text variant="titleMedium">{item.name}</Text>
              <Chip label={topicStatusLabel(status)} variant={statusChipVariant(status)} />
            </Card>
          );
        }}
      />
    </View>
  );
}

function topicStatusLabel(status: TopicProgressResponse['status']): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completada';
    case 'IN_PROGRESS':
      return 'En progreso';
    default:
      return 'Sin comenzar';
  }
}

/**
 * `Chip` (UI-1) no tiene una variante "info" -- el original usaba
 * `state.info` (azul) para IN_PROGRESS. Se usa `accent` (también azul) como
 * la variante existente más cercana; documentado como desviación menor,
 * mismo criterio que otras primitivas sin variante exacta en fases previas.
 */
function statusChipVariant(status: TopicProgressResponse['status']): ChipVariant {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'accent';
  return 'neutral';
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    list: { gap: spacing.space2 },
    topicCard: { gap: spacing.space2, alignItems: 'flex-start' as const },
  };
}
