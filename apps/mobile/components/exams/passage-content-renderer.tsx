import { Fragment } from 'react';
import { View } from 'react-native';
import type { ExamPassageView, ResourceContentBlockResponse } from '@axioma/contracts';
import { ContentBlockRenderer } from '../content-block-renderer';
import { PassageTable } from './passage-table';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

type PassageBlock = ExamPassageView['content'][number];

/**
 * ENSAYOS-F2 -- render del contenido de un texto de lectura compartido.
 *
 * Los bloques estándar (heading/paragraph/formula/image) se DELEGAN al
 * `ContentBlockRenderer` ya usado por Study/quick-question/ensayos -- no se
 * copia su lógica de SVG/tamaño de fórmula ni de URL firmada. El único tipo
 * propio de EXAMS, `table`, lo maneja este componente vía `PassageTable`.
 *
 * Se preserva el orden declarado (`block.order`): los tramos consecutivos de
 * bloques estándar se agrupan en un solo `ContentBlockRenderer` y las tablas
 * se intercalan en su posición exacta.
 */
export function PassageContentRenderer({ content }: { content: PassageBlock[] }) {
  const styles = useThemedStyles(createStyles);
  const ordered = [...content].sort((a, b) => a.order - b.order);

  const segments: Array<{ kind: 'blocks'; blocks: ResourceContentBlockResponse[] } | { kind: 'table'; block: Extract<PassageBlock, { type: 'table' }> }> = [];
  for (const block of ordered) {
    if (block.type === 'table') {
      segments.push({ kind: 'table', block });
      continue;
    }
    const last = segments[segments.length - 1];
    if (last && last.kind === 'blocks') last.blocks.push(block as ResourceContentBlockResponse);
    else segments.push({ kind: 'blocks', blocks: [block as ResourceContentBlockResponse] });
  }

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.kind === 'blocks' ? (
            <ContentBlockRenderer blocks={segment.blocks} />
          ) : (
            <PassageTable block={segment.block} />
          )}
        </Fragment>
      ))}
    </View>
  );
}

function createStyles(_t: ThemeTokens) {
  return {
    container: { gap: 12 },
  };
}
