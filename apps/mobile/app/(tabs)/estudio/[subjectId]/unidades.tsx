import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CurriculumTopicResponse, TopicProgressResponse, TopicProgressStatus } from '@axioma/contracts';
import { listRootTopics, listChildTopics } from '../../../../lib/api/education';
import { getTopicsProgressBatch } from '../../../../lib/api/progress';
import { aggregateUnitProgressStatus } from '../../../../lib/study/aggregate-unit-progress';
import { unitResourceListParams } from '../../../../lib/study/study-navigation';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { Text, Card, Chip, Icon } from '../../../../components/ui';
import { useThemedStyles, useTheme, radii, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import type { ChipVariant } from '../../../../components/ui';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../lib/academic/subject-icon';
import { UnitMotif, resolveUnitMotif } from '../../../../lib/academic/unit-motif';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; topics: CurriculumTopicResponse[]; statusByUnit: Record<string, TopicProgressStatus> };

/**
 * Lista de unidades canónicas de una materia, con progreso real (PROGRESS,
 * ADR-0014). Ver ADR-0015 (theming).
 *
 * STUDY CONTENT MOBILE REACHABILITY:
 *   - la Unidad ahora abre la lista de sus Recursos hijos
 *     (`estudio/[subjectId]/unidad/[unitId]`), no navega directo a
 *     `topic/[topicId]/recurso` con el id de la Unidad;
 *   - el progreso de la Unidad se AGREGA del progreso de sus Recursos hijos
 *     (`aggregateUnitProgressStatus`) -- el id de la Unidad raíz no tiene
 *     progreso propio en el catálogo canónico;
 *   - se conserva `getTopicsProgressBatch()` (UNA solicitud batch para todos
 *     los recursos hijos de todas las unidades visibles, NUNCA el patrón N+1
 *     `getTopicProgress` por recurso) y el criterio "id ausente del batch ->
 *     `NOT_STARTED`".
 */
export default function UnidadesScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Mismo tono de la materia que STUDY-2 (`subjectIcon(name).tone`) --
  // continuidad Estudio -> Materia -> Unidades, nunca un color propio por
  // unidad. Sin tokens/lógica nuevos: reutiliza exactamente los helpers de
  // `lib/academic/subject-icon.ts` ya consolidados en STUDY-2A.
  const { tone } = subjectIcon(name ?? '');
  const motifColor = subjectToneColor(tokens, tone);
  const motifBackground = subjectToneBackground(tokens, tone);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const topicsResult = await listRootTopics(subjectId);
    if (!topicsResult.ok) {
      setState({ status: 'error', message: topicsResult.message });
      return;
    }

    // STUDY CONTENT MOBILE REACHABILITY -- el progreso de una Unidad se
    // DERIVA de sus Recursos hijos (los nodos que PROGRESS realmente
    // registra). Preguntar el progreso del id de la Unidad raíz devolvía
    // siempre `NOT_STARTED`. `listChildTopics` por unidad -> 3-4 llamadas
    // (M1/M2: 4, Lenguaje/Ciencias/Historia: 3), aceptable para V1 (no hay
    // endpoint batch de hijos y crear uno para 3-4 llamadas no se justifica).
    const childrenLists = await Promise.all(topicsResult.data.map((unit) => listChildTopics(unit.id)));
    const firstChildrenError = childrenLists.find((result) => !result.ok);
    if (firstChildrenError && !firstChildrenError.ok) {
      setState({ status: 'error', message: firstChildrenError.message });
      return;
    }
    const childIdsByUnit = topicsResult.data.map((unit, index) => ({
      unitId: unit.id,
      childIds: (childrenLists[index].ok ? childrenLists[index].data : []).map((child) => child.id),
    }));

    // UNA sola solicitud batch para TODOS los recursos hijos de TODAS las
    // unidades visibles -- nunca un `GET /progress/topics/:id` por recurso
    // (mismo fan-out N+1 corregido en Inicio). Un recurso ausente de la
    // respuesta batch se trata como `NOT_STARTED` (`progressByChild.get(id)
    // ?? 'NOT_STARTED'`), nunca hace fallar la pantalla.
    const allChildIds = childIdsByUnit.flatMap((entry) => entry.childIds);
    const statusByChild = new Map<string, TopicProgressStatus>();
    if (allChildIds.length > 0) {
      const progressResult = await getTopicsProgressBatch(allChildIds);
      if (!progressResult.ok) {
        setState({ status: 'error', message: progressResult.message });
        return;
      }
      for (const progress of progressResult.data) {
        statusByChild.set(progress.curriculumTopicId, progress.status);
      }
    }

    const statusByUnit: Record<string, TopicProgressStatus> = {};
    for (const { unitId, childIds } of childIdsByUnit) {
      statusByUnit[unitId] = aggregateUnitProgressStatus(
        childIds.map((id) => statusByChild.get(id) ?? 'NOT_STARTED'),
      );
    }

    setState({ status: 'ready', topics: topicsResult.data, statusByUnit });
  }, [subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando unidades…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.topics.length === 0) return <EmptyState message="Todavía no hay unidades disponibles para esta materia." />;

  function openUnit(unit: CurriculumTopicResponse) {
    // STUDY CONTENT MOBILE REACHABILITY -- la Unidad abre la lista de sus
    // Recursos hijos; la decisión recurso/ejercicio se toma allí, POR
    // recurso (nunca se pasa el id de la Unidad a `topic/[topicId]/*`).
    router.push({
      pathname: '/(tabs)/estudio/[subjectId]/unidad/[unitId]',
      params: unitResourceListParams(subjectId, unit, name),
    });
  }

  return (
    <View style={styles.container}>
      <Text variant="heading2" accessibilityRole="header">
        {name ?? 'Unidades'}
      </Text>
      <Text variant="bodySmall" color="secondary">
        Elige una unidad para comenzar a estudiar.
      </Text>
      {/* UI-POLISH-1D -- escape hatch discreto hacia la lista de materias:
          `router.dismissTo` (POP_TO) resuelve tanto la entrada normal desde
          Estudio (hace pop de las pantallas intermedias hasta `estudio/index`
          si ya existe en el stack) como la entrada directa desde el CTA de
          Inicio (`estudio/index` no existe en el stack -> reemplaza la
          pantalla actual por esa ruta), sin flags de origen ni lógica propia. */}
      <Pressable
        onPress={() => router.dismissTo('/(tabs)/estudio')}
        accessibilityRole="button"
        accessibilityLabel="Volver a Estudio"
        hitSlop={8}
        style={styles.backLink}
      >
        <Text variant="bodySmall" style={{ color: tokens.color.accent.strong }}>
          Volver a Estudio
        </Text>
      </Pressable>
      <FlatList
        data={state.topics}
        keyExtractor={(topic) => topic.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const status = state.status === 'ready' ? state.statusByUnit[item.id] ?? 'NOT_STARTED' : 'NOT_STARTED';
          const motif = resolveUnitMotif(item.code);
          return (
            <Card
              variant="interactive"
              accessibilityLabel={`Abrir unidad ${item.name}, ${topicStatusLabel(status)}`}
              style={styles.topicCard}
              onPress={() => openUnit(item)}
            >
              <View style={[styles.motifTile, { backgroundColor: motifBackground }]}>
                <UnitMotif motif={motif} color={motifColor} size={26} />
              </View>
              <View style={styles.topicBody}>
                {/* STUDY CONTENT MOBILE REACHABILITY -- número por POSICIÓN en
                    la lista ya filtrada/ordenada (`index + 1`), no `item.order`
                    crudo: así M2 se muestra como 01-04 aunque su `order`
                    canónico interno sea 5-8. Presentación pura. */}
                <Text variant="label" style={{ color: motifColor }}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
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
    backLink: { alignSelf: 'flex-start' as const, paddingVertical: spacing.space1 },
    // STUDY-3 -- `space2` entre cards (mismo criterio de densidad "editorial"
    // que STUDY-1C), cada unidad conserva su propia `Card` independiente
    // (decisión de producto: unidades son entidades dinámicas, no
    // modalidades fijas como STUDY-2).
    list: { gap: spacing.space2 },
    topicCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      // `radii.medium` -- mismo radio "menos burbuja" que STUDY-1C/STUDY-2,
      // en vez del `radii.large` que trae `variant="interactive"` por defecto.
      borderRadius: radii.medium,
    },
    motifTile: {
      width: 44,
      height: 44,
      borderRadius: radii.medium,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    topicBody: { flex: 1, gap: 2 },
    statusRow: { flexDirection: 'row' as const, marginTop: 2 },
  };
}
