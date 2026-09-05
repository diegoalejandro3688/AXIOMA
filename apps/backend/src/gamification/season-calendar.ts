/**
 * PF2-B -- calendario canónico de temporadas competitivas V1.
 *
 * DECISIÓN DE PRODUCTO CONGELADA:
 *   - cadencia semanal
 *   - una temporada = lunes 00:00 hora local `America/Santiago` -> el
 *     siguiente lunes 00:00 hora local `America/Santiago`
 *   - `seasonKey = comp-v1-{YYYY-MM-DD}` donde `YYYY-MM-DD` es la fecha
 *     LOCAL (Santiago) del lunes que inicia la temporada
 *   - continuidad EXACTA: `ventana[n].endsAt === ventana[n+1].startsAt`
 *
 * DST: Chile tiene horario de verano (UTC-3 / UTC-4). Cada frontera se deriva
 * INDEPENDIENTEMENTE de la frontera de calendario LOCAL usando la base tzdata
 * de ICU vía `Intl.DateTimeFormat` -- NUNCA con un offset fijo ni con
 * `inicio + 7*24h`. Una semana que cruza un cambio de DST puede durar 167,
 * 168 o 169 horas; el invariante es LOCAL (lunes 00:00 -> lunes 00:00), no
 * `604800000 ms`.
 *
 * Módulo PURO: sin acceso a BD, sin inyección Nest, sin efectos.
 */

/** Zona canónica -- ver `SEASON_TIME_ZONE` en `competitive-v1-config.ts` (misma cadena). */
const SANTIAGO = 'America/Santiago';

/** Prefijo de `seasonKey` -- ver `SEASON_KEY_PREFIX` en `competitive-v1-config.ts`. */
const KEY_PREFIX = 'comp-v1';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CanonicalSeasonWindow {
  /** `comp-v1-{YYYY-MM-DD local Santiago del lunes de inicio}`. */
  readonly seasonKey: string;
  /** Instante UTC del lunes 00:00 local Santiago que inicia la temporada. */
  readonly startsAt: Date;
  /** Instante UTC del siguiente lunes 00:00 local Santiago (== `startsAt` de la temporada siguiente). */
  readonly endsAt: Date;
  /** Fecha local Santiago del lunes de inicio (`YYYY-MM-DD`) -- misma que va en `seasonKey`. */
  readonly localStartDate: string;
}

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const _fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: SANTIAGO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function localPartsOf(instant: Date): LocalParts {
  const p = Object.fromEntries(_fmt.formatToParts(instant).map((x) => [x.type, x.value])) as Record<string, string>;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/**
 * Offset (ms) tal que `reloj_local = instante_utc + offset`. Para Santiago es
 * negativo (UTC-3h / UTC-4h). Derivado de tzdata ICU en `at`.
 */
function tzOffsetMs(at: Date): number {
  const l = localPartsOf(at);
  const asIfUtc = Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second);
  return asIfUtc - at.getTime();
}

/**
 * Convierte un reloj de pared LOCAL Santiago (Y-M-D h:m:s) al instante UTC
 * correspondiente. Dos pasadas: la primera estima el offset tratando el reloj
 * local como si fuera UTC; la segunda lo corrige si ese instante cae al otro
 * lado de un salto de DST. (Lunes 00:00 en Chile nunca es un instante de
 * transición -- los cambios ocurren en domingo --, pero la segunda pasada es
 * seguro barato.)
 */
function zonedWallClockToUtc(y: number, month1: number, d: number, h = 0, mi = 0, s = 0): Date {
  const asIfUtc = Date.UTC(y, month1 - 1, d, h, mi, s);
  const guess = new Date(asIfUtc - tzOffsetMs(new Date(asIfUtc)));
  const refinedOffset = tzOffsetMs(guess);
  return new Date(asIfUtc - refinedOffset);
}

/** Día de la semana ISO (1 = lunes ... 7 = domingo) de una fecha de calendario. */
function isoWeekday(y: number, month1: number, d: number): number {
  return ((new Date(Date.UTC(y, month1 - 1, d)).getUTCDay() + 6) % 7) + 1;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** `YYYY-MM-DD` de una fecha de calendario. */
function localDateSlug(y: number, month1: number, d: number): string {
  return `${y.toString().padStart(4, '0')}-${pad2(month1)}-${pad2(d)}`;
}

/**
 * Instante UTC del lunes 00:00 local Santiago de la semana que CONTIENE
 * `instant`. Determinista: sólo depende de la fecha de calendario local.
 */
export function canonicalWeekStart(instant: Date): Date {
  const l = localPartsOf(instant);
  const daysFromMonday = isoWeekday(l.year, l.month, l.day) - 1; // 0..6
  // Fecha de calendario del lunes -- aritmética de días de calendario (sin DST:
  // restar días a una fecha "medianoche UTC" nunca cruza un cambio de zona
  // porque no lleva hora local todavía).
  const mondayCal = new Date(Date.UTC(l.year, l.month - 1, l.day) - daysFromMonday * DAY_MS);
  return zonedWallClockToUtc(mondayCal.getUTCFullYear(), mondayCal.getUTCMonth() + 1, mondayCal.getUTCDate());
}

/**
 * Instante UTC del lunes 00:00 local Santiago SIGUIENTE a `weekStart` (que
 * debe ser un lunes 00:00 local, p.ej. la salida de `canonicalWeekStart`).
 * Deriva +7 días de CALENDARIO local y re-zonifica -- así una semana con
 * cambio de DST dura 167/168/169 h según corresponda.
 */
export function canonicalNextWeekStart(weekStart: Date): Date {
  const l = localPartsOf(weekStart);
  const plus7 = new Date(Date.UTC(l.year, l.month - 1, l.day) + 7 * DAY_MS);
  return zonedWallClockToUtc(plus7.getUTCFullYear(), plus7.getUTCMonth() + 1, plus7.getUTCDate());
}

/** `comp-v1-{fecha local Santiago del lunes de inicio}`. */
export function seasonKeyForWeekStart(weekStart: Date): string {
  const l = localPartsOf(weekStart);
  return `${KEY_PREFIX}-${localDateSlug(l.year, l.month, l.day)}`;
}

/**
 * Ventana canónica de UNA semana (la que contiene `instant`).
 */
export function canonicalWindowContaining(instant: Date): CanonicalSeasonWindow {
  const startsAt = canonicalWeekStart(instant);
  const endsAt = canonicalNextWeekStart(startsAt);
  const l = localPartsOf(startsAt);
  return {
    seasonKey: seasonKeyForWeekStart(startsAt),
    startsAt,
    endsAt,
    localStartDate: localDateSlug(l.year, l.month, l.day),
  };
}

/**
 * Horizonte canónico: la semana actual (`week 0`) + `futureWeeks` semanas
 * futuras, en orden. Ventanas EXACTAMENTE contiguas
 * (`resultado[i].endsAt === resultado[i+1].startsAt`), sin huecos, sin
 * solapamientos. Determinista para llamadas repetidas con el mismo `now`.
 */
export function canonicalHorizon(now: Date, futureWeeks: number): CanonicalSeasonWindow[] {
  if (!Number.isInteger(futureWeeks) || futureWeeks < 0) {
    throw new Error(`canonicalHorizon: futureWeeks debe ser un entero >= 0 (recibido ${futureWeeks}).`);
  }
  const windows: CanonicalSeasonWindow[] = [];
  let start = canonicalWeekStart(now);
  for (let i = 0; i <= futureWeeks; i++) {
    const end = canonicalNextWeekStart(start);
    const l = localPartsOf(start);
    windows.push({
      seasonKey: seasonKeyForWeekStart(start),
      startsAt: start,
      endsAt: end,
      localStartDate: localDateSlug(l.year, l.month, l.day),
    });
    start = end;
  }
  return windows;
}

/** Sólo para tests/diagnóstico -- offset de Santiago (horas) en un instante. */
export function _santiagoOffsetHours(at: Date): number {
  return tzOffsetMs(at) / (60 * 60 * 1000);
}
