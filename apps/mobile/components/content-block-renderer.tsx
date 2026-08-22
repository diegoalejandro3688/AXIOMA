import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { ResourceContentBlockResponse } from '@axioma/contracts';
import { Text, Card } from './ui';
import { useTheme, useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

/**
 * Renderiza los bloques de contenido de un recurso/pregunta -- ver
 * ADR-0002 (arquitectura de fórmulas, no reabierta) y ADR-0013. El cliente
 * NUNCA interpreta LaTeX: `formula` se renderiza con `SvgXml` sobre el `svg`
 * ya generado en el servidor. `image` usa la `url` firmada ya resuelta por
 * EducationService -- este componente nunca ve un `objectKey`.
 *
 * `highlightFormulas` (STUDY-4) -- por defecto `false`, preserva EXACTAMENTE
 * el render plano ya usado por `ejercicio.tsx`/`quick-question.tsx`/
 * `answer-option.tsx` (ningún consumidor existente pasa esta prop, así que
 * su salida no cambia). Cuando es `true` (usado hoy solo por `recurso.tsx`),
 * envuelve CUALQUIER bloque `formula` -- de cualquier resource, no solo el
 * de esta materia -- en una superficie destacada. Es una decisión de
 * PRESENTACIÓN aplicada por `type`, nunca por contenido/texto específico.
 */
export function ContentBlockRenderer({
  blocks,
  highlightFormulas = false,
}: {
  blocks: ResourceContentBlockResponse[];
  highlightFormulas?: boolean;
}) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {sorted.map((block, index) => (
        <ContentBlock key={index} block={block} styles={styles} highlightFormulas={highlightFormulas} />
      ))}
    </View>
  );
}

function ContentBlock({
  block,
  styles,
  highlightFormulas,
}: {
  block: ResourceContentBlockResponse;
  styles: ReturnType<typeof createStyles>;
  highlightFormulas: boolean;
}) {
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
      return <FormulaBlock latex={block.latex} svg={block.svg} styles={styles} highlight={highlightFormulas} />;
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
 *
 * STUDY-4 -- causa raíz del espacio en blanco: el `<svg>` que devuelve
 * MathJax trae `width="19.265ex"` (unidad `ex`, típica de su output SVG) en
 * el nodo raíz. Antes solo se sobreescribía `height` (`height={40}`);
 * `width` quedaba en manos del propio atributo del XML, y `react-native-svg`
 * NO sabe interpretar la unidad `ex` (solo número/`%`) -- resuelve a un
 * ancho de 0, así que la fórmula ocupaba la altura reservada pero pintaba 0
 * píxeles de ancho: el hueco en blanco de la captura real. El fix es
 * sobreescribir también `width` (aquí `"100%"`, igual que ya se hace con
 * `height`) para que `react-native-svg` ignore el atributo `ex` y escale
 * dentro del contenedor usando el `viewBox` (ya presente en el SVG real, sin
 * tocar el pipeline MathJax/servidor). `preserveAspectRatio="xMinYMid meet"`
 * alinea la fórmula a la izquierda igual que el texto circundante, en vez
 * del centrado por defecto de SVG.
 */
function FormulaBlock({
  latex,
  svg,
  styles,
  highlight,
}: {
  latex: string;
  svg: string;
  styles: ReturnType<typeof createStyles>;
  highlight: boolean;
}) {
  const tokens = useTheme();
  const content = (
    <View style={styles.formulaContainer} accessibilityLabel={`Fórmula: ${latex}`}>
      <SvgXml
        xml={extractSvgElement(svg)}
        width="100%"
        height={40}
        preserveAspectRatio="xMinYMid meet"
        color={tokens.color.text.primary}
      />
    </View>
  );

  if (!highlight) return content;

  return (
    <Card variant="subtle" style={styles.formulaCard}>
      <Text variant="label" color="secondary" style={styles.formulaEyebrow}>
        Fórmula clave
      </Text>
      {content}
    </Card>
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
    // STUDY-4 -- superficie destacada opcional (`highlightFormulas`), mismo
    // `Card variant="subtle"` ya usado por otras pantallas, sin token nuevo.
    formulaCard: { gap: 4 },
    formulaEyebrow: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    image: { width: '100%' as const, height: 200, borderRadius: 8 },
  };
}
