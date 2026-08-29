import { ScrollView, View } from 'react-native';
import type { ExamTableBlock } from '@axioma/contracts';
import { Text } from '../ui';
import { useThemedStyles, spacing, radii } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * ENSAYOS-F2 -- render de una TABLA estructurada de un texto de lectura
 * compartido. Renderiza filas/columnas reales (nunca Markdown ni imagen); no
 * altera ningún valor. La fila de encabezado es visualmente distinta. Si la
 * tabla es más ancha que la pantalla, SOLO la tabla hace scroll horizontal
 * dentro de su contenedor -- el resto de la pantalla nunca se desplaza en X.
 *
 * Este componente vive en el dominio EXAMS y NO toca el render de Study.
 */
export function PassageTable({ block }: { block: ExamTableBlock }) {
  const styles = useThemedStyles(createStyles);
  const columnCount = block.headers.length;
  // Ancho mínimo por columna -- suficiente para números/texto corto de PAES;
  // si la suma supera el ancho de pantalla, el ScrollView horizontal se activa.
  const minColWidth = 96;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ minWidth: '100%' }}
      >
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {block.headers.map((header, index) => (
              <View key={`h-${index}`} style={[styles.cell, { minWidth: minColWidth }, index < columnCount - 1 && styles.cellBorderRight]}>
                <Text variant="label" style={styles.headerText}>
                  {header}
                </Text>
              </View>
            ))}
          </View>
          {block.rows.map((row, rowIndex) => (
            <View
              key={`r-${rowIndex}`}
              style={[styles.row, rowIndex < block.rows.length - 1 && styles.rowBorderBottom]}
            >
              {row.map((cell, cellIndex) => (
                <View
                  key={`c-${rowIndex}-${cellIndex}`}
                  style={[styles.cell, { minWidth: minColWidth }, cellIndex < columnCount - 1 && styles.cellBorderRight]}
                >
                  <Text variant="bodySmall">{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {block.footnote ? (
        <Text variant="caption" color="secondary" style={styles.footnote}>
          {block.footnote}
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
