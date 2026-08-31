/**
 * DESAFÍOS V1 -- ÚNICA fuente de verdad del contenido editorial de desafíos
 * (Product Lock, "final V1 content block"). 13 plantillas editoriales +
 * generador determinista de definiciones por período. NO es una nueva
 * arquitectura: cada fila generada es una `ChallengeDefinition` normal
 * (§4.8 -- inmutable por fila, un período nuevo = una fila nueva), con la
 * regla de completitud existente `CUMULATIVE_COUNT` y `eligibility_rule`
 * `ALL_ACCOUNTS`. Sin nuevos tipos de objetivo, sin metrica por materia /
 * por corrección / por XP / por LP, sin scheduler.
 *
 * Copia pública en español. El término aprobado es "actividades de
 * estudio": el worker de progresión cuenta eventos de XP `OTORGAMIENTO`
 * válidos dentro de la ventana -- NO respuestas correctas, NI preguntas de
 * una materia, NI monto de XP, NI LP, NI partidas. La copia nunca reclama
 * más precisión que la que el backend realmente mide (§4/§26/§27).
 *
 * Recompensas V1: exclusivamente `XP_BONUS` (10 / 20 / 30 / 100). Nunca
 * COSMETIC, TITLE ni LP (§1/§7).
 */

export type ChallengeV1Kind = 'DAILY' | 'WEEKLY';
export type ChallengeV1Difficulty = 'easy' | 'medium' | 'high';
export type ChallengeV1RewardXp = 10 | 20 | 30 | 100;

export interface ChallengeV1Template {
  /** Identidad editorial estable (Product Lock §3). NUNCA cambia. */
  templateKey: string;
  /** Fragmento kebab-case para `challengeKey` de cada período. */
  slug: string;
  /** Nombre público (es-CL). */
  name: string;
  /** Descripción pública (es-CL) -- métrica honesta: "actividades de estudio". */
  description: string;
  challengeType: ChallengeV1Kind;
  /** `null` para WEEKLY -- la dificultad solo estructura la rotación diaria. */
  difficulty: ChallengeV1Difficulty | null;
  targetValue: number;
  rewardXpBonus: ChallengeV1RewardXp;
  /** V1: siempre `null` (sin tope adicional más allá de `targetValue`). */
  dailyCap: null;
}

/**
 * 13 plantillas: 9 DAILY (3 easy / 3 medium / 3 high) + 4 WEEKLY.
 * Orden fijo -- el gate verifica esta lista tal cual.
 */
export const CHALLENGES_V1_TEMPLATES: readonly ChallengeV1Template[] = [
  // --- DAILY / EASY (recompensa 10 XP) ---
  {
    templateKey: 'daily-easy-primer-impulso',
    slug: 'primer-impulso',
    name: 'Primer impulso',
    description: 'Completa 3 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'easy',
    targetValue: 3,
    rewardXpBonus: 10,
    dailyCap: null,
  },
  {
    templateKey: 'daily-easy-calentamiento',
    slug: 'calentamiento',
    name: 'Calentamiento',
    description: 'Completa 2 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'easy',
    targetValue: 2,
    rewardXpBonus: 10,
    dailyCap: null,
  },
  {
    templateKey: 'daily-easy-primer-paso',
    slug: 'primer-paso',
    name: 'Primer paso',
    description: 'Completa 4 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'easy',
    targetValue: 4,
    rewardXpBonus: 10,
    dailyCap: null,
  },
  // --- DAILY / MEDIUM (recompensa 20 XP) ---
  {
    templateKey: 'daily-medium-ritmo-constante',
    slug: 'ritmo-constante',
    name: 'Ritmo constante',
    description: 'Completa 6 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'medium',
    targetValue: 6,
    rewardXpBonus: 20,
    dailyCap: null,
  },
  {
    templateKey: 'daily-medium-sigue-avanzando',
    slug: 'sigue-avanzando',
    name: 'Sigue avanzando',
    description: 'Completa 5 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'medium',
    targetValue: 5,
    rewardXpBonus: 20,
    dailyCap: null,
  },
  {
    templateKey: 'daily-medium-en-marcha',
    slug: 'en-marcha',
    name: 'En marcha',
    description: 'Completa 7 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'medium',
    targetValue: 7,
    rewardXpBonus: 20,
    dailyCap: null,
  },
  // --- DAILY / HIGH (recompensa 30 XP) ---
  {
    templateKey: 'daily-hard-sesion-completa',
    slug: 'sesion-completa',
    name: 'Sesión completa',
    description: 'Completa 10 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'high',
    targetValue: 10,
    rewardXpBonus: 30,
    dailyCap: null,
  },
  {
    templateKey: 'daily-hard-jornada-productiva',
    slug: 'jornada-productiva',
    name: 'Jornada productiva',
    description: 'Completa 8 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'high',
    targetValue: 8,
    rewardXpBonus: 30,
    dailyCap: null,
  },
  {
    templateKey: 'daily-hard-a-fondo',
    slug: 'a-fondo',
    name: 'A fondo',
    description: 'Completa 12 actividades de estudio hoy.',
    challengeType: 'DAILY',
    difficulty: 'high',
    targetValue: 12,
    rewardXpBonus: 30,
    dailyCap: null,
  },
  // --- WEEKLY (recompensa 100 XP) ---
  {
    templateKey: 'weekly-constancia-semanal',
    slug: 'constancia-semanal',
    name: 'Constancia semanal',
    description: 'Completa 40 actividades de estudio esta semana.',
    challengeType: 'WEEKLY',
    difficulty: null,
    targetValue: 40,
    rewardXpBonus: 100,
    dailyCap: null,
  },
  {
    templateKey: 'weekly-semana-en-marcha',
    slug: 'semana-en-marcha',
    name: 'Semana en marcha',
    description: 'Completa 35 actividades de estudio esta semana.',
    challengeType: 'WEEKLY',
    difficulty: null,
    targetValue: 35,
    rewardXpBonus: 100,
    dailyCap: null,
  },
  {
    templateKey: 'weekly-objetivo-semanal',
    slug: 'objetivo-semanal',
    name: 'Objetivo semanal',
    description: 'Completa 45 actividades de estudio esta semana.',
    challengeType: 'WEEKLY',
    difficulty: null,
    targetValue: 45,
    rewardXpBonus: 100,
    dailyCap: null,
  },
  {
    templateKey: 'weekly-gran-semana',
    slug: 'gran-semana',
    name: 'Gran semana',
    description: 'Completa 50 actividades de estudio esta semana.',
    challengeType: 'WEEKLY',
    difficulty: null,
    targetValue: 50,
    rewardXpBonus: 100,
    dailyCap: null,
  },
] as const;

/** Rotación diaria determinista por dificultad -- `dayIndex % 3` (§11). */
export const DAILY_ROTATION: Record<ChallengeV1Difficulty, readonly string[]> = {
  easy: ['daily-easy-primer-impulso', 'daily-easy-calentamiento', 'daily-easy-primer-paso'],
  medium: ['daily-medium-ritmo-constante', 'daily-medium-sigue-avanzando', 'daily-medium-en-marcha'],
  high: ['daily-hard-sesion-completa', 'daily-hard-jornada-productiva', 'daily-hard-a-fondo'],
};

/** Rotación semanal determinista -- `weekIndex % 4` (§12). */
export const WEEKLY_ROTATION: readonly string[] = [
  'weekly-constancia-semanal',
  'weekly-semana-en-marcha',
  'weekly-objetivo-semanal',
  'weekly-gran-semana',
];

/** Recompensas canónicas -- un bundle `XP_BONUS` por monto (§7). */
export const CHALLENGE_V1_REWARD_BUNDLES: readonly { bundleKey: string; name: string; xpAmount: ChallengeV1RewardXp }[] = [
  { bundleKey: 'challenge-v1-xp-10', name: 'Desafío diario fácil (+10 XP)', xpAmount: 10 },
  { bundleKey: 'challenge-v1-xp-20', name: 'Desafío diario medio (+20 XP)', xpAmount: 20 },
  { bundleKey: 'challenge-v1-xp-30', name: 'Desafío diario difícil (+30 XP)', xpAmount: 30 },
  { bundleKey: 'challenge-v1-xp-100', name: 'Desafío semanal (+100 XP)', xpAmount: 100 },
];

export function rewardBundleKeyForXp(xpAmount: ChallengeV1RewardXp): string {
  return `challenge-v1-xp-${xpAmount}`;
}

// --- Horizonte de aprovisionamiento V1 (§10) ---

/** Fecha canónica de inicio V1 -- 2026-08-30 00:00:00 UTC. */
export const CHALLENGES_V1_START = new Date(Date.UTC(2026, 7, 30));
/** 365 períodos diarios (2026-08-30 .. 2027-08-30, exclusivo). */
export const CHALLENGES_V1_DAILY_PERIODS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const V1_RULE = {
  eligibility: JSON.stringify({ schemaVersion: 'v1', type: 'ALL_ACCOUNTS' }),
  completion: (targetValue: number) => JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue }),
};

export interface GeneratedChallengeV1Definition {
  challengeKey: string;
  templateKey: string;
  name: string;
  description: string;
  challengeType: ChallengeV1Kind;
  eligibilityRule: string;
  completionRule: string;
  targetValue: number;
  rewardBundleKey: string;
  rewardXpBonus: ChallengeV1RewardXp;
  startsAt: Date;
  endsAt: Date;
  dailyCap: null;
}

function templateByKey(templateKey: string): ChallengeV1Template {
  const t = CHALLENGES_V1_TEMPLATES.find((x) => x.templateKey === templateKey);
  if (!t) throw new Error(`DESAFÍOS V1: plantilla desconocida "${templateKey}"`);
  return t;
}

/** `YYYY-MM-DD` de un instante UTC (día calendario). */
export function utcDateSlug(d: Date): string {
  return `${d.getUTCFullYear().toString().padStart(4, '0')}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d
    .getUTCDate()
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Semana ISO-8601 (lunes como primer día, año-semana derivado del jueves).
 * Devuelve `{ isoYear, isoWeek, mondayUtc }`.
 */
export function isoWeekOf(instant: Date): { isoYear: number; isoWeek: number; mondayUtc: Date } {
  const d = new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()));
  const dayIdxMon0 = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - dayIdxMon0 * DAY_MS);
  // Jueves de esa semana define el año-semana ISO.
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayMon0 = (firstThursday.getUTCDay() + 6) % 7;
  const firstMonday = new Date(firstThursday.getTime() - firstThursdayMon0 * DAY_MS);
  const isoWeek = 1 + Math.round((monday.getTime() - firstMonday.getTime()) / WEEK_MS);
  return { isoYear, isoWeek, mondayUtc: monday };
}

export function isoWeekSlug(instant: Date): string {
  const { isoYear, isoWeek } = isoWeekOf(instant);
  return `${isoYear.toString().padStart(4, '0')}-W${isoWeek.toString().padStart(2, '0')}`;
}

/**
 * Genera TODAS las definiciones V1 del horizonte canónico, de forma
 * totalmente determinista (sin `Date.now()`, sin azar, sin rutas locales).
 * Reejecutar produce byte a byte el mismo conjunto.
 *
 * DAILY: 365 períodos × 3 (una easy + una medium + una high por día).
 * WEEKLY: una definición por semana ISO (lunes UTC) que solape el
 *   horizonte diario -- el conteo exacto se deriva del rango, no se
 *   hardcodea.
 */
export function generateChallengeV1Definitions(): GeneratedChallengeV1Definition[] {
  const out: GeneratedChallengeV1Definition[] = [];
  const horizonStart = CHALLENGES_V1_START.getTime();
  const horizonEnd = horizonStart + CHALLENGES_V1_DAILY_PERIODS * DAY_MS;

  // --- DAILY ---
  for (let dayIndex = 0; dayIndex < CHALLENGES_V1_DAILY_PERIODS; dayIndex++) {
    const startsAt = new Date(horizonStart + dayIndex * DAY_MS);
    const endsAt = new Date(startsAt.getTime() + DAY_MS);
    const dateSlug = utcDateSlug(startsAt);
    for (const difficulty of ['easy', 'medium', 'high'] as const) {
      const templateKey = DAILY_ROTATION[difficulty][dayIndex % 3]!;
      const t = templateByKey(templateKey);
      out.push({
        challengeKey: `v1-daily-${t.slug}-${dateSlug}`,
        templateKey,
        name: t.name,
        description: t.description,
        challengeType: 'DAILY',
        eligibilityRule: V1_RULE.eligibility,
        completionRule: V1_RULE.completion(t.targetValue),
        targetValue: t.targetValue,
        rewardBundleKey: rewardBundleKeyForXp(t.rewardXpBonus),
        rewardXpBonus: t.rewardXpBonus,
        startsAt,
        endsAt,
        dailyCap: null,
      });
    }
  }

  // --- WEEKLY --- (lunes UTC de la semana que contiene la fecha de inicio)
  const firstMonday = isoWeekOf(CHALLENGES_V1_START).mondayUtc;
  let weekIndex = 0;
  for (let weekStart = firstMonday.getTime(); weekStart < horizonEnd; weekStart += WEEK_MS, weekIndex++) {
    const startsAt = new Date(weekStart);
    const endsAt = new Date(weekStart + WEEK_MS);
    const templateKey = WEEKLY_ROTATION[weekIndex % 4]!;
    const t = templateByKey(templateKey);
    out.push({
      challengeKey: `v1-weekly-${t.slug}-${isoWeekSlug(startsAt)}`,
      templateKey,
      name: t.name,
      description: t.description,
      challengeType: 'WEEKLY',
      eligibilityRule: V1_RULE.eligibility,
      completionRule: V1_RULE.completion(t.targetValue),
      targetValue: t.targetValue,
      rewardBundleKey: rewardBundleKeyForXp(t.rewardXpBonus),
      rewardXpBonus: t.rewardXpBonus,
      startsAt,
      endsAt,
      dailyCap: null,
    });
  }

  return out;
}

/** Prefijo canónico de toda `challengeKey` V1 -- separa contenido V1 de la deriva de fixtures. */
export const CHALLENGE_V1_KEY_PREFIX = 'v1-';

// --- Sanidad en tiempo de compilación (mismo criterio que cosmetics-v1-catalog) ---
(() => {
  const daily = CHALLENGES_V1_TEMPLATES.filter((t) => t.challengeType === 'DAILY');
  const weekly = CHALLENGES_V1_TEMPLATES.filter((t) => t.challengeType === 'WEEKLY');
  const keys = new Set(CHALLENGES_V1_TEMPLATES.map((t) => t.templateKey));
  if (CHALLENGES_V1_TEMPLATES.length !== 13) throw new Error('DESAFÍOS V1: se esperan 13 plantillas');
  if (daily.length !== 9) throw new Error('DESAFÍOS V1: se esperan 9 plantillas DAILY');
  if (weekly.length !== 4) throw new Error('DESAFÍOS V1: se esperan 4 plantillas WEEKLY');
  if (keys.size !== 13) throw new Error('DESAFÍOS V1: templateKey duplicado');
  for (const d of ['easy', 'medium', 'high'] as const) {
    if (daily.filter((t) => t.difficulty === d).length !== 3) throw new Error(`DESAFÍOS V1: se esperan 3 DAILY "${d}"`);
    if (DAILY_ROTATION[d].length !== 3) throw new Error(`DESAFÍOS V1: ciclo de rotación "${d}" debe tener 3 entradas`);
  }
  if (WEEKLY_ROTATION.length !== 4) throw new Error('DESAFÍOS V1: ciclo semanal debe tener 4 entradas');
  const rewardByDifficulty: Record<string, number> = { easy: 10, medium: 20, high: 30 };
  for (const t of daily) {
    if (t.rewardXpBonus !== rewardByDifficulty[t.difficulty as string]) {
      throw new Error(`DESAFÍOS V1: recompensa incorrecta para "${t.templateKey}"`);
    }
  }
  for (const t of weekly) if (t.rewardXpBonus !== 100) throw new Error(`DESAFÍOS V1: WEEKLY debe recompensar 100 XP`);
})();
