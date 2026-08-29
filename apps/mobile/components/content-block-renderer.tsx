import { useMemo, useState } from 'react';
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
 *
 * `formulaContext` (ENSAYOS-M1-D) -- escala de PRESENTACIÓN del SVG de
 * fórmula, nunca toca el LaTeX ni el `svg`. `'block'` (por defecto) es el
 * tamaño de un bloque de fórmula suelto (stems, explicaciones, "Fórmula
 * clave" de Study). `'option'` lo compacta al tamaño del texto de una
 * alternativa: una alternativa "solo fórmula" (`8`, `\frac{13}{20}`) debe
 * parecerse a una alternativa de texto normal, no ocupar toda la tarjeta.
 */
export type FormulaContext = 'block' | 'option';

export function ContentBlockRenderer({
  blocks,
  highlightFormulas = false,
  formulaContext = 'block',
}: {
  blocks: ResourceContentBlockResponse[];
  highlightFormulas?: boolean;
  formulaContext?: FormulaContext;
}) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {sorted.map((block, index) => (
        <ContentBlock
          key={index}
          block={block}
          styles={styles}
          highlightFormulas={highlightFormulas}
          formulaContext={formulaContext}
        />
      ))}
    </View>
  );
}

function ContentBlock({
  block,
  styles,
  highlightFormulas,
  formulaContext,
}: {
  block: ResourceContentBlockResponse;
  styles: ReturnType<typeof createStyles>;
  highlightFormulas: boolean;
  formulaContext: FormulaContext;
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
      return (
        <FormulaBlock
          latex={block.latex}
          svg={block.svg}
          styles={styles}
          highlight={highlightFormulas}
          context={formulaContext}
        />
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
 * MathJax SVG output dibuja los glifos con `fill="currentColor"` en el nodo
 * raíz (comportamiento estándar de `mathjax-full`'s `SVG` output, ver
 * `formula-rendering.ts`) -- por eso SÍ es tematizable sin tocar ADR-0002 ni
 * regenerar nada en el servidor: `SvgXml` (react-native-svg) resuelve
 * `currentColor` a partir de su prop `color`, igual que `color` en CSS.
 *
 * TAMAÑO (STUDY-4 + ENSAYOS-M1-D) -- el `<svg>` de MathJax trae
 * `width="20.4ex"` / `height="2.26ex"` (unidad `ex`) y un `viewBox`.
 * `react-native-svg` NO sabe interpretar `ex` (solo número/`%`). El primer
 * fix (STUDY-4) forzaba `width="100%" height={40}`: correcto para el hueco
 * en blanco, pero en Android estiraba una fórmula minúscula (`8`) a todo el
 * ancho y la fijaba en 40px de alto -> ocupaba casi toda la tarjeta de
 * alternativa. Ahora derivamos el tamaño intrínseco de los propios atributos
 * `ex` del SVG y lo escalamos a píxeles relativos al texto circundante
 * (`EX_PX`), preservando el aspect ratio vía `viewBox`. Si la fórmula es más
 * ancha que el contenedor (ecuaciones largas), se reduce a lo ancho
 * disponible manteniendo la proporción (sin recorte ni overflow). Si el SVG
 * no trae dimensiones en `ex` (forma inesperada), se cae al comportamiento
 * anterior (`100%` / alto fijo). NUNCA se toca el LaTeX ni el `svg`.
 */
const EX_PX: Record<FormulaContext, number> = {
  // ~1ex de texto `body` (16px) ≈ 8px -> una alternativa "solo fórmula"
  // queda del tamaño del texto de las demás alternativas.
  option: 8,
  // Un bloque de fórmula suelto se muestra algo más grande que el cuerpo,
  // como venía viéndose en Study, pero proporcional a su complejidad real.
  block: 13,
};
const FALLBACK_HEIGHT: Record<FormulaContext, number> = { option: 22, block: 40 };

function FormulaBlock({
  latex,
  svg,
  styles,
  highlight,
  context,
}: {
  latex: string;
  svg: string;
  styles: ReturnType<typeof createStyles>;
  highlight: boolean;
  context: FormulaContext;
}) {
  const tokens = useTheme();
  const [maxWidth, setMaxWidth] = useState<number | null>(null);
  const intrinsic = useMemo(() => parseSvgIntrinsicSize(svg), [svg]);

  let width: number | string;
  let height: number;
  if (intrinsic) {
    const naturalWidth = intrinsic.exWidth * EX_PX[context];
    const naturalHeight = intrinsic.exHeight * EX_PX[context];
    if (maxWidth != null && naturalWidth > maxWidth) {
      // Ecuación más ancha que el contenedor: reducir a lo disponible,
      // mismo aspect ratio (nada de recorte ni scroll horizontal).
      width = Math.floor(maxWidth);
      height = Math.max(1, Math.round(naturalHeight * (maxWidth / naturalWidth)));
    } else {
      width = Math.round(naturalWidth);
      height = Math.round(naturalHeight);
    }
  } else {
    width = '100%';
    height = FALLBACK_HEIGHT[context];
  }

  const content = (
    <View
      style={styles.formulaContainer}
      accessibilityLabel={`Fórmula: ${latex}`}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setMaxWidth((prev) => (prev != null && Math.abs(prev - w) < 1 ? prev : w));
      }}
    >
      <SvgXml
        xml={extractSvgElement(svg)}
        width={width}
        height={height}
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
 * MathJax emite el `<svg>` raíz con `width="N.NNNex"` y `height="M.MMMex"`
 * (unidad `ex`, ver `formula-rendering.ts` del backend). Extrae ese par para
 * poder dimensionar el SVG a un tamaño relativo al texto. Devuelve `null` si
 * la forma no es la esperada -> el llamador cae al comportamiento previo.
 */
function parseSvgIntrinsicSize(svg: string): { exWidth: number; exHeight: number } | null {
  const openTag = /<svg[^>]*>/i.exec(svg);
  if (!openTag) return null;
  const widthMatch = /\bwidth="([\d.]+)ex"/i.exec(openTag[0]);
  const heightMatch = /\bheight="([\d.]+)ex"/i.exec(openTag[0]);
  if (!widthMatch || !heightMatch) return null;
  const exWidth = Number(widthMatch[1]);
  const exHeight = Number(heightMatch[1]);
  if (!Number.isFinite(exWidth) || !Number.isFinite(exHeight) || exWidth <= 0 || exHeight <= 0) {
    return null;
  }
  return { exWidth, exHeight };
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
    formulaContainer: { paddingVertical: 4, alignItems: 'flex-start' as const },
    // STUDY-4 -- superficie destacada opcional (`highlightFormulas`), mismo
    // `Card variant="subtle"` ya usado por otras pantallas, sin token nuevo.
    formulaCard: { gap: 4 },
    formulaEyebrow: { textTransform: 'uppercase' as const, letterSpacing: 0.5 },
    image: { width: '100%' as const, height: 200, borderRadius: 8 },
  };
}
