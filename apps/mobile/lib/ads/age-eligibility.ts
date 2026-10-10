/**
 * ADS V1 -- PRE-PLAY. Elegibilidad por edad para publicidad (pantalla de edad NEUTRAL).
 *
 * MODULO PURO (sin React, sin React Native, sin red, sin almacenamiento propio):
 * toda la politica vive aqui para poder verificarla de forma determinista.
 *
 * PRIVACIDAD: la fecha de nacimiento EXACTA solo existe como argumento de
 * `evaluateBirthDate` durante una llamada. De ella se deriva UNICAMENTE una de
 * dos etiquetas (`under18` | `adult18plus`); es lo unico que se persiste (solo
 * en el dispositivo, ver `age-store.ts`). Este modulo no importa ningun cliente
 * de API, no persiste, no registra: la fecha jamas sale del dispositivo.
 *
 * FAIL-CLOSED: la edad desconocida (sin respuesta, cargando, error de lectura,
 * valor irreconocible, cuenta distinta) equivale a SIN anuncios y SDK inactivo.
 * Solo `adult18plus` + FREE confirmado permite el flujo de anuncios existente.
 * No se segmenta ni se monetiza a menores de 18 en esta version.
 */
import type { AdsEntitlementInput } from './ads-state';

export type AgeEligibility = 'under18' | 'adult18plus';

/** Lo que el resto de la app ve: ademas de las dos etiquetas, `unknown` (fail-closed). */
export type AgeEligibilityInput = 'unknown' | AgeEligibility;

export const ADULT_AGE_YEARS = 18;
const MIN_PLAUSIBLE_AGE_YEARS = 0;
const MAX_PLAUSIBLE_AGE_YEARS = 120;

export interface BirthDateFields {
  day: string;
  month: string;
  year: string;
}

export type BirthDateEvaluation = { kind: 'ok'; eligibility: AgeEligibility } | { kind: 'invalid' };

/**
 * Deriva la etiqueta de edad a partir de una fecha escrita LIBREMENTE. Valida un
 * dia de calendario real, no futuro y con edad plausible. `now` se inyecta para
 * poder verificarla sin reloj real.
 */
export function evaluateBirthDate(fields: BirthDateFields, now: Date): BirthDateEvaluation {
  const day = fields.day.trim();
  const month = fields.month.trim();
  const year = fields.year.trim();
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return { kind: 'invalid' };

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return { kind: 'invalid' };

  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;
  const nowD = now.getDate();
  if (y > nowY || (y === nowY && (m > nowM || (m === nowM && d > nowD)))) return { kind: 'invalid' };

  let years = nowY - y;
  if (nowM < m || (nowM === m && nowD < d)) years -= 1;
  if (years < MIN_PLAUSIBLE_AGE_YEARS || years > MAX_PLAUSIBLE_AGE_YEARS) return { kind: 'invalid' };

  return { kind: 'ok', eligibility: years >= ADULT_AGE_YEARS ? 'adult18plus' : 'under18' };
}

/** Parseo ESTRICTO del valor persistido: cualquier otra cosa es `unknown`. */
export function parseStoredAgeEligibility(raw: string | null | undefined): AgeEligibilityInput {
  return raw === 'under18' || raw === 'adult18plus' ? raw : 'unknown';
}

/** Clave de almacenamiento POR CUENTA (nunca global por dispositivo). Solo [A-Za-z0-9._-], valido para SecureStore. */
export function ageEligibilityKey(accountId: string): string {
  return `zetrynd.v1.ageEligibility.${accountId.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

/**
 * Entrada de edad etiquetada con la cuenta para la que se resolvio. Una entrada
 * de OTRA cuenta (o sin sesion) se descarta: la elegibilidad de un usuario no
 * puede filtrarse a la sesion siguiente. `value` es una de las dos etiquetas o
 * `unknown` (lectura terminada sin respuesta).
 */
export interface AgeEntry {
  accountId: string | null;
  status: 'idle' | 'loading' | 'resolved';
  value: AgeEligibilityInput;
}

export const AGE_ENTRY_IDLE: AgeEntry = Object.freeze({ accountId: null, status: 'idle', value: 'unknown' } as AgeEntry);

export function scopeAgeToAccount(entry: AgeEntry, accountId: string | null): AgeEligibilityInput {
  if (accountId === null || entry.accountId !== accountId || entry.status !== 'resolved') return 'unknown';
  return entry.value;
}

/**
 * COMPUERTA DE EDAD sobre el entitlement. Devuelve `FREE` UNICAMENTE si el
 * entitlement es FREE y la edad de ESTA cuenta es `adult18plus`. En cualquier
 * otro caso (edad desconocida / menor, o un entitlement no FREE) devuelve un
 * valor NO-FREE: `error` -> el automata de `ads-state.ts` queda en `disabled`,
 * no pide la config remota, no inicializa el SDK y no habilita ningun placement.
 * PREMIUM nunca ve anuncios, sin importar la edad (se conserva `PREMIUM`).
 */
export function gateEntitlementByAge(entitlement: AdsEntitlementInput, age: AgeEligibilityInput): AdsEntitlementInput {
  if (entitlement === 'PREMIUM') return 'PREMIUM';
  if (age !== 'adult18plus') return 'error';
  return entitlement;
}

/**
 * `true` si hay que MOSTRAR la pantalla de edad: FREE confirmado, build con modo
 * de anuncios, cuenta conocida, lectura local terminada SIN respuesta y sin
 * omision en esta sesion. Nunca para PREMIUM (minimizacion: no se pide un dato que
 * no se necesita) ni mientras el entitlement carga.
 */
export function shouldPromptForAge(input: {
  entitlement: AdsEntitlementInput;
  accountId: string | null;
  modeIsOff: boolean;
  age: AgeEligibilityInput;
  ageResolved: boolean;
  skippedThisSession: boolean;
}): boolean {
  return (
    input.entitlement === 'FREE' &&
    input.accountId !== null &&
    !input.modeIsOff &&
    input.ageResolved &&
    input.age === 'unknown' &&
    !input.skippedThisSession
  );
}
