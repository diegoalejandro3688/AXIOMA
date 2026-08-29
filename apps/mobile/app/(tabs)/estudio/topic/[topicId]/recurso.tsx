import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LearningResourceResponse, ResourceContentBlockResponse } from '@axioma/contracts';
import { getPublishedResource, listPublishedQuestions } from '../../../../../lib/api/education';
import { LoadingState } from '../../../../../components/loading-state';
import { ErrorState } from '../../../../../components/error-state';
import { EmptyState } from '../../../../../components/empty-state';
import { ContentBlockRenderer } from '../../../../../components/content-block-renderer';
import { IconButton, Text, Icon } from '../../../../../components/ui';
import { useThemedStyles, useTheme, spacing, radii } from '../../../../../theme';
import type { ThemeTokens } from '../../../../../theme';
import { subjectIcon, subjectToneColor } from '../../../../../lib/academic/subject-icon';

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
 *
 * STUDY-4 -- rediseño puramente visual/presentacional, genérico para
 * cualquier `resource`/materia (no exclusivo de "Porcentajes y
 * proporcionalidad"): eyebrow derivado de datos reales ya disponibles
 * (`name` + `resource.resourceKey`), deduplicación del título por
 * ESTRUCTURA (heading redundante con el título ya mostrado, nunca por
 * coincidencia de este texto en particular), y superficie destacada para
 * bloques `formula` vía `ContentBlockRenderer({ highlightFormulas: true })`.
 * Cero contenido académico nuevo -- ver auditoría STUDY-4.
 */
export default function RecursoScreen() {
  const { topicId, subjectId, name } = useLocalSearchParams<{ topicId: string; subjectId: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Mismo tono de materia que STUDY-2/2A/STUDY-3 (`subjectIcon(name).tone`)
  // -- continuidad visual, sin token/color nuevo.
  const { tone } = subjectIcon(name ?? '');
  const accentColor = subjectToneColor(tokens, tone);

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

  const eyebrow = resourceEyebrow(name, state.resource.resourceKey);
  const blocks = withoutRedundantTitleHeading(state.resource.contentBlocks, state.resource.title);

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
        {eyebrow ? (
          <Text variant="label" style={[styles.eyebrow, { color: accentColor }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="heading1" accessibilityRole="header">
          {state.resource.title}
        </Text>
        <View style={[styles.titleAccent, { backgroundColor: accentColor }]} />
        <ContentBlockRenderer blocks={blocks} highlightFormulas />
      </ScrollView>

      <Pressable accessibilityRole="button" style={styles.continueButton} onPress={goToExercise}>
        <Text variant="titleMedium" weight="semibold" style={styles.continueButtonText}>
          Continuar a las preguntas
        </Text>
        <Icon name="chevron-right" size={18} color="onInverse" />
      </Pressable>
    </View>
  );
}

/**
 * STUDY-4 -- eyebrow "MATEMÁTICA · M1" (decisión de Product Owner
 * aprobada). `name` es la materia real ya recibida por navegación; el
 * segmento se toma literal del primer bloque de `resourceKey` (identificador
 * curricular real ya presente en el `resource` fetcheado en esta misma
 * pantalla -- CERO fetch nuevo, CERO acoplamiento a `unidades.tsx`). No se
 * interpreta ni se etiqueta como "Módulo": se muestra tal cual viene.
 */
function resourceEyebrow(name: string | undefined, resourceKey: string): string | null {
  const segment = resourceKey.split('.')[0];
  const label = name?.toUpperCase();
  if (!label && !segment) return null;
  // M1/M2 SUBJECT TAXONOMY ALIGNMENT -- la materia ahora es "Matemática M1" /
  // "Matemática M2": ya incluye el segmento curricular, no se repite
  // ("MATEMÁTICA M1 · M1" -> "MATEMÁTICA M1").
  if (label && segment && label.endsWith(` ${segment.toUpperCase()}`)) return label;
  return [label, segment].filter(Boolean).join(' · ');
}

/**
 * STUDY-4 -- corrige la duplicación título/heading de forma GENÉRICA y
 * estructural: cualquier bloque `heading` cuyo texto coincida exactamente
 * con `resource.title` ya renderizado arriba se omite (aplica a cualquier
 * resource, no a "Porcentajes y proporcionalidad" en particular). Un
 * `heading` con texto DISTINTO del título -- ej. un subtítulo real futuro --
 * nunca se toca.
 */
function withoutRedundantTitleHeading(
  blocks: ResourceContentBlockResponse[],
  title: string,
): ResourceContentBlockResponse[] {
  return blocks.filter((block) => !(block.type === 'heading' && block.text === title));
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
    // STUDY-4 -- eyebrow académico discreto, mismo patrón `label` + tono de
    // materia que STUDY-2/3.
    eyebrow: { textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 },
    // Acento/separador editorial bajo el título -- puramente decorativo,
    // color de materia, sin token nuevo.
    titleAccent: { width: 36, height: 3, borderRadius: radii.small, marginTop: 4, marginBottom: 4 },
    continueButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.space2,
      backgroundColor: t.color.background.inverse,
      borderRadius: radii.medium,
      paddingVertical: 14,
      marginTop: 8,
    },
    continueButtonText: { color: t.color.text.onInverse },
  };
}
