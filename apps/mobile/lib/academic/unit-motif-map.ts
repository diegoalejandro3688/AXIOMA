/**
 * ESTUDIO A0 -- fuente ÚNICA y canónica del mapeo de motivos académicos por
 * Unidad. Extraído sin cambios de comportamiento desde
 * `app/(tabs)/estudio/[subjectId]/unidades.tsx` (donde vivía local como
 * `UnitMotifKey` / `CURRICULUM_AREA_MOTIF` / `resolveUnitMotif`).
 *
 * Este archivo es PURO (sin JSX ni `react-native-svg`) -- solo tipos + mapa
 * + resolver, para poder verificarlo de forma aislada en Node
 * (`scripts/verify-unit-motif-gate.ts`). El componente SVG y el punto de
 * entrada de la app viven en `unit-motif.tsx`, que re-exporta este contrato
 * -- las pantallas siempre importan desde `./unit-motif`, nunca desde aquí
 * directamente.
 *
 * STUDY-3 -- selecciona un motivo académico abstracto a partir de
 * `topic.code` (identificador curricular estable, ej.
 * `M1.NUMEROS.PORCENTAJES`), NUNCA a partir de `topic.name` (texto visible,
 * frágil ante renombres editoriales). Busca un segmento reconocido del
 * código contra un catálogo pequeño de áreas curriculares conocidas; si
 * ninguno coincide (materia/unidad futura sin área mapeada todavía), cae en
 * un motivo genérico -- la pantalla nunca depende de que las 4 áreas de hoy
 * sigan siendo las únicas que existan. No introduce metadata nueva en
 * `CurriculumTopicResponse` ni conocimiento acoplado al contenido: es
 * puramente presentacional y degrada con seguridad.
 *
 * A0 es un refactor puro: el mapa, el orden de resolución y el fallback son
 * byte-for-byte los del original. La corrección de casos como
 * `M2.NUMEROS -> percentage` se hará en A1, nunca aquí.
 */
export type UnitMotifKind = 'percentage' | 'algebra' | 'geometry' | 'data' | 'generic';

const CURRICULUM_AREA_MOTIF: Record<string, UnitMotifKind> = {
  NUMEROS: 'percentage',
  PORCENTAJES: 'percentage',
  ALGEBRA: 'algebra',
  FUNCIONES: 'algebra',
  GEOMETRIA: 'geometry',
  DATOS: 'data',
  ESTADISTICA: 'data',
  PROBABILIDAD: 'data',
};

export function resolveUnitMotif(code: string): UnitMotifKind {
  const segments = code.toUpperCase().split(/[.\-_]/);
  for (const segment of segments) {
    const motif = CURRICULUM_AREA_MOTIF[segment];
    if (motif) return motif;
  }
  return 'generic';
}
