import type { ResourceContentBlockResponse } from '@axioma/contracts';

/**
 * VC4 MICROBLOQUE 9 -- lógica PURA (sin React/React Native) de detección de
 * pseudo-tablas Markdown (`| Masa | Deformación |`) escritas como una fila
 * por `paragraph`, patrón encontrado en el audit de Ciencias (Microbloque 8)
 * en preguntas de Física/Química/Biología. Vive en un módulo separado de
 * `content-block-renderer.tsx` a propósito -- así un gate de Node puro
 * (`verify-science-presentation-gate.ts`) puede probarla sin arrastrar
 * `react-native` en el import.
 *
 * Detecta cada fila SIN mutar el contenido fuente -- el texto de cada
 * `paragraph` sigue siendo exactamente el mismo dato (`content/estudio/**`);
 * esto es puramente una capa de PRESENTACIÓN (ver Microbloque 9, §17: se
 * resuelve con la estructura actual, sin nuevo contrato ni migración).
 *
 * Formato reconocido: empieza y termina en `|`, con al menos una `|`
 * interior (mínimo 2 celdas). Una fila SUELTA (sin otra fila adyacente que
 * también matchee) NO se trata como tabla -- una sola fila no es una tabla,
 * se deja como texto plano (fallback seguro, cero falsos positivos sobre
 * contenido que sólo use el carácter `|` incidentalmente, ej. notación de
 * valor absoluto `|x|`).
 */
export function parsePipeRow(text: string): string[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|') || trimmed.length < 3) return null;
  const inner = trimmed.slice(1, -1);
  if (!inner.includes('|')) return null;
  return inner.split('|').map((cell) => cell.trim());
}

export type RenderSegment =
  | { kind: 'blocks'; blocks: ResourceContentBlockResponse[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

/**
 * Agrupa corridas consecutivas de `paragraph` (>= 2 filas) que parseen como
 * fila de pipe-tabla en un único segmento `table` (primera fila = headers);
 * todo lo demás (incluida una fila de pipes AISLADA) pasa intacto por el
 * camino de siempre. Preserva el orden original -- las tablas se intercalan
 * en su posición exacta, igual que `PassageContentRenderer` ya hace para los
 * bloques `table` nativos de Ensayo (mismo patrón, sin copiar su código).
 */
export function groupIntoSegments(sorted: ResourceContentBlockResponse[]): RenderSegment[] {
  const segments: RenderSegment[] = [];
  let pending: { block: ResourceContentBlockResponse; row: string[] }[] = [];

  const pushBlock = (block: ResourceContentBlockResponse) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === 'blocks') last.blocks.push(block);
    else segments.push({ kind: 'blocks', blocks: [block] });
  };
  const flushPending = () => {
    if (pending.length === 0) return;
    if (pending.length >= 2) {
      const [headers, ...rows] = pending.map((p) => p.row);
      segments.push({ kind: 'table', headers, rows });
    } else {
      // No se acumuló una corrida >= 2 -- una fila suelta NO es una tabla;
      // se devuelve el bloque original SIN modificar (mismo texto, mismo dato).
      for (const p of pending) pushBlock(p.block);
    }
    pending = [];
  };

  for (const block of sorted) {
    const row = block.type === 'paragraph' ? parsePipeRow(block.text) : null;
    if (row) {
      pending.push({ block, row });
      continue;
    }
    flushPending();
    pushBlock(block);
  }
  flushPending();

  return segments;
}
