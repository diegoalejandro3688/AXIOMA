import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ResourceContentBlockResponse } from '@axioma/contracts';

/**
 * Renderiza los bloques de contenido de un recurso/pregunta -- ver
 * ADR-0002 (arquitectura de fórmulas, no reabierta) y ADR-0013. El cliente
 * NUNCA interpreta LaTeX: `formula` se renderiza con `SvgXml` sobre el `svg`
 * ya generado en el servidor. `image` usa la `url` firmada ya resuelta por
 * EducationService -- este componente nunca ve un `objectKey`.
 */
export function ContentBlockRenderer({ blocks }: { blocks: ResourceContentBlockResponse[] }) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  return (
    <View style={styles.container}>
      {sorted.map((block, index) => (
        <ContentBlock key={index} block={block} />
      ))}
    </View>
  );
}

function ContentBlock({ block }: { block: ResourceContentBlockResponse }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text accessibilityRole="header" style={styles.heading}>
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <Text style={styles.paragraph}>{block.text}</Text>;
    case 'formula':
      return (
        <View style={styles.formulaContainer} accessibilityLabel={`Fórmula: ${block.latex}`}>
          <SvgXml xml={extractSvgElement(block.svg)} height={40} />
        </View>
      );
    case 'image':
      return (
        <Image
          source={{ uri: block.url }}
          accessibilityLabel={block.altText}
          style={styles.image}
          resizeMode="contain"
        />
      );
  }
}

/**
 * MathJax (`liteAdaptor().outerHTML()`) devuelve `<mjx-container>...<svg>...
 * </svg></mjx-container>` (ver ADR-0002, spike, y `formula-rendering.ts` del
 * backend) -- `SvgXml` espera un `<svg>` como raíz. Extrae solo el elemento
 * `<svg>` interno; si no lo encuentra (forma inesperada), devuelve el string
 * original y deja que `SvgXml` falle de forma visible antes que ocultar un
 * dato corrupto silenciosamente.
 */
function extractSvgElement(mjxOutput: string): string {
  const match = /<svg[\s\S]*<\/svg>/.exec(mjxOutput);
  return match ? match[0] : mjxOutput;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: { fontSize: 20, fontWeight: '700' },
  paragraph: { fontSize: 15, lineHeight: 22, color: '#222' },
  formulaContainer: { paddingVertical: 4 },
  image: { width: '100%', height: 200, borderRadius: 8 },
});
