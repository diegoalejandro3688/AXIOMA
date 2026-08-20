import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LearningResourceResponse } from '@axioma/contracts';
import { getPublishedResource, listPublishedQuestions } from '../../../../../lib/api/education';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { EmptyState } from '../../../../../components/empty-state';
import { ContentBlockRenderer } from '../../../../../components/content-block-renderer';
import { IconButton } from '../../../../../components/ui';
import { useThemedStyles, spacing, radii } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; resource: LearningResourceResponse; totalSteps: number };

/**
 * Recurso -- primer paso del recorrido de una unidad (ver ADR-0014: sin
 * checkpoint de "recurso visto", esta pantalla se alcanza únicamente cuando
 * la unidad no tiene respuestas registradas). La barra segmentada se deriva
 * del número real de pasos (1 recurso + preguntas publicadas), nunca de un
 * valor fijo.
 */
export default function RecursoScreen() {
  const { topicId, subjectId, name } = useLocalSearchParams<{ topicId: string; subjectId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
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
        setState({ status: 'empty' });
        return;
      }
      setState({ status: 'error', message: resourceResult.message });
      return;
    }

    setState({ status: 'ready', resource: resourceResult.data, totalSteps: 1 + questionsResult.data.length });
  }, [topicId]);

  useEffect(() => {
    load();
  }, [load]);

  function goToExercise() {
    router.push({ pathname: '/(tabs)/estudio/topic/[topicId]/ejercicio', params: { topicId, subjectId, name: name ?? '' } });
  }

  function backToUnidades() {
    router.push({ pathname: '/(tabs)/estudio/[subjectId]/unidades', params: { subjectId, name: name ?? '' } });
  }

  if (state.status === 'loading') return <LoadingState message="Cargando recurso…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.status === 'empty') {
    return (
      <EmptyState
        message="Este recurso todavía no tiene contenido disponible."
        actionLabel="Volver a la unidad"
        onAction={backToUnidades}
      />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <IconButton name="close" accessibilityLabel="Cerrar recurso" onPress={backToUnidades} color="secondary" />
        <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityLabel={`Paso 1 de ${state.totalSteps}`}>
          {Array.from({ length: state.totalSteps }).map((_, index) => (
            <View key={index} style={[styles.progressSegment, index === 0 ? styles.progressSegmentDone : styles.progressSegmentPending]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.resourceTitle} accessibilityRole="header">
          {state.resource.title}
        </Text>
        <ContentBlockRenderer blocks={state.resource.contentBlocks} />
      </ScrollView>

      <Pressable accessibilityRole="button" style={styles.continueButton} onPress={goToExercise}>
        <Text style={styles.continueButtonText}>Continuar a las preguntas</Text>
      </Pressable>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default, paddingHorizontal: 18 },
    header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space2, marginBottom: spacing.space5 },
    progressTrack: { flex: 1, flexDirection: 'row' as const, gap: spacing.space1 },
    progressSegment: { flex: 1, height: 6, borderRadius: radii.small },
    progressSegmentDone: { backgroundColor: t.color.accent.default },
    progressSegmentPending: { backgroundColor: t.color.border.default },
    content: { gap: 12, paddingBottom: 12 },
    resourceTitle: { fontSize: 19, fontWeight: '700' as const, color: t.color.text.primary },
    continueButton: {
      backgroundColor: t.color.background.inverse,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center' as const,
      marginTop: 8,
    },
    continueButtonText: { color: t.color.text.onInverse, fontSize: 14, fontWeight: '500' as const },
  };
}
