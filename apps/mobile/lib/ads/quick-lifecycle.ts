/**
 * ADS V1 -- ADS-1C.1. Clasificacion EXHAUSTIVA de los estados de la pantalla de
 * Pregunta rapida (Quick) segun el contrato del intersticial:
 *
 *   Con Quick ACTIVO -- incluida la pantalla de RESULTADO de cada pregunta, desde
 *   la que el usuario aun puede pulsar "Siguiente pregunta" -- NO se crea, NO se
 *   solicita y NO se carga ningun intersticial. Solo una sesion de Quick
 *   realmente CERRADA habilita la ventana de carga.
 *
 * Hecho arquitectonico (auditado en ADS-1C.1): una sesion de Quick solo se cierra
 * en el servidor mediante la llamada explicita a `close` (ver
 * `gamification/quick-question.service.ts`; sin cierre automatico ni expiracion).
 * El cliente solo observa el cierre como `session_closed` (HTTP 409 de una sesion
 * ya cerrada, p. ej. cerrada desde otro dispositivo). En el flujo normal el
 * usuario NO pasa por ningun estado terminal antes de pulsar "Volver a Competir",
 * por lo que la ventana de carga solo se abre en `session_closed`. Habilitar el
 * intersticial en el flujo normal exige un cambio de producto (ver reporte).
 *
 * `QUICK_STATUS_CLASS` es un `Record` sobre la union completa: si la pantalla
 * agrega un estado nuevo, TypeScript falla hasta que se clasifique aqui de forma
 * explicita (y el gate lo verifica contra el codigo fuente).
 */
export type QuickScreenStatus =
  | 'initializing'
  | 'error'
  | 'session_closed'
  | 'no_questions'
  | 'question'
  | 'resolving_timeout'
  | 'result';

export type QuickStatusClass =
  /** Quick no ha empezado a presentar preguntas (o fallo al abrir): nada que cargar. */
  | 'not-started'
  /** Sesion abierta: puede haber una pregunta, un resultado o nada pendiente, pero el usuario puede continuar. */
  | 'active'
  /** Sesion permanentemente CERRADA: unico estado que habilita la carga. */
  | 'terminal';

export const QUICK_STATUS_CLASS: Readonly<Record<QuickScreenStatus, QuickStatusClass>> = Object.freeze({
  initializing: 'not-started',
  error: 'not-started',
  session_closed: 'terminal',
  no_questions: 'active',
  question: 'active',
  resolving_timeout: 'active',
  result: 'active',
});

/** `true` UNICAMENTE si la sesion de Quick esta realmente cerrada. */
export function isQuickSessionTerminal(status: QuickScreenStatus): boolean {
  return QUICK_STATUS_CLASS[status] === 'terminal';
}
