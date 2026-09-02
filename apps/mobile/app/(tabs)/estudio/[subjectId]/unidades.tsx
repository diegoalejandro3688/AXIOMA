import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isFreeUnitPosition, type CurriculumTopicResponse, type TopicProgressResponse, type TopicProgressStatus } from '@axioma/contracts';
import { listRootTopics, listChildTopics } from '../../../../lib/api/education';
import { getTopicsProgressBatch } from '../../../../lib/api/progress';
import { aggregateUnitProgressStatus } from '../../../../lib/study/aggregate-unit-progress';
import { unitResourceListParams } from '../../../../lib/study/study-navigation';
import { useEntitlement } from '../../../../lib/entitlement/entitlement-provider';
import { usePaywall } from '../../../../lib/entitlement/paywall-context';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { EntitlementUnavailable } from '../../../../components/premium/entitlement-unavailable';
import { PremiumBadge } from '../../../../components/premium/premium-badge';
import { Text, Card, Chip, Icon } from '../../../../components/ui';
import { useThemedStyles, useTheme, radii, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import type { ChipVariant } from '../../../../components/ui';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../lib/academic/subject-icon';
import { UnitMotif, resolveUnitMotif } from '../../../../lib/academic/unit-motif';

type LoadedTier = 'FREE' | 'PREMIUM';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tier: LoadedTier; topics: CurriculumTopicResponse[]; statusByUnit: Record<string, TopicProgressStatus> };

/**
 * Lista de unidades canónicas de una materia, con progreso real (PROGRESS,
 * ADR-0014). Ver ADR-0015 (theming).
 *
 * PREMIUM V1 -- Capa 2 (C2.2):
 *   - la pantalla ESPERA localmente a que el entitlement esté resuelto antes
 *     de pedir contenido académico (`entitlement.state.status`);
 *   - `error` inicial de entitlement -> `<EntitlementUnavailable>` (reintento
 *     técnico state-driven: `refresh()`, NUNCA `load()` directo), sin locks;
 *   - la carga responde a `subjectId + tier CONFIRMADO`, no solo a
 *     `status:'ready'` -- `FREE <-> PREMIUM` recarga; una request obsoleta de
 *     otra materia/tier nunca pisa el estado actual (`loadGenRef`);
 *   - FREE: pide `listChildTopics` SOLO de los índices `isFreeUnitPosition`;
 *     las unidades >= 2 se construyen SOLO desde el root (cero request de
 *     children) y se pintan con `<PremiumBadge>`; tap -> paywall `unit`;
 *   - PREMIUM: pide children de todas; todas las cards normales;
 *   - U1/U2 quedan EXACTAMENTE igual que antes.
 */
export default function UnidadesScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const entitlement = useEntitlement();
  const { open } = usePaywall();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Tier CONFIRMADO por el backend, o `null` si aún no. `load()` depende de él.
  const confirmedTier: LoadedTier | null =
    entitlement.state.status === 'ready' ? entitlement.state.tier : null;

  const { tone } = subjectIcon(name ?? '');
  const motifColor = subjectToneColor(tokens, tone);
  const motifBackground = subjectToneBackground(tokens, tone);

  /** Se incrementa en cada `load()`; una respuesta cuya generación cambió (otra materia/tier) se descarta. */
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    if (confirmedTier === null) return; // aún esperando el entitlement
    const gen = ++loadGenRef.current;
    const tier = confirmedTier;
    setState({ status: 'loading' });

    const topicsResult = await listRootTopics(subjectId);
    if (gen !== loadGenRef.current) return;
    if (!topicsResult.ok) {
      setState({ status: 'error', message: topicsResult.message });
      return;
    }

    // FREE: solo las unidades en posición Free; PREMIUM: todas.
    // NUNCA se piden los children de U3+ para FREE.
    const unitsToFetch = topicsResult.data
      .map((unit, index) => ({ unit, index }))
      .filter(({ index }) => tier === 'PREMIUM' || isFreeUnitPosition(index));

    const childrenLists = await Promise.all(unitsToFetch.map(({ unit }) => listChildTopics(unit.id)));
    if (gen !== loadGenRef.current) return;
    const firstChildrenError = childrenLists.find((result) => !result.ok);
    if (firstChildrenError && !firstChildrenError.ok) {
      setState({ status: 'error', message: firstChildrenError.message });
      return;
    }

    const childIdsByUnit = unitsToFetch.map(({ unit }, i) => ({
      unitId: unit.id,
      childIds: (childrenLists[i].ok ? childrenLists[i].data : []).map((child) => child.id),
    }));

    // UNA sola solicitud batch para los recursos hijos de las unidades
    // consultadas -- nunca un `GET /progress/topics/:id` por recurso. Un
    // recurso ausente del batch se trata como `NOT_STARTED`.
    const allChildIds = childIdsByUnit.flatMap((entry) => entry.childIds);
    const statusByChild = new Map<string, TopicProgressStatus>();
    if (allChildIds.length > 0) {
      const progressResult = await getTopicsProgressBatch(allChildIds);
      if (gen !== loadGenRef.current) return;
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
      statusByUnit[unitId] = aggregateUnitProgressStatus(childIds.map((id) => statusByChild.get(id) ?? 'NOT_STARTED'));
    }

    setState({ status: 'ready', tier, topics: topicsResult.data, statusByUnit });
  }, [subjectId, confirmedTier]);

  // Se re-dispara cuando cambia `subjectId` o el tier confirmado
  // (`FREE <-> PREMIUM`, o `error -> ready` tras un `refresh()` exitoso).
  useEffect(() => {
    load();
  }, [load]);

  if (entitlement.state.status === 'loading') return <LoadingState message="Cargando unidades…" />;
  if (entitlement.state.status === 'error') return <EntitlementUnavailable onRetry={() => void entitlement.refresh()} />;

  // Mientras el estado cargado no corresponda al tier confirmado ACTUAL,
  // mostrar carga -> `PREMIUM -> FREE` bloquea de inmediato (las cards
  // Premium desaparecen) y `FREE -> PREMIUM` desbloquea, sin flash del
  // estado viejo.
  const stateMatchesTier = state.status === 'ready' && state.tier === confirmedTier;
  if (state.status === 'loading' || (state.status === 'ready' && !stateMatchesTier)) {
    return <LoadingState message="Cargando unidades…" />;
  }
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.topics.length === 0) return <EmptyState message="Todavía no hay unidades disponibles para esta materia." />;

  const readyState = state;

  function openUnit(unit: CurriculumTopicResponse) {
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
        data={readyState.topics}
        keyExtractor={(topic) => topic.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const free = isFreeUnitPosition(index);
          const locked = readyState.tier === 'FREE' && !free;
          const status = readyState.statusByUnit[item.id] ?? 'NOT_STARTED';
          const motif = resolveUnitMotif(item.code);
          // Atenuación SOLO del tile/motivo decorativo y de la numeración --
          // el título va a contraste pleno. Sin opacity de card, sin blur.
          // Tono ambar de Premium (`state.warning`), coherente con el badge;
          // calibración light/dark -> QA Samsung.
          const tileBackground = locked ? tokens.color.state.warning.background : motifBackground;
          const motifTint = locked ? tokens.color.state.warning.text : motifColor;
          return (
            <Card
              variant="interactive"
              accessibilityLabel={
                locked
                  ? `Unidad ${item.name}, contenido Premium`
                  : `Abrir unidad ${item.name}, ${topicStatusLabel(status)}`
              }
              style={styles.topicCard}
              onPress={locked ? () => open('unit') : () => openUnit(item)}
            >
              <View style={[styles.motifTile, { backgroundColor: tileBackground }]}>
                <UnitMotif motif={motif} color={motifTint} size={26} />
              </View>
              <View style={styles.topicBody}>
                <Text variant="label" style={{ color: motifTint }}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <Text variant="titleMedium">{item.name}</Text>
                <View style={styles.statusRow}>
                  {locked ? (
                    <PremiumBadge />
                  ) : (
                    <Chip label={topicStatusLabel(status)} variant={statusChipVariant(status)} />
                  )}
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
    list: { gap: spacing.space2 },
    topicCard: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
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
