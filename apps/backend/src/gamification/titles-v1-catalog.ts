/**
 * TITLES-V1 -- FUENTE DE VERDAD ÚNICA y CONGELADA del catálogo de 7 títulos
 * de prestigio (decisión PO, 2026-09-05). Exactamente 7 -- ni más ni menos.
 * Sin rareza, sin ventaja Premium, sin efecto XP/LP. Capa de prestigio de
 * perfil, independiente de los 4 slots de equipo cosmético.
 *
 * Reutiliza EXCLUSIVAMENTE la infraestructura ya existente
 * (`TitleDefinition`/`AccountTitle`/`EquippedTitle`, `AccountTitleRepository`)
 * -- este archivo es DATA ESTÁTICA, no introduce una entidad DB nueva.
 */

export type TitleV1Metric = 'RESOURCES_COMPLETED' | 'UNITS_COMPLETED' | 'EXAMS_COMPLETED' | 'CHALLENGES_CLAIMED' | 'LEVEL_REACHED' | 'LEAGUE_TIER_REACHED';

export interface TitleV1Entry {
  /** Identidad editorial estable -- NUNCA cambia. */
  titleKey: string;
  displayText: string;
  /** Copia pública mostrada mientras el título está bloqueado. */
  lockedRequirementCopy: string;
  metric: TitleV1Metric;
  /** Umbral del `metric` (número de recursos/unidades/exámenes/desafíos/nivel/tierOrder). */
  threshold: number;
}

/**
 * Orden fijo -- el gate verifica esta lista tal cual. Requisitos y montos
 * PO-aprobados y CONGELADOS -- cambiar cualquiera de estos 7 valores es una
 * decisión de producto posterior, no de este incremento.
 */
export const TITLES_V1: readonly TitleV1Entry[] = [
  {
    titleKey: 'title-v1-constancia-de-hierro',
    displayText: 'Constancia de Hierro',
    lockedRequirementCopy: 'Completa 25 recursos distintos.',
    metric: 'RESOURCES_COMPLETED',
    threshold: 25,
  },
  {
    titleKey: 'title-v1-erudito',
    displayText: 'Erudito',
    lockedRequirementCopy: 'Completa 8 unidades distintas.',
    metric: 'UNITS_COMPLETED',
    threshold: 8,
  },
  {
    titleKey: 'title-v1-simulador-de-elite',
    displayText: 'Simulador de Élite',
    lockedRequirementCopy: 'Completa los 5 ensayos canónicos.',
    metric: 'EXAMS_COMPLETED',
    threshold: 5,
  },
  {
    titleKey: 'title-v1-desafiante',
    displayText: 'Desafiante',
    lockedRequirementCopy: 'Reclama 30 desafíos distintos.',
    metric: 'CHALLENGES_CLAIMED',
    threshold: 30,
  },
  {
    titleKey: 'title-v1-veterano',
    displayText: 'Veterano',
    lockedRequirementCopy: 'Alcanza el nivel 35.',
    metric: 'LEVEL_REACHED',
    threshold: 35,
  },
  {
    titleKey: 'title-v1-ascendente',
    displayText: 'Ascendente',
    lockedRequirementCopy: 'Alcanza la Liga Diamante.',
    metric: 'LEAGUE_TIER_REACHED',
    /** `tierOrder` de Diamante en LEAGUE_V1 (cosmetics-v1-catalog.ts) -- 5. */
    threshold: 5,
  },
  {
    titleKey: 'title-v1-polimata',
    displayText: 'Polímata',
    lockedRequirementCopy: 'Completa las 17 unidades de ZETRYND V1.',
    metric: 'UNITS_COMPLETED',
    threshold: 17,
  },
] as const;

// --- Sanidad en tiempo de compilación ---
(() => {
  if (TITLES_V1.length !== 7) throw new Error('TITLES-V1: se esperan exactamente 7 títulos');
  const keys = new Set(TITLES_V1.map((t) => t.titleKey));
  if (keys.size !== 7) throw new Error('TITLES-V1: titleKey duplicado');
})();
