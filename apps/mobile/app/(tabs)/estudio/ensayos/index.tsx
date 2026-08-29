import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ExamListItem } from '@axioma/contracts';
import { listExams } from '../../../../lib/api/exams';
import { formatDuration } from '../../../../lib/exams/timer';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { EmptyState } from '../../../../components/empty-state';
import { Text, Card, Icon } from '../../../../components/ui';
import { useThemedStyles, spacing, radii } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

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
 */
export default function EnsayosListScreen() {
  const { subjectId, name } = useLocalSearchParams<{ subjectId?: string; name?: string }>();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

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
        renderItem={({ item }) => (
          <Card
            variant="interactive"
            accessibilityLabel={`Abrir ${item.title}, ${item.questionCount} preguntas`}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/estudio/ensayos/[examId]',
                params: { examId: item.id, name: name ?? '' },
              })
            }
          >
            <View style={styles.cardBody}>
              <Text variant="titleMedium">{item.title}</Text>
              <Text variant="bodySmall" color="secondary">
                {item.questionCount} preguntas · {formatDuration(item.durationSeconds)}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color="muted" />
          </Card>
        )}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    list: { gap: spacing.space2 },
    card: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.space3,
      borderRadius: radii.medium,
    },
    cardBody: { flex: 1, gap: 4 },
  };
}
