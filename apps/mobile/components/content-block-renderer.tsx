import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ResourceContentBlockResponse } from '@axioma/contracts';
import { Text } from './ui';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

/**
 * Renderiza los bloques de contenido de un recurso/pregunta -- ver
 * ADR-0002 (arquitectura de fórmulas, no reabierta) y ADR-0013. El cliente
 * NUNCA interpreta LaTeX: `formula` se renderiza con `SvgXml` sobre el `svg`
 * ya generado en el servidor. `image` usa la `url` firmada ya resuelta por
 * EducationService -- este componente nunca ve un `objectKey`.
 */
export function ContentBlockRenderer({ blocks }: { blocks: ResourceContentBlockResponse[] }) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {sorted.map((block, index) => (
        <ContentBlock key={index} block={block} styles={styles} />
      ))}
    </View>
  );
}

function ContentBlock({ block, styles }: { block: ResourceContentBlockResponse; styles: ReturnType<typeof createStyles> }) {
  switch (block.type) {
    case 'heading':
      return (
        <Text variant="heading3" accessibilityRole="header">
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <Text variant="body">{block.text}</Text>;
    case 'formula':
      return <FormulaBlock latex={block.latex} svg={block.svg} styles={styles} />;
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
 * MathJax SVG output dibuja los glifos con `fill="currentColor"` en el nodo
 * raíz (comportamiento estándar de `mathjax-full`'s `SVG` output, ver
 * `formula-rendering.ts`) -- por eso SÍ es tematizable sin tocar ADR-0002 ni
 * regenerar nada en el servidor: `SvgXml` (react-native-svg) resuelve
 * `currentColor` a partir de su prop `color`, igual que `color` en CSS.
 */
function FormulaBlock({ latex, svg, styles }: { latex: string; svg: string; styles: ReturnType<typeof createStyles> }) {
  const tokens = useTheme();
  return (
    <View style={styles.formulaContainer} accessibilityLabel={`Fórmula: ${latex}`}>
      <SvgXml xml={extractSvgElement(svg)} height={40} color={tokens.color.text.primary} />
    </View>
  );
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

/**
 * `heading`/`paragraph` usan `variant` de la primitiva `Text` (UI-1,
 * `theme/typography.ts`) -- ya tematizados por color/escala vía esa
 * primitiva, sin estilo propio aquí (UI-6). El `svg` de fórmulas y las
 * imágenes ya vienen resueltos del servidor -- no son "color de interfaz"
 * (ver ADR-0015, "cero color hardcodeado sin justificación").
 */
function createStyles(_t: ThemeTokens) {
  return {
    container: { gap: 12 },
    formulaContainer: { paddingVertical: 4 },
    image: { width: '100%' as const, height: 200, borderRadius: 8 },
  };
}
