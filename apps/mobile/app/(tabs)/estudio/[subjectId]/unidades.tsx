import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';
import { listRootTopics } from '../../../../lib/api/education';
import { getTopicsProgressBatch } from '../../../../lib/api/progress';
import { resolveContinuationEntry } from '../../../../lib/progress/resolve-continuation';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { Text, Card, Chip, Icon } from '../../../../components/ui';
import { useThemedStyles, useTheme, radii, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import type { ChipVariant } from '../../../../components/ui';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../lib/academic/subject-icon';

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
        renderItem={({ item }) => {
          const progress = state.status === 'ready' ? state.progressByTopic[item.id] : undefined;
          const status = progress?.status ?? 'NOT_STARTED';
          const motif = resolveUnitMotif(item.code);
          return (
            <Card
              variant="interactive"
              accessibilityLabel={`Abrir unidad ${item.name}, ${topicStatusLabel(status)}`}
              style={styles.topicCard}
              onPress={() => openTopic(item)}
            >
              <View style={[styles.motifTile, { backgroundColor: motifBackground }]}>
                <UnitMotif motif={motif} color={motifColor} size={26} />
              </View>
              <View style={styles.topicBody}>
                <Text variant="label" style={{ color: motifColor }}>
                  {String(item.order).padStart(2, '0')}
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

/**
 * STUDY-3 -- selecciona un motivo académico abstracto a partir de
 * `topic.code` (identificador curricular estable, ej.
 * `M1.NUMEROS.PORCENTAJES`), NUNCA a partir de `topic.name` (texto visible,
 * frágil ante renombres editoriales). Busca un segmento reconocido del
 * código contra un catálogo pequeño de áreas curriculares conocidas; si
 * ninguno coincide (materia/unidad futura sin área mapeada todavía), cae en
 * un motivo genérico -- la pantalla nunca depende de que las 4 áreas de hoy
 * sigan siendo las únicas que existan. No introduce metadata nueva en
 * `CurriculumTopicResponse` ni conocimiento acoplado al contenido: es
 * puramente presentacional y degrada con seguridad.
 */
const CURRICULUM_AREA_MOTIF: Record<string, UnitMotifKey> = {
  NUMEROS: 'percentage',
  PORCENTAJES: 'percentage',
  ALGEBRA: 'algebra',
  FUNCIONES: 'algebra',
  GEOMETRIA: 'geometry',
  DATOS: 'data',
  ESTADISTICA: 'data',
  PROBABILIDAD: 'data',
};

function resolveUnitMotif(code: string): UnitMotifKey {
  const segments = code.toUpperCase().split(/[.\-_]/);
  for (const segment of segments) {
    const motif = CURRICULUM_AREA_MOTIF[segment];
    if (motif) return motif;
  }
  return 'generic';
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

type UnitMotifKey = 'percentage' | 'algebra' | 'geometry' | 'data' | 'generic';

/**
 * STUDY-3 -- motivo académico abstracto por unidad, mismo lenguaje que
 * `SubjectDecoration` (`estudio/index.tsx`, STUDY-1B/1C): trazo fino
 * (1.5-1.75px), sin relleno salvo acentos puntuales, color heredado por
 * prop (nunca hex propio). Vive local a esta pantalla -- sin consumidores
 * fuera de aquí, igual que su precedente.
 */
function UnitMotif({ motif, color, size = 24 }: { motif: UnitMotifKey; color: string; size?: number }) {
  switch (motif) {
    case 'percentage':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="7" cy="7" r="3" stroke={color} strokeWidth={1.75} />
          <Circle cx="17" cy="17" r="3" stroke={color} strokeWidth={1.75} />
          <Line x1="5" y1="19" x2="19" y2="5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
        </Svg>
      );
    case 'algebra':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="20" x2="3" y2="4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M4.5 16c2-6 4.5-10 7-10s2.5 8 4.5 8 2-3 4-3" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'geometry':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 4 20.5 19H3.5Z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
          <Circle cx="12" cy="4" r="1.3" fill={color} stroke="none" />
          <Circle cx="20.5" cy="19" r="1.3" fill={color} stroke="none" />
          <Circle cx="3.5" cy="19" r="1.3" fill={color} stroke="none" />
        </Svg>
      );
    case 'data':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="3" y1="20" x2="21" y2="20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          <Rect x="5" y="12" width="3" height="8" stroke={color} strokeWidth={1.5} />
          <Rect x="10.5" y="7" width="3" height="13" stroke={color} strokeWidth={1.5} />
          <Rect x="16" y="15" width="3" height="5" stroke={color} strokeWidth={1.5} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth={1.5} />
          <Line x1="8.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
  }
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
