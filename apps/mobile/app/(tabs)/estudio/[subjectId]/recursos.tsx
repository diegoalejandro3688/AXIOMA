import { useCallback, useEffect, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';
import { resolveContinuationEntry } from '../../../../lib/progress/resolve-continuation';
import { resourceFlowNav } from '../../../../lib/study/study-navigation';
import {
  assembleResourceCatalog,
  resourceCountLabel,
  type ResourceCatalog,
} from '../../../../lib/study/resource-catalog';
import { useEntitlement } from '../../../../lib/entitlement/entitlement-provider';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { EntitlementUnavailable } from '../../../../components/premium/entitlement-unavailable';
import { PremiumLockedScreen } from '../../../../components/premium/premium-locked-screen';
import { Text, Card, Chip, Icon } from '../../../../components/ui';
import type { ChipVariant } from '../../../../components/ui';
import { useThemedStyles, useTheme, radii, spacing } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../lib/academic/subject-icon';
import { UnitMotif, resolveUnitMotif } from '../../../../lib/academic/unit-motif';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'premium' }
  | { status: 'ready'; catalog: ResourceCatalog };

/**
 * ESTUDIO R -- modo independiente "Recursos": biblioteca de TODOS los
 * Recursos de una materia, agrupados por Unidad. Hermano de `unidades.tsx`
 * (misma materia, otro modo). La carga (patrón `1 + N + 1`, sin N+1 de
 * progreso) vive en `lib/study/resource-catalog.ts` (`assembleResourceCatalog`).
 *
 * Reutiliza el lenguaje visual YA APROBADO:
 *   - `UnitMotif` A1 por `unit.code` canónico en el header de cada sección
 *     (mismo tratamiento discreto que el header del Incremento B);
 *   - la Resource card del Incremento B (`unidad/[unitId].tsx`) -- se COPIA
 *     aquí (row + helpers de estado) en vez de extraer un componente
 *     compartido: esa pantalla ya pasó QA físico y está CLOSED, y la
 *     duplicación es pequeña y acotada. Deuda registrada para después.
 *
 * Sin backend nuevo, sin contratos nuevos, sin iconos por recurso, sin
 * buscador/filtros/favoritos/porcentaje.
 */
export default function RecursosScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId: string; name?: string }>();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const entitlement = useEntitlement();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // PREMIUM V1 (C2.2) -- el modo independiente "Recursos" es Premium.
  //   loading           -> LoadingState local (espera al entitlement);
  //   error inicial      -> <EntitlementUnavailable> (reintento state-driven);
  //   FREE confirmado    -> <PremiumLockedScreen>, SIN ensamblar el catálogo;
  //   PREMIUM confirmado -> catálogo;
  //   backend PREMIUM_REQUIRED stale -> <PremiumLockedScreen>.
  const confirmedTier = entitlement.state.status === 'ready' ? entitlement.state.tier : null;

  // Mismo tono de materia que Unidades / lista por unidad -- continuidad
  // Estudio -> Materia -> Recursos, nunca un color propio por recurso.
  const { tone } = subjectIcon(name ?? '');
  const accentColor = subjectToneColor(tokens, tone);
  const accentBackground = subjectToneBackground(tokens, tone);

  const load = useCallback(async () => {
    if (confirmedTier === null) return; // aún esperando el entitlement
    if (confirmedTier === 'FREE') {
      setState({ status: 'premium' });
      return;
    }
    setState({ status: 'loading' });
    const result = await assembleResourceCatalog(subjectId);
    if (!result.ok) {
      if (result.premiumRequired) {
        setState({ status: 'premium' }); // entitlement stale / deep-link
        return;
      }
      setState({ status: 'error', message: result.message });
      return;
    }
    setState({ status: 'ready', catalog: result.catalog });
  }, [subjectId, confirmedTier]);

  // Se re-dispara con `subjectId` o con el tier confirmado (`FREE <-> PREMIUM`,
  // o `error -> ready` tras un `refresh()`).
  useEffect(() => {
    load();
  }, [load]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/(tabs)/estudio/[subjectId]', params: { subjectId, name: name ?? '' } });
  }

  if (entitlement.state.status === 'loading') return <LoadingState message="Cargando recursos…" />;
  if (entitlement.state.status === 'error') return <EntitlementUnavailable onRetry={() => void entitlement.refresh()} />;
  if (state.status === 'loading') return <LoadingState message="Cargando recursos…" />;
  if (state.status === 'premium') return <PremiumLockedScreen origin="resources" onBack={goBack} />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.catalog.sections.length === 0) {
    return <EmptyState message="Todavía no hay recursos disponibles para esta materia." />;
  }

  const { catalog } = state;

  function openResource(resource: CurriculumTopicResponse, unit: CurriculumTopicResponse) {
    const progress = catalog.progressByResource[resource.id];
    const entry = progress ? resolveContinuationEntry(progress) : 'resource';
    const { screen, params } = resourceFlowNav(subjectId, resource, entry, name, { id: unit.id, name: unit.name });
    if (screen === 'recurso') {
      router.push({ pathname: '/(tabs)/estudio/topic/[topicId]/recurso', params });
    } else {
      router.push({ pathname: '/(tabs)/estudio/topic/[topicId]/ejercicio', params });
    }
  }

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.listContent}
      sections={catalog.sections.map((section) => ({ ...section, data: section.resources }))}
      keyExtractor={(resource) => resource.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={styles.screenHeader}>
          <Text variant="heading2" accessibilityRole="header">
            {name ?? 'Recursos'}
          </Text>
          <Text variant="bodySmall" color="secondary">
            Explora todos los recursos de esta materia, unidad por unidad.
          </Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionMotifTile, { backgroundColor: accentBackground }]}>
            <UnitMotif motif={resolveUnitMotif(section.unit.code)} color={accentColor} size={22} />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text variant="titleMedium" accessibilityRole="header">
              {section.unit.name}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {resourceCountLabel(section.resources.length)}
            </Text>
          </View>
        </View>
      )}
      ItemSeparatorComponent={ResourceSeparator}
      renderItem={({ item, index, section }) => {
        const status = catalog.progressByResource[item.id]?.status ?? 'NOT_STARTED';
        return (
          <Card
            variant="interactive"
            accessibilityLabel={`Abrir recurso ${item.name}, ${topicStatusLabel(status)}`}
            style={styles.resourceCard}
            onPress={() => openResource(item, section.unit)}
          >
            <View style={[styles.indexTile, { backgroundColor: accentBackground }]}>
              {/* Numeración POR SECCIÓN -- `index` es el índice dentro de la
                  sección (SectionList), así cada unidad reinicia en 01. */}
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
  );
}

function ResourceSeparator() {
  return <View style={{ height: spacing.space2 }} />;
}

/** Copia local de `unidad/[unitId].tsx` (Incremento B, CLOSED) -- ver docstring. */
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

/** Copia local de `unidad/[unitId].tsx` -- `Chip` no tiene variante "info". */
function statusChipVariant(status: TopicProgressResponse['status']): ChipVariant {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'accent';
  return 'neutral';
}

function createStyles(t: ThemeTokens) {
  return {
    screen: { flex: 1, backgroundColor: t.color.background.default },
    listContent: { padding: spacing.space4, paddingBottom: spacing.space8 },
    screenHeader: { gap: spacing.space1, marginBottom: spacing.space4 },
    // Header de sección -- mismo tratamiento discreto que el header del
    // Incremento B: tile 36 (menor que las 44 de las cards), motivo 22.
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      marginTop: spacing.space5,
      marginBottom: spacing.space3,
    },
    sectionMotifTile: {
      width: 36,
      height: 36,
      borderRadius: radii.small,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    sectionHeaderText: { flex: 1, gap: 2 },
    // Resource card -- idéntica a `unidad/[unitId].tsx` (Incremento B).
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
