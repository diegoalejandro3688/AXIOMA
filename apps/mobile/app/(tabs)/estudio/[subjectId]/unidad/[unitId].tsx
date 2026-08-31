import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';
import { listChildTopics } from '../../../../../lib/api/education';
import { getTopicsProgressBatch } from '../../../../../lib/api/progress';
import { resolveContinuationEntry } from '../../../../../lib/progress/resolve-continuation';
import { resourceFlowNav } from '../../../../../lib/study/study-navigation';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { EmptyState } from '../../../../../components/empty-state';
import { Text, Card, Chip, Icon } from '../../../../../components/ui';
import type { ChipVariant } from '../../../../../components/ui';
import { useThemedStyles, useTheme, radii, spacing } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../../lib/academic/subject-icon';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; resources: CurriculumTopicResponse[]; progressByTopic: Record<string, TopicProgressResponse> };

/**
 * STUDY CONTENT MOBILE REACHABILITY -- nivel de navegación que faltaba:
 * Unidad -> lista de Recursos. Los 98 Recursos canónicos viven como
 * `curriculum_topic` hijos de las 20 Unidades y son los únicos nodos que
 * llevan recurso publicado + 10 preguntas. Antes de esta pantalla, `unidades.tsx`
 * navegaba con el id de la UNIDAD directamente a `topic/[topicId]/recurso`,
 * dejando los 98 Recursos y sus 980 preguntas inalcanzables.
 *
 * Reutiliza EXACTAMENTE la arquitectura existente:
 *   - `listChildTopics(unitId)` (ya existía en `lib/api/education.ts`, sin
 *     consumidor hasta ahora) -> `GET /education/topics/:unitId/children`;
 *   - una sola solicitud `getTopicsProgressBatch()` para TODOS los recursos
 *     hijos (nunca un `GET /progress/topics/:id` por recurso -- mismo
 *     criterio N+1 de `unidades.tsx`/Inicio);
 *   - cada Recurso navega al flujo canónico `topic/[resourceTopicId]/recurso`
 *     -> `ejercicio`, con el id del RECURSO hijo (nunca el de la Unidad).
 */
export default function UnidadRecursosScreen() {
  const { subjectId, unitId, name, unitName } = useLocalSearchParams<{
    subjectId: string;
    unitId: string;
    name?: string;
    unitName?: string;
  }>();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Mismo tono de materia que STUDY-2/3 -- continuidad Estudio -> Materia ->
  // Unidades -> Recursos, nunca un color propio por recurso.
  const { tone } = subjectIcon(name ?? '');
  const accentColor = subjectToneColor(tokens, tone);
  const accentBackground = subjectToneBackground(tokens, tone);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const childrenResult = await listChildTopics(unitId);
    if (!childrenResult.ok) {
      setState({ status: 'error', message: childrenResult.message });
      return;
    }

    // Una sola solicitud batch para TODOS los recursos hijos -- nunca un
    // `GET /progress/topics/:id` por recurso (mismo fan-out N+1 ya corregido
    // en Inicio y en `unidades.tsx`). Un recurso ausente de la respuesta se
    // trata como sin progreso abajo (`progress?.status ?? 'NOT_STARTED'`).
    const progressResult = await getTopicsProgressBatch(childrenResult.data.map((topic) => topic.id));
    if (!progressResult.ok) {
      setState({ status: 'error', message: progressResult.message });
      return;
    }

    const progressByTopic: Record<string, TopicProgressResponse> = {};
    for (const progress of progressResult.data) {
      progressByTopic[progress.curriculumTopicId] = progress;
    }

    setState({ status: 'ready', resources: childrenResult.data, progressByTopic });
  }, [unitId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando recursos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.resources.length === 0) {
    return (
      <EmptyState
        message="Esta unidad todavía no tiene recursos disponibles."
        actionLabel="Volver a las unidades"
        onAction={() => router.back()}
      />
    );
  }

  function openResource(resource: CurriculumTopicResponse) {
    if (state.status !== 'ready') return;
    const progress = state.progressByTopic[resource.id];
    const entry = progress ? resolveContinuationEntry(progress) : 'resource';
    const { screen, params } = resourceFlowNav(subjectId, resource, entry, name, { id: unitId, name: unitName });
    if (screen === 'recurso') {
      router.push({ pathname: '/(tabs)/estudio/topic/[topicId]/recurso', params });
    } else {
      router.push({ pathname: '/(tabs)/estudio/topic/[topicId]/ejercicio', params });
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="heading2" accessibilityRole="header">
        {unitName || name || 'Unidad'}
      </Text>
      <Text variant="bodySmall" color="secondary">
        Elige un recurso para estudiar.
      </Text>
      <FlatList
        data={state.resources}
        keyExtractor={(resource) => resource.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const progress = state.status === 'ready' ? state.progressByTopic[item.id] : undefined;
          const status = progress?.status ?? 'NOT_STARTED';
          return (
            <Card
              variant="interactive"
              accessibilityLabel={`Abrir recurso ${item.name}, ${topicStatusLabel(status)}`}
              style={styles.resourceCard}
              onPress={() => openResource(item)}
            >
              <View style={[styles.indexTile, { backgroundColor: accentBackground }]}>
                <Text variant="label" style={{ color: accentColor }}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.resourceBody}>
                <Text variant="titleMedium">{item.name}</Text>
                <View style={styles.statusRow}>
                  <Chip label={topicStatusLabel(status)} variant={statusChipVariant(status)} />
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="muted" />
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
      return 'Completado';
    case 'IN_PROGRESS':
      return 'En progreso';
    default:
      return 'Sin comenzar';
  }
}

/** Mismo criterio de variante que `unidades.tsx` (`Chip` no tiene "info"). */
function statusChipVariant(status: TopicProgressResponse['status']): ChipVariant {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'accent';
  return 'neutral';
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    list: { gap: spacing.space2 },
    resourceCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      borderRadius: radii.medium,
    },
    indexTile: {
      width: 44,
      height: 44,
      borderRadius: radii.medium,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    resourceBody: { flex: 1, gap: 2 },
    statusRow: { flexDirection: 'row' as const, marginTop: 2 },
  };
}
