import { View } from 'react-native';
import type { AcademicSummaryResponse } from '@axioma/contracts';
import { subjectIcon, subjectToneColor, subjectToneBackground } from '../../lib/academic/subject-icon';
import { Text, Progress, Icon } from '../ui';
import { useTheme, useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * LEF Bloque V, Incremento 3/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §11) --
 * representación de SOLO LECTURA del progreso por materia, ya calculado por
 * `GET /user/me/advanced-profile` (Incremento 5). Este componente NUNCA
 * deriva `topicsCompleted`/`totalTopics` -- solo formatea lo ya recibido.
 *
 * PROFILE-4 (decisión del Product Owner, 2026-08-22) -- extraído de
 * `AcademicSummarySection` (ahora `AcademicStatsSection` para la otra
 * mitad) para vivir en la pestaña "Resumen" de Perfil, separado de los 3
 * indicadores + última actividad (que viven en "Estadísticas"). Mismo
 * `summary` ya cargado por el agregador -- SIN fetch propio. Presentación
 * (íconos + `Progress` + fracción) sin cambios respecto al componente
 * original -- PROFILE-4 solo reubica, no rediseña esta parte.
 */
export function SubjectProgressSection({ summary }: { summary: AcademicSummaryResponse }) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);

  if (summary.progressBySubject.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="label" color="secondary" style={styles.title}>
        Progreso por materia
      </Text>
      {summary.progressBySubject.map((subject) => {
        const { icon, tone } = subjectIcon(subject.subjectName);
        const ratio = subject.totalTopics > 0 ? subject.topicsCompleted / subject.totalTopics : 0;
        return (
          <View key={subject.subjectKey} style={styles.subjectRow}>
            <View style={[styles.subjectIconWrap, { backgroundColor: subjectToneBackground(tokens, tone) }]}>
              <Icon name={icon} size={16} color={subjectToneColor(tokens, tone)} />
            </View>
            <View style={styles.subjectBody}>
              <Text variant="bodySmall" weight="semibold">
                {subject.subjectName}
              </Text>
              <Progress
                value={ratio}
                color={subjectToneColor(tokens, tone)}
                height={6}
                accessibilityLabel={`${subject.subjectName}: ${subject.topicsCompleted} de ${subject.totalTopics} temas completados`}
              />
            </View>
            <Text variant="caption" color="secondary" style={styles.subjectFraction}>
              {subject.topicsCompleted}/{subject.totalTopics}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    // PROFILE-5A -- aire ligeramente mayor entre filas y entre el heading y
    // la primera materia (antes 6, ajuste pequeño e intencional, sin tocar
    // barras/colores/iconos/datos).
    container: { gap: 10 },
    title: { textTransform: 'uppercase' as const },
    subjectRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
    subjectIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    subjectBody: { flex: 1, gap: 4 },
    subjectFraction: { minWidth: 44, textAlign: 'right' as const },
  };
}
