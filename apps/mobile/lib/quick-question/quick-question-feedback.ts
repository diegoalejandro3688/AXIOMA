/**
 * PREGUNTA RÁPIDA -- helpers PUROS del temporizador visual y del feedback
 * post-respuesta (Competir, Incremento 8). Sin React ni React Native, para
 * poder gatearlos con `tsx` puro -- mismo criterio que
 * `lib/challenges/*` y `lib/leaderboard/paginate-leaderboard.ts`.
 *
 * IMPORTANTE (aislamiento para el Incremento 9): TODO aquí es
 * EXCLUSIVAMENTE de presentación local. El límite de 45 s NO tiene
 * autoridad de servidor todavía; el timeout local NO consume la pregunta
 * ni afirma consecuencia de LP alguna. El Incremento 9 reemplaza el
 * countdown local por un `deadline` autoritativo del backend.
 */

/** Límite VISUAL de la pregunta rápida, en segundos. Solo UI en el Incremento 8. */
export const QUICK_QUESTION_TIME_LIMIT_SECONDS = 45;

/** 10..6 s restantes -- mayor atención visual. */
export const QUICK_QUESTION_ATTENTION_THRESHOLD_SECONDS = 10;

/** 5..1 s restantes -- urgencia (coral/rojo controlado). */
export const QUICK_QUESTION_URGENCY_THRESHOLD_SECONDS = 5;

export type TimerLevel = 'normal' | 'attention' | 'urgent' | 'expired';

/**
 * Nivel visual del temporizador según los segundos restantes:
 *  > 10 -> normal (45..11) · 10..6 -> attention · 5..1 -> urgent · <= 0 -> expired.
 */
export function timerLevel(secondsRemaining: number): TimerLevel {
  if (secondsRemaining <= 0) return 'expired';
  if (secondsRemaining <= QUICK_QUESTION_URGENCY_THRESHOLD_SECONDS) return 'urgent';
  if (secondsRemaining <= QUICK_QUESTION_ATTENTION_THRESHOLD_SECONDS) return 'attention';
  return 'normal';
}

/** Segundos restantes a partir de un `deadlineTs` (epoch ms) y un `nowTs` -- nunca negativo. */
export function secondsRemainingUntil(deadlineTs: number, nowTs: number): number {
  return Math.max(0, (deadlineTs - nowTs) / 1000);
}

/** Etiqueta compacta del temporizador -- redondea HACIA ARRIBA (muestra "1 s" hasta el último instante). */
export function formatTimerSeconds(secondsRemaining: number): string {
  return `${Math.max(0, Math.ceil(secondsRemaining))} s`;
}

// --- Feedback post-respuesta ---

export type AnswerVerdict = 'correct' | 'incorrect' | 'timeout';

/** Titular del resultado. `timeout` es SOLO local en el Incremento 8. */
export function answerHeadline(verdict: AnswerVerdict): string {
  switch (verdict) {
    case 'correct':
      return 'Respuesta correcta';
    case 'incorrect':
      return 'Respuesta incorrecta';
    case 'timeout':
      return 'Se acabó el tiempo';
  }
}

export type OptionOutcome = 'correct' | 'incorrect' | 'muted';

/**
 * Estado visual de UNA alternativa después de resolver (respuesta o
 * timeout). La alternativa CORRECTA se resalta SIEMPRE (cuando se conoce);
 * la elegida por el usuario, si no es la correcta, se marca como
 * incorrecta; el resto queda atenuado.
 *
 * `correctAnswerOptionId` sólo se conoce tras `POST /answer` (Incremento 2,
 * gate-protegido). En un timeout local del Incremento 8 es `null` -> NINGUNA
 * alternativa se marca como correcta (no hay clave); todas quedan atenuadas
 * y bloqueadas. El Incremento 9 (autoridad de servidor) podrá revelar la
 * correcta también en el timeout.
 */
export function optionOutcome(
  optionId: string,
  correctAnswerOptionId: string | null,
  selectedOptionId: string | null,
): OptionOutcome {
  if (correctAnswerOptionId !== null && optionId === correctAnswerOptionId) return 'correct';
  if (selectedOptionId !== null && optionId === selectedOptionId) return 'incorrect';
  return 'muted';
}
