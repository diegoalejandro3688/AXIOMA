/**
 * ADS V1 -- ADS-1C. Politica PURA del intersticial de salida de Quick.
 *
 * UNICA oportunidad: el usuario ya esta en la pantalla de RESULTADOS de Quick
 * y pulsa "Volver a Competir". Nunca al iniciar Quick, ni entre preguntas, ni
 * con el temporizador activo, ni al pasar a segundo plano.
 *
 * Solo se usan los valores canonicos del servidor (`interstitialCooldownMinutes`,
 * `interstitialMaxPerSession`); no se inventan reglas de edad de cuenta, tope
 * diario ni umbral de preguntas.
 *
 * "SESION" = la vida del proceso de la app (memoria del runtime JS): el contador
 * y el cooldown se reinician cuando el proceso muere o el JS se recarga. NO se
 * reinician al cambiar de cuenta (evita esquivar el tope alternando cuentas).
 * Solo un intersticial REALMENTE MOSTRADO cuenta.
 */
export interface InterstitialSessionState {
  shownCount: number;
  lastShownAtMs: number | null;
}

export const INITIAL_INTERSTITIAL_SESSION: InterstitialSessionState = Object.freeze({ shownCount: 0, lastShownAtMs: null });

export interface InterstitialLimits {
  cooldownMinutes: number;
  maxPerSession: number;
}

export type InterstitialBlockReason = 'session-cap' | 'cooldown';
export type LoadBlockReason = 'quick-active' | 'not-eligible' | InterstitialBlockReason;
export type ExitSkipReason = 'not-eligible' | InterstitialBlockReason | 'not-loaded';

/** Tope por sesion / cooldown. `maxPerSession <= 0` => bloqueado (el servidor emite 0 con el intersticial apagado). */
export function frequencyBlock(
  session: InterstitialSessionState,
  limits: InterstitialLimits,
  nowMs: number,
): InterstitialBlockReason | null {
  if (limits.maxPerSession <= 0 || session.shownCount >= limits.maxPerSession) return 'session-cap';
  if (session.lastShownAtMs !== null && limits.cooldownMinutes > 0) {
    if (nowMs - session.lastShownAtMs < limits.cooldownMinutes * 60_000) return 'cooldown';
  }
  return null;
}

export interface LoadDecisionInput {
  /** `true` solo con la pantalla de resultados de Quick visible (nunca con Quick activo). */
  quickEnded: boolean;
  eligible: boolean;
  unitId: string | null;
  session: InterstitialSessionState;
  limits: InterstitialLimits;
  nowMs: number;
}

export function decideLoad(input: LoadDecisionInput): { ok: true } | { ok: false; reason: LoadBlockReason } {
  if (!input.quickEnded) return { ok: false, reason: 'quick-active' };
  if (!input.eligible || input.unitId === null) return { ok: false, reason: 'not-eligible' };
  const block = frequencyBlock(input.session, input.limits, input.nowMs);
  return block ? { ok: false, reason: block } : { ok: true };
}

export interface ExitDecisionInput {
  /** Elegibilidad ACTUAL, leida en el instante de la pulsacion (nunca la de cuando se cargo el anuncio). */
  eligibleNow: boolean;
  loaded: boolean;
  session: InterstitialSessionState;
  limits: InterstitialLimits;
  nowMs: number;
}

export function decideExit(input: ExitDecisionInput): { action: 'show' } | { action: 'skip'; reason: ExitSkipReason } {
  if (!input.eligibleNow) return { action: 'skip', reason: 'not-eligible' };
  const block = frequencyBlock(input.session, input.limits, input.nowMs);
  if (block) return { action: 'skip', reason: block };
  if (!input.loaded) return { action: 'skip', reason: 'not-loaded' };
  return { action: 'show' };
}

export function recordShow(session: InterstitialSessionState, nowMs: number): InterstitialSessionState {
  return { shownCount: session.shownCount + 1, lastShownAtMs: nowMs };
}
