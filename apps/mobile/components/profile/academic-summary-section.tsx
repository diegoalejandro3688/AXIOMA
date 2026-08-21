import { Text, View } from 'react-native';
import type { AcademicSummaryResponse } from '@axioma/contracts';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * LEF Bloque V, Incremento 3/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §11) --
 * representación de SOLO LECTURA del resumen académico privado, ya calculado
 * por `GET /user/me/advanced-profile` (Incremento 5, que a su vez compone
 * `academicSummaryResponseSchema` de PROGRESS sin recalcular nada). Este
 * componente NUNCA deriva `accuracyPercentage` ni ningún otro número por sí
 * mismo -- solo formatea lo ya recibido.
 *
 * Deliberadamente SIN tiempo de estudio ni ensayos -- `academicSummaryResponseSchema`
 * no los declara (gap de producto documentado en el cierre del Incremento 3,
 * ninguna fuente real todavía) -- mostrarlos sería fabricar un dato.
 *
 * `accuracyPercentage`/`lastActivityAt` en `null` son estados REALES ("sin
 * datos todavía", nunca "0%") -- se representan como texto explícito, nunca
 * como 0 ni se ocultan en silencio.
 */
export function AcademicSummarySection({ summary }: { summary: AcademicSummaryResponse }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Resumen académico
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.totalQuestionsAnswered}</Text>
          <Text style={styles.statLabel}>Preguntas respondidas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.totalCorrectAnswers}</Text>
          <Text style={styles.statLabel}>Correctas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.accuracyPercentage === null ? '—' : `${Math.round(summary.accuracyPercentage)}%`}</Text>
          <Text style={styles.statLabel}>Precisión</Text>
        </View>
      </View>

      <Text style={styles.lastActivity}>
        {summary.lastActivityAt === null ? 'Todavía sin actividad registrada.' : `Última actividad: ${new Date(summary.lastActivityAt).toLocaleDateString()}`}
      </Text>

      {summary.progressBySubject.length > 0 ? (
        <View style={styles.subjectsList}>
          {summary.progressBySubject.map((subject) => (
            <View key={subject.subjectKey} style={styles.subjectRow}>
              <Text style={styles.subjectName}>{subject.subjectName}</Text>
              <Text style={styles.subjectProgress}>
                {subject.topicsCompleted}/{subject.totalTopics} temas completados
                {subject.topicsStarted > subject.topicsCompleted ? ` (${subject.topicsStarted} iniciados)` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12 },
    title: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    statsRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 8 },
    stat: {
      flex: 1,
      alignItems: 'center' as const,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 12,
      paddingVertical: 12,
      gap: 4,
    },
    statValue: { fontSize: 20, fontWeight: '700' as const, color: t.color.text.primary },
    statLabel: { fontSize: 11, color: t.color.text.muted, textAlign: 'center' as const },
    lastActivity: { fontSize: 12, color: t.color.text.secondary },
    subjectsList: { gap: 8 },
    subjectRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    // `flexShrink`/`flexGrow` explícitos -- sin esto, `space-between` puede
    // dejar ambos textos pegados sin espacio cuando el contenido llena el
    // ancho de la fila (ej. "Matemática0/134 temas completados…", visto en
    // validación Android física). Puramente visual: ni el dato ni el
    // cálculo de progreso cambian.
    subjectName: { fontSize: 13, fontWeight: '600' as const, color: t.color.text.primary, flexShrink: 1 },
    subjectProgress: { fontSize: 12, color: t.color.text.secondary, flexShrink: 0, textAlign: 'right' as const },
  };
}
