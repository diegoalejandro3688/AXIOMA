import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ExamListItem } from '@axioma/contracts';
import { listExams } from '../../../../lib/api/exams';
import { formatDuration } from '../../../../lib/exams/timer';
import { useEntitlement } from '../../../../lib/entitlement/entitlement-provider';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { PremiumBadge } from '../../../../components/premium/premium-badge';
import { Text, Card, Icon } from '../../../../components/ui';
import { useThemedStyles, useTheme, spacing, radii } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';
import { subjectIcon, subjectToneBackground, subjectToneColor } from '../../../../lib/academic/subject-icon';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; exams: ExamListItem[] };

/**
 * Listado de Ensayos -- ENSAYOS-M1-C. Consume `GET /exams` (solo PUBLISHED) y
 * renderiza lo que el backend devuelva. Si llega con `subjectId` (viniendo
 * del detalle de una materia), filtra a los ensayos de esa materia -- así,
 * cuando se importen M2/Lectora/Historia/Ciencias, cada uno aparece bajo su
 * materia sin tocar esta pantalla.
 *
 * NO muestra: puntaje PAES, dificultad global, candado premium, XP/LP.
 *
 * INCREMENTO E (visual) -- la card hereda la identidad de materia (tono +
 * icono de ensayo `study-mode-essay`) con los MISMOS helpers que Unidades/
 * Recursos (`subjectIcon(name)` + `subjectTone*`), sin colores locales ni
 * `UnitMotif` (un ensayo completo no es una unidad curricular). Sin cambios
 * de datos, requests ni funcionalidad.
 *
 * PREMIUM V1 -- Capa 2 (C2.3): los Ensayos son Premium, pero el catálogo
 * (`GET /exams`) sigue VISIBLE para FREE. Con FREE confirmado la card muestra
 * `<PremiumBadge>` y atenúa SOLO la tile decorativa (mismo tono `state.warning`
 * que Unidades, título a contraste pleno, sin opacity de card). El tap SIGUE
 * navegando al pre-start -- NUNCA abre el paywall desde la lista: la lista no
 * sabe si el usuario tiene un intento ACTIVE reanudable; esa decisión es del
 * backend en `POST /attempts` (resume-first, C1.2). `loading`/`error` de
 * entitlement -> cards normales, sin estado comercial. El tier solo afecta la
 * presentación: no se re-pide `GET /exams` porque cambie.
 */
export default function EnsayosListScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId?: string; name?: string }>();
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isFree } = useEntitlement();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  // Tono de la materia -- mismo criterio que Unidades/Recursos: viene del
  // nombre visible (`name`, route param), nunca del `subjectId` crudo.
  const { tone } = subjectIcon(name ?? '');
  const examIconColor = subjectToneColor(tokens, tone);
  const examIconBackground = subjectToneBackground(tokens, tone);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listExams();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    const exams = subjectId ? result.data.exams.filter((exam) => exam.subjectId === subjectId) : result.data.exams;
    setState({ status: 'ready', exams });
  }, [subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando ensayos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.exams.length === 0) {
    return <EmptyState message="Aún no hay ensayos disponibles para esta materia." />;
  }

  return (
    <View style={styles.container}>
      <Text variant="heading2" accessibilityRole="header">
        Ensayos
      </Text>
      <Text variant="bodySmall" color="secondary">
        Simulacros completos para medir tu preparación.
      </Text>
      <FlatList
        data={state.exams}
        keyExtractor={(exam) => exam.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          // FREE confirmado: badge + tile atenuada. El tap NO cambia -- sigue
          // navegando al pre-start (el backend decide reanudar vs. 403).
          const locked = isFree;
          const tileBackground = locked ? tokens.color.state.warning.background : examIconBackground;
          const tileIconColor = locked ? tokens.color.state.warning.text : examIconColor;
          return (
            <Card
              variant="interactive"
              accessibilityLabel={
                locked
                  ? `Abrir ${item.title}, ${item.questionCount} preguntas, contenido Premium`
                  : `Abrir ${item.title}, ${item.questionCount} preguntas`
              }
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/estudio/ensayos/[examId]',
                  params: { examId: item.id, name: name ?? '' },
                })
              }
            >
              <View style={[styles.iconTile, { backgroundColor: tileBackground }]}>
                <Icon name="study-mode-essay" size={22} color={tileIconColor} />
              </View>
              <View style={styles.cardBody}>
                <Text variant="titleMedium">{item.title}</Text>
                <Text variant="bodySmall" color="secondary">
                  {item.questionCount} preguntas · {formatDuration(item.durationSeconds)}
                </Text>
                {name ? (
                  <Text variant="bodySmall" color="secondary">
                    {name}
                  </Text>
                ) : null}
                {locked ? (
                  <View style={styles.badgeRow}>
                    <PremiumBadge />
                  </View>
                ) : null}
              </View>
              <Icon name="chevron-right" size={20} color="muted" />
            </Card>
          );
        }}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: spacing.space4, gap: spacing.space4, backgroundColor: t.color.background.default },
    list: { gap: spacing.space2 },
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      borderRadius: radii.medium,
    },
    // Tile de identidad -- mismo tamaño/radio que las tiles de Unidades y
    // Recursos; el icono no debe dominar la card (título = elemento principal).
    iconTile: {
      width: 44,
      height: 44,
      borderRadius: radii.medium,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    cardBody: { flex: 1, gap: 2 },
    badgeRow: { flexDirection: 'row' as const, marginTop: 2 },
  };
}
