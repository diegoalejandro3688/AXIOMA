import { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { SubjectResponse } from '@axioma/contracts';
import { listSubjects } from '../../../lib/api/education';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { Text, Card, Icon } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';
import type { IconName } from '../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; subjects: SubjectResponse[] };

/**
 * Resuelve icono/color académico por NOMBRE real de materia (nunca por
 * posición/índice -- el backend puede reordenar o añadir materias). Las 4
 * familias reales confirmadas contra el seed (`apps/backend/prisma/seed.ts`):
 * Matemática/Ciencias/Historia/Lenguaje (NO "Competencia Lectora" -- ese es
 * el nombre de un TEMA dentro de Lenguaje, no de la materia).
 *
 * `theme/tokens.ts` no define familias de color académicas propias
 * (azul/verde/ámbar/violeta) -- solo existen los tokens semánticos ya
 * aprobados (accent/state.*). Se reutilizan por semejanza de matiz donde
 * corresponde (Matemática -> accent = azul; Ciencias -> state.success =
 * verde; Historia -> state.warning = ámbar). Para Lenguaje (violeta) NO
 * existe ningún token de esa familia -- en vez de fabricar un hex nuevo
 * fuera de `theme/tokens.ts`, mantiene el mismo tratamiento de color que
 * Matemática (icono real y distinto, color de familia limitado por el
 * token disponible) -- ver "Materia no mapeada" en el UI-3 Implementation
 * Report.
 */
export function subjectIcon(name: string): { icon: IconName; tone: 'accent' | 'success' | 'warning' | null } {
  switch (name) {
    case 'Matemática':
      return { icon: 'subject-math', tone: 'accent' };
    case 'Ciencias':
      return { icon: 'subject-science', tone: 'success' };
    case 'Historia':
      return { icon: 'subject-history', tone: 'warning' };
    case 'Lenguaje':
      return { icon: 'subject-language', tone: null };
    default:
      return { icon: 'subject-math', tone: null };
  }
}

/**
 * Grilla de materias -- ver aprobación de alcance de Bloque IV. Renderiza
 * únicamente lo que devuelve `GET /education/subjects`: si solo existe
 * Matemática, se muestra solo Matemática; nunca se hardcodea una materia
 * inexistente. Recorrido: materia -> `estudio/[subjectId]` (detalle) ->
 * `estudio/[subjectId]/unidades` -> `estudio/topic/[topicId]/...`.
 */
export default function EstudioIndexScreen() {
  const router = useRouter();
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listSubjects();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    // Diagnóstico de desarrollo -- ver UI-3 Implementation Report ("Materia
    // no mapeada"): nunca decide un color/icono nuevo por su cuenta, solo
    // reporta qué materias cayeron en el fallback neutro.
    const known = new Set(['Matemática', 'Ciencias', 'Historia', 'Lenguaje']);
    const unmapped = Array.from(new Set(result.data.filter((s) => !known.has(s.name)).map((s) => s.name)));
    if (unmapped.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('[UI-3] Materias no mapeadas a las 4 familias académicas (icono/color neutro aplicado):', unmapped);
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
      <Text variant="heading1" accessibilityRole="header">
        Estudiar
      </Text>
      <FlatList
        data={state.subjects}
        keyExtractor={(subject) => subject.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const { icon, tone } = subjectIcon(item.name);
          return (
            <Card
              variant="interactive"
              accessibilityLabel={`Abrir materia ${item.name}`}
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/(tabs)/estudio/[subjectId]', params: { subjectId: item.id, name: item.name } })
              }
            >
              <View style={toneBadgeStyle(styles, tone)}>
                <Icon name={icon} size={20} color={toneIconColor(tokens, tone)} />
              </View>
              <Text variant="titleMedium">{item.name}</Text>
            </Card>
          );
        }}
      />
    </View>
  );
}

function toneBadgeStyle(styles: ReturnType<typeof createStyles>, tone: 'accent' | 'success' | 'warning' | null) {
  if (tone === 'success') return styles.badgeSuccess;
  if (tone === 'warning') return styles.badgeWarning;
  return styles.badgeAccent;
}

function toneIconColor(t: ThemeTokens, tone: 'accent' | 'success' | 'warning' | null): string {
  if (tone === 'success') return t.color.state.success.text;
  if (tone === 'warning') return t.color.state.warning.text;
  return t.color.accent.strong;
}

function createStyles(t: ThemeTokens) {
  const badgeBase = {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return {
    container: { flex: 1, padding: 16, gap: 16, backgroundColor: t.color.background.default },
    list: { gap: 12 },
    row: { gap: 12 },
    card: { flex: 1, gap: 10 },
    badgeAccent: { ...badgeBase, backgroundColor: t.color.accent.subtleBg },
    badgeSuccess: { ...badgeBase, backgroundColor: t.color.state.success.background },
    badgeWarning: { ...badgeBase, backgroundColor: t.color.state.warning.background },
  };
}
