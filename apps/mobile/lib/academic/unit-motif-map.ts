/**
 * ESTUDIO A1 -- fuente ÚNICA y canónica del mapeo de motivos académicos por
 * Unidad. Núcleo PURO (sin JSX ni `react-native-svg`): tipos + mapa +
 * resolver, verificable en Node aislado (`scripts/verify-unit-motif-gate.ts`).
 * El renderer SVG y el punto de entrada viven en `unit-motif.tsx`, que
 * re-exporta este contrato -- las pantallas importan siempre desde
 * `./unit-motif`, nunca desde aquí directamente.
 *
 * IDENTIDAD CANÓNICA -- el motivo se resuelve por `CurriculumTopic.code`
 * (identificador curricular estable, ej. `M1.NUMEROS`), NUNCA por
 * `topic.name` (texto visible), índice ni nombre de materia.
 *
 * A1 reemplaza el matching AMBIGUO por segmentos de palabra de A0 (que hacía
 * que `M1.NUMEROS` y `M2.NUMEROS` compartieran motivo) por un mapa EXPLÍCITO
 * `UNIT_CODE_MOTIF` con el unit code completo como clave. Cada una de las 17
 * unidades del catálogo V1 tiene su propio motivo; `generic` queda SOLO como
 * degradación segura para un code que no está en el mapa (unidad futura o
 * desconocida).
 *
 * DESCENDIENTES -- un code de Recurso (`M1.NUMEROS.PORCENTAJES`) hereda el
 * motivo de su Unidad recortando segmentos desde el final por prefijo
 * canónico (`M1.NUMEROS.PORCENTAJES` -> `M1.NUMEROS`), nunca buscando la
 * palabra `NUMEROS` suelta. Hoy solo se llama con unit codes, pero la
 * herencia por prefijo lo deja preparado sin reintroducir ambigüedad.
 */
export type UnitMotifKind =
  // Matemática M1 -- APPROVED, geometría SVG intacta desde A0.
  | 'percentage'
  | 'algebra'
  | 'geometry'
  | 'data'
  // Matemática M2 -- motivos propios (mismo color azul que M1; se diferencia
  // por forma, no por color).
  | 'realNumbers'
  | 'functionTransform'
  | 'vectorGeometry'
  | 'distribution'
  // Lenguaje -- habilidades PAES (color violeta).
  | 'locate'
  | 'interpret'
  | 'evaluate'
  // Ciencias -- (color verde).
  | 'cell'
  | 'wave'
  | 'molecule'
  // Historia -- (color ámbar).
  | 'globe'
  | 'citizenship'
  | 'exchange'
  // Fallback seguro -- solo para un unit code fuera del catálogo V1.
  | 'generic';

/**
 * Mapa EXPLÍCITO unit code (canónico, mayúsculas) -> motivo. Estas 17 claves
 * son el catálogo V1 completo (`apps/backend/content/manifest.ts`). No añadir
 * aquí codes de Recurso: los descendientes heredan por prefijo en
 * `resolveUnitMotif`.
 */
const UNIT_CODE_MOTIF: Record<string, UnitMotifKind> = {
  // --- Matemática M1 (sin cambios respecto a A0) ---
  'M1.NUMEROS': 'percentage',
  'M1.ALGEBRA_FUNCIONES': 'algebra',
  'M1.GEOMETRIA': 'geometry',
  'M1.PROBABILIDAD_ESTADISTICA': 'data',
  // --- Matemática M2 (nuevos) ---
  'M2.NUMEROS': 'realNumbers',
  'M2.ALGEBRA_FUNCIONES': 'functionTransform',
  'M2.GEOMETRIA': 'vectorGeometry',
  'M2.PROBABILIDAD_ESTADISTICA': 'distribution',
  // --- Lenguaje (nuevos) ---
  'LENGUAJE.LOCALIZAR': 'locate',
  'LENGUAJE.INTERPRETAR': 'interpret',
  'LENGUAJE.EVALUAR': 'evaluate',
  // --- Ciencias (nuevos) ---
  'CIENCIAS.BIOLOGIA': 'cell',
  'CIENCIAS.FISICA': 'wave',
  'CIENCIAS.QUIMICA': 'molecule',
  // --- Historia (nuevos) ---
  'HISTORIA.MUNDO_AMERICA_CHILE': 'globe',
  'HISTORIA.FORMACION_CIUDADANA': 'citizenship',
  'HISTORIA.SISTEMA_ECONOMICO': 'exchange',
};

/**
 * Resuelve el motivo de una Unidad a partir de su `CurriculumTopic.code`.
 *
 *  1. normaliza a mayúsculas (case-insensitive, propiedad conservada de A0);
 *  2. match EXACTO contra `UNIT_CODE_MOTIF`;
 *  3. si no hay match y el code tiene sub-segmentos, recorta el último
 *     segmento y reintenta (herencia por prefijo canónico: un Recurso hereda
 *     el motivo de su Unidad);
 *  4. sin match a ningún nivel -> `generic`.
 *
 * NO hay matching por palabra suelta: `X.NUMEROS` (code inventado) NO
 * resuelve a `realNumbers`/`percentage`, cae en `generic`.
 */
export function resolveUnitMotif(code: string): UnitMotifKind {
  let key = code.toUpperCase();
  while (key.length > 0) {
    const motif = UNIT_CODE_MOTIF[key];
    if (motif) return motif;
    const lastDot = key.lastIndexOf('.');
    if (lastDot === -1) break;
    key = key.slice(0, lastDot);
  }
  return 'generic';
}
