import { ScrollView, View } from 'react-native';
import { Text } from './text';
import { useThemedStyles, spacing, radii } from '../../theme';
import type { ThemeTokens } from '../../theme';

export interface DataTableProps {
  headers: string[];
  rows: string[][];
  footnote?: string;
}

/**
 * VC4 MICROBLOQUE 9 -- tabla genérica de datos (masa/deformación,
 * voltaje/corriente, cruces genéticos, etc.). Layout y tokens IDÉNTICOS a
 * `components/exams/passage-table.tsx` (ENSAYOS-F2, ya en producción para
 * pasajes de lectura) -- misma solución visual ya validada, generalizada a
 * un prop shape simple (`{headers, rows, footnote?}`) sin depender de
 * `ExamTableBlock`/`@axioma/contracts`, para poder usarse también desde
 * `ContentBlockRenderer` (Study/Quick/Ensayos) sin acoplarse al dominio
 * EXAMS. Genérico a propósito -- NO es "PhysicsTable"/"ChemistryTable", una
 * sola implementación para cualquier materia.
 *
 * Si la tabla es más ancha que la pantalla, SOLO ella hace scroll horizontal
 * dentro de su propio contenedor -- el resto de la pregunta nunca se
 * desplaza en X.
 */
export function DataTable({ headers, rows, footnote }: DataTableProps) {
  const styles = useThemedStyles(createStyles);
  const columnCount = headers.length;
  const minColWidth = 96;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
        <View style={styles.table} accessibilityRole="none">
          <View style={[styles.row, styles.headerRow]}>
            {headers.map((header, index) => (
              <View key={`h-${index}`} style={[styles.cell, { minWidth: minColWidth }, index < columnCount - 1 && styles.cellBorderRight]}>
                <Text variant="label" style={styles.headerText}>
                  {header}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View key={`r-${rowIndex}`} style={[styles.row, rowIndex < rows.length - 1 && styles.rowBorderBottom]}>
              {row.map((cell, cellIndex) => (
                <View key={`c-${rowIndex}-${cellIndex}`} style={[styles.cell, { minWidth: minColWidth }, cellIndex < columnCount - 1 && styles.cellBorderRight]}>
                  <Text variant="bodySmall">{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {footnote ? (
        <Text variant="caption" color="secondary" style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    wrap: { gap: spacing.space1 },
    table: {
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: radii.small,
      overflow: 'hidden' as const,
    },
    row: { flexDirection: 'row' as const },
    headerRow: { backgroundColor: t.color.background.surface },
    rowBorderBottom: { borderBottomWidth: 1, borderBottomColor: t.color.border.default },
    cell: {
      paddingVertical: spacing.space2,
      paddingHorizontal: spacing.space2,
      justifyContent: 'center' as const,
    },
    cellBorderRight: { borderRightWidth: 1, borderRightColor: t.color.border.default },
    headerText: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    footnote: { fontStyle: 'italic' as const },
  };
}
