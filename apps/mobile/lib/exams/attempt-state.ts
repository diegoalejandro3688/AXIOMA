/**
 * Lógica pura del estado de un intento de Ensayo -- ENSAYOS-M1-C.
 * RN-free (solo `import type`), testable con `tsx`.
 *
 * El backend es la única autoridad del status y de las selecciones (ADR-0024):
 * este módulo solo deriva vistas (conteos, ruteo, reconciliación de una
 * selección recién guardada) a partir de datos que ya vinieron del servidor.
 */
import type {
  ExamAttemptStatus,
  ExamAttemptQuestion,
  ExamAttemptReviewQuestion,
} from '@axioma/contracts';

/** `questionVersionId -> answerOptionId` seleccionado. */
export type SelectionMap = Record<string, string>;

/** Construye el mapa de selecciones a partir de la entrega de preguntas del backend (fuente de verdad). */
export function selectionsFromQuestions(questions: ExamAttemptQuestion[]): SelectionMap {
  const map: SelectionMap = {};
  for (const q of questions) {
    if (q.selectedAnswerOptionId) map[q.questionVersionId] = q.selectedAnswerOptionId;
  }
  return map;
}

/** Aplica una selección recién confirmada por el backend, sin mutar el original. */
export function withSelection(selections: SelectionMap, questionVersionId: string, answerOptionId: string): SelectionMap {
  return { ...selections, [questionVersionId]: answerOptionId };
}

export interface AttemptCounts {
  total: number;
  answered: number;
  unanswered: number;
}

export function countProgress(questions: { questionVersionId: string }[], selections: SelectionMap): AttemptCounts {
  const total = questions.length;
  const answered = questions.reduce((n, q) => (selections[q.questionVersionId] ? n + 1 : n), 0);
  return { total, answered, unanswered: total - answered };
}

/**
 * A dónde debe llevar la pantalla de intento según el status que devuelve el
 * backend. `ACTIVE` -> seguir respondiendo; `COMPLETED`/`EXPIRED` -> resultado.
 * Nunca se decide localmente que un intento terminó.
 */
export function routeForAttemptStatus(status: ExamAttemptStatus): 'questions' | 'result' {
  return status === 'ACTIVE' ? 'questions' : 'result';
}

export function isTerminal(status: ExamAttemptStatus): boolean {
  return status === 'COMPLETED' || status === 'EXPIRED';
}

/** Estado visual de una alternativa DURANTE el intento -- nunca revela corrección. */
export type LiveOptionState = 'default' | 'selected' | 'submitting';

export function liveOptionState(input: {
  optionId: string;
  selectedOptionId: string | undefined;
  pendingOptionId: string | null;
}): LiveOptionState {
  if (input.pendingOptionId === input.optionId) return 'submitting';
  if (input.selectedOptionId === input.optionId) return 'selected';
  return 'default';
}

/** Estado visual de una alternativa EN LA REVISIÓN -- ahí sí se distingue correcta/incorrecta/elegida. */
export type ReviewOptionState = 'default' | 'correct' | 'incorrect' | 'selected';

export function reviewOptionState(question: ExamAttemptReviewQuestion, optionId: string): ReviewOptionState {
  if (optionId === question.correctAnswerOptionId) return 'correct';
  if (optionId === question.selectedAnswerOptionId) return 'incorrect';
  return 'default';
}

/** Etiqueta de estado por pregunta en el navegador compacto (durante el intento). */
export type NavCellState = 'current' | 'answered' | 'unanswered';

export function navCellState(input: { isCurrent: boolean; isAnswered: boolean }): NavCellState {
  if (input.isCurrent) return 'current';
  return input.isAnswered ? 'answered' : 'unanswered';
}

/** Etiqueta de estado por pregunta en el navegador de la REVISIÓN. */
export type ReviewNavCellState = 'current' | 'correct' | 'incorrect' | 'unanswered';

export function reviewNavCellState(input: { isCurrent: boolean; question: Pick<ExamAttemptReviewQuestion, 'isCorrect' | 'selectedAnswerOptionId'> }): ReviewNavCellState {
  if (input.isCurrent) return 'current';
  if (input.question.selectedAnswerOptionId === null) return 'unanswered';
  return input.question.isCorrect ? 'correct' : 'incorrect';
}

/** Texto del resultado según status -- `COMPLETED` vs `EXPIRED` (nunca "COMPLETED" sintetizado desde EXPIRED). */
export function resultStatusLabel(status: ExamAttemptStatus): string {
  if (status === 'EXPIRED') return 'Tiempo finalizado';
  if (status === 'COMPLETED') return 'Ensayo entregado';
  return 'Ensayo en curso';
}
