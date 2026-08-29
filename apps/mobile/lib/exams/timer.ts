/**
 * Lógica pura del temporizador de Ensayos -- ENSAYOS-M1-C.
 *
 * El timer del cliente NUNCA es autoridad (ADR-0024): el backend entrega
 * `expiresAt` y `serverTime` en cada lectura de estado del intento, y este
 * módulo deriva el countdown visible calibrando el reloj local contra el del
 * servidor. RN-free a propósito (solo aritmética de fechas) para poder
 * probarlo con `tsx` puro, mismo criterio que `lib/quick-question/outcomes.ts`.
 */

/**
 * Calibración capturada UNA vez, en el momento en que llega una respuesta de
 * estado del intento. `skewMs` es cuánto adelanta/atrasa el reloj local
 * respecto del servidor; `expiresAtMs` es el instante de expiración absoluto
 * (server-authoritative). El countdown se recalcula a partir de `Date.now()`
 * local + `skewMs`, así sobrevive a rerenders, navegación y background sin
 * "reiniciarse" -- no se guarda una duración, se guarda un instante.
 */
export interface TimerCalibration {
  expiresAtMs: number;
  /** `serverNow - clientNow` en el momento de la lectura. */
  skewMs: number;
}

export function calibrateTimer(input: { expiresAt: string; serverTime: string }, clientNow: number = Date.now()): TimerCalibration {
  const serverNowMs = Date.parse(input.serverTime);
  return {
    expiresAtMs: Date.parse(input.expiresAt),
    skewMs: serverNowMs - clientNow,
  };
}

/** Milisegundos restantes según el reloj calibrado. Nunca negativo. */
export function remainingMs(calibration: TimerCalibration, clientNow: number = Date.now()): number {
  const serverNowEstimate = clientNow + calibration.skewMs;
  return Math.max(0, calibration.expiresAtMs - serverNowEstimate);
}

/** `true` cuando el reloj calibrado ya pasó la expiración -- señal para REFETCHear el estado, nunca para asumir EXPIRED localmente. */
export function isExpiredByClock(calibration: TimerCalibration, clientNow: number = Date.now()): boolean {
  return remainingMs(calibration, clientNow) <= 0;
}

/** `HH:MM:SS`. Redondea hacia arriba el segundo en curso (2h20m00s001 -> "02:20:01" nunca "02:19:59"). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Duración legible para el listado/intro: 8400 -> "2 h 20 min". */
export function formatDuration(durationSeconds: number): string {
  const totalMinutes = Math.round(durationSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
