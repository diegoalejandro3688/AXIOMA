import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';
import { listRootTopics } from '../../../../lib/api/education';
import { getTopicProgress } from '../../../../lib/api/progress';
import { resolveContinuationEntry } from '../../../../lib/progress/resolve-continuation';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { useThemedStyles } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; topics: CurriculumTopicResponse[]; progressByTopic: Record<string, TopicProgressResponse> };

/** Lista de unidades de una materia, con progreso real (PROGRESS, ADR-0014). Ver ADR-0015 (theming). */
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

    const progressResults = await Promise.all(topicsResult.data.map((topic) => getTopicProgress(topic.id)));
    const failed = progressResults.find((result) => !result.ok);
    if (failed && !failed.ok) {
      setState({ status: 'error', message: failed.message });
      return;
    }

    const progressByTopic: Record<string, TopicProgressResponse> = {};
    progressResults.forEach((result, index) => {
      if (result.ok) progressByTopic[topicsResult.data[index].id] = result.data;
    });

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
      <Text style={styles.title} accessibilityRole="header">
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir unidad ${item.name}, ${topicStatusLabel(status)}`}
              style={styles.topicCard}
              onPress={() => openTopic(item)}
            >
              <Text style={styles.topicName}>{item.name}</Text>
              <View style={[styles.statusBadge, statusBadgeStyle(status, styles)]}>
                <Text style={[styles.statusText, statusTextStyle(status, styles)]}>{topicStatusLabel(status)}</Text>
              </View>
            </Pressable>
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

function statusBadgeStyle(status: TopicProgressResponse['status'], styles: ReturnType<typeof createStyles>) {
  if (status === 'COMPLETED') return styles.statusBadgeSuccess;
  if (status === 'IN_PROGRESS') return styles.statusBadgeInfo;
  return styles.statusBadgeNeutral;
}

function statusTextStyle(status: TopicProgressResponse['status'], styles: ReturnType<typeof createStyles>) {
  if (status === 'COMPLETED') return styles.statusTextSuccess;
  if (status === 'IN_PROGRESS') return styles.statusTextInfo;
  return styles.statusTextNeutral;
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    title: { fontSize: 20, fontWeight: '700' as const, color: t.color.text.primary },
    list: { gap: 10 },
    topicCard: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    topicName: { fontSize: 14, fontWeight: '500' as const, color: t.color.text.primary },
    statusBadge: { alignSelf: 'flex-start' as const, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1 },
    statusBadgeSuccess: { backgroundColor: t.color.state.success.background, borderColor: t.color.state.success.border },
    statusBadgeInfo: { backgroundColor: t.color.state.info.background, borderColor: t.color.state.info.border },
    statusBadgeNeutral: { backgroundColor: t.color.action.disabledBackground, borderColor: t.color.action.disabledBorder },
    statusText: { fontSize: 11, fontWeight: '500' as const },
    statusTextSuccess: { color: t.color.state.success.text },
    statusTextInfo: { color: t.color.state.info.text },
    statusTextNeutral: { color: t.color.action.disabledText },
  };
}
