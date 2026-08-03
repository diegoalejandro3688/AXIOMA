/**
 * Cálculo de racha -- ver docs/adr/BLOCK-II-DEFINITION.md (incremento
 * "Progresión visible"). Deliberadamente SIN persistencia nueva
 * (`streak_definition`/`account_streak`/`streak_day` de Data Model §16.12
 * quedan diferidos, sin protección/freeze -- ver reporte de cierre del
 * incremento): la racha se DERIVA en tiempo de lectura a partir de los días
 * (UTC) con al menos un `xp_ledger_entry` de tipo OTORGAMIENTO. Al no
 * existir proyección persistida, no hay nada que reconciliar ni que pueda
 * divergir -- satisface el Decision Gate de reconstructibilidad por
 * construcción, no por disciplina.
 *
 * Límite de frontera de dominio (Decision Gate 2, Bloque I y II): este
 * módulo NUNCA importa las entidades académicas propias de PROGRESS -- opera
 * exclusivamente sobre `XpLedgerEntry`, ya propiedad de GAMIFICATION.
 *
 * Día calendario: mismo criterio UTC que `utcDayRange` en
 * xp-grant.service.ts (daily_cap) -- una racha que "reinicia" en un
 * momento distinto al del cupo diario sería inconsistente dentro del mismo
 * dominio; se reutiliza deliberadamente la misma convención de frontera de
 * día, no una nueva basada en zona horaria del estudiante.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveLocalDate: string | null;
}

/** "YYYY-MM-DD" en UTC -- mismo componente de fecha que utcDayRange() usa para daily_cap. */
export function utcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function utcDayKeyToEpochDays(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** Diferencia de exactamente un día calendario UTC entre dos claves ordenadas ascendentemente. */
function isConsecutiveDay(previousKey: string, nextKey: string): boolean {
  return utcDayKeyToEpochDays(nextKey) - utcDayKeyToEpochDays(previousKey) === 1;
}

/**
 * `occurredAtDates`: instantes de cada OTORGAMIENTO (no necesita estar
 * ordenado ni deduplicado -- se normaliza aquí). `now`: inyectable para
 * pruebas deterministas, por defecto la hora real.
 *
 * Racha actual: días consecutivos terminando HOY o AYER (gracia de un día
 * para no reiniciar en cuanto pasa la medianoche sin que el estudiante haya
 * estudiado todavía hoy). Cualquier hueco mayor a un día reinicia el conteo
 * a 0, nunca lo hace negativo ni penaliza XP/logros (Data Model §16.14 --
 * diseño no punitivo; este módulo no escribe nada, por construcción no
 * puede violar esa regla).
 */
export function computeStreak(occurredAtDates: Date[], now: Date = new Date()): StreakResult {
  const uniqueDayKeys = Array.from(new Set(occurredAtDates.map(utcDayKey))).sort();

  if (uniqueDayKeys.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveLocalDate: null };
  }

  let longestStreak = 1;
  let runLength = 1;
  for (let i = 1; i < uniqueDayKeys.length; i++) {
    runLength = isConsecutiveDay(uniqueDayKeys[i - 1]!, uniqueDayKeys[i]!) ? runLength + 1 : 1;
    longestStreak = Math.max(longestStreak, runLength);
  }

  const lastActiveLocalDate = uniqueDayKeys[uniqueDayKeys.length - 1]!;
  const todayKey = utcDayKey(now);
  const yesterdayKey = utcDayKey(new Date(now.getTime() - MS_PER_DAY));

  let currentStreak = 0;
  if (lastActiveLocalDate === todayKey || lastActiveLocalDate === yesterdayKey) {
    currentStreak = 1;
    for (let i = uniqueDayKeys.length - 1; i > 0; i--) {
      if (isConsecutiveDay(uniqueDayKeys[i - 1]!, uniqueDayKeys[i]!)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak, lastActiveLocalDate };
}
