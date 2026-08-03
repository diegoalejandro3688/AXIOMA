import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SubjectResponse } from '@axioma/contracts';
import { listSubjects } from '../../../lib/api/education';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; subjects: SubjectResponse[] };

/**
 * Grilla de materias -- ver aprobación de alcance de Bloque IV. Renderiza
 * únicamente lo que devuelve `GET /education/subjects`: si solo existe
 * Matemática, se muestra solo Matemática; nunca se hardcodea una materia
 * inexistente. Recorrido: materia -> `estudio/[subjectId]` (detalle) ->
 * `estudio/[subjectId]/unidades` -> `estudio/topic/[topicId]/...`.
 */
export default function EstudioIndexScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listSubjects();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setState({ status: 'ready', subjects: result.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando materias…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.subjects.length === 0) return <EmptyState message="Todavía no hay materias disponibles." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Estudiar
      </Text>
      <FlatList
        data={state.subjects}
        keyExtractor={(subject) => subject.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir materia ${item.name}`}
            style={styles.card}
            onPress={() =>
              router.push({ pathname: '/(tabs)/estudio/[subjectId]', params: { subjectId: item.id, name: item.name } })
            }
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.shortName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.cardName}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    title: { fontSize: 22, fontWeight: '700' as const, color: t.color.text.primary },
    list: { gap: 12 },
    row: { gap: 12 },
    card: {
      flex: 1,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    badge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.color.accent.subtleBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badgeText: { fontSize: 13, fontWeight: '700' as const, color: t.color.accent.strong },
    cardName: { fontSize: 14, fontWeight: '500' as const, color: t.color.text.primary },
  };
}
