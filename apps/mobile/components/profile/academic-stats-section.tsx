import { View } from 'react-native';
import type { AcademicSummaryResponse } from '@axioma/contracts';
import { Text, Card, Icon, Divider } from '../ui';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens, IconName } from '../../theme';

/**
 * LEF Bloque V, Incremento 3/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §11) --
 * representación de SOLO LECTURA de los 3 indicadores + última actividad
 * del resumen académico privado, ya calculado por `GET /user/me/advanced-profile`
 * (Incremento 5). Este componente NUNCA deriva `accuracyPercentage` ni
 * ningún otro número por sí mismo -- solo formatea lo ya recibido.
 *
 * `accuracyPercentage`/`lastActivityAt` en `null` son estados REALES ("sin
 * datos todavía", nunca "0%") -- se representan como texto explícito, nunca
 * como 0 ni se ocultan en silencio.
 *
 * PROFILE-4 (decisión del Product Owner, 2026-08-22) -- extraído de
 * `AcademicSummarySection` (ahora `SubjectProgressSection` para la otra
 * mitad) para vivir en la pestaña "Estadísticas" de Perfil, separado del
 * progreso por materia (que vive en "Resumen"). Mismo `summary` ya cargado
 * por el agregador -- SIN fetch propio, sin recalcular nada distinto de lo
 * que ya hacía el componente original.
 *
 * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- polish visual: las
 * 3 `Card` independientes se fusionan en UNA sola card horizontal con 3
 * columnas separadas por `Divider` vertical -- mismos datos, mismo
 * significado, sin padding/borde repetido 3 veces. "Correctas" conserva su
 * ícono `check`; Preguntas/Precisión sin ícono (no existe uno
 * semánticamente correcto en el registro, no se fuerza ninguno).
 */
export function AcademicStatsSection({ summary }: { summary: AcademicSummaryResponse }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text variant="heading3" accessibilityRole="header">
        Estadísticas académicas
      </Text>

      <Card variant="outlined" style={styles.statsCard}>
        <StatColumn value={summary.totalQuestionsAnswered} label="Preguntas" />
        <Divider orientation="vertical" />
        <StatColumn value={summary.totalCorrectAnswers} label="Correctas" icon="check" />
        <Divider orientation="vertical" />
        <StatColumn value={summary.accuracyPercentage === null ? '—' : `${Math.round(summary.accuracyPercentage)}%`} label="Precisión" />
      </Card>

      <Text variant="caption" color="secondary">
        {summary.lastActivityAt === null ? 'Todavía sin actividad registrada.' : `Última actividad: ${new Date(summary.lastActivityAt).toLocaleDateString()}`}
      </Text>
    </View>
  );
}

function StatColumn({ value, label, icon }: { value: number | string; label: string; icon?: IconName }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statColumn}>
      {icon ? <Icon name={icon} size={16} color="accent" /> : null}
      <Text variant="titleLarge" weight="bold">
        {value}
      </Text>
      <Text variant="caption" color="muted" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    container: { gap: 8 },
    statsCard: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, gap: 8 },
    statColumn: { flex: 1, alignItems: 'center' as const, gap: 4 },
    statLabel: { textAlign: 'center' as const },
  };
}
