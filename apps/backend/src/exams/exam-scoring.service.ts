import { Injectable } from '@nestjs/common';
import type { ExamAttemptScore } from '@axioma/contracts';

/**
 * Cálculo de puntaje de un intento de ensayo -- V1, SOLO conteo global
 * (ADR-0024, §scoring). Server-side siempre: nunca confía en conteos enviados
 * por el cliente.
 *
 * NO implementa puntaje PAES ni conversión raw->scaled ni percentiles -- no
 * existe una tabla oficial de transformación en el producto (reconocido como
 * gap, nunca fabricado). El desglose por eje queda `DEFERRED TO ENSAYOS-M1-A
 * METADATA` -- la arquitectura aún no puede clasificar cada pregunta por eje
 * de forma robusta sin metadata dedicada de Ensayos.
 *
 * Denominador de `accuracyPercentage`: `correct / totalQuestions` (NO
 * `correct / answered`). Decisión de producto explícita: en una simulación
 * las preguntas sin responder deben penalizar el resultado global.
 */
@Injectable()
export class ExamScoringService {
  score(input: { totalQuestions: number; answersCorrect: number; answersTotal: number }): ExamAttemptScore {
    const totalQuestions = input.totalQuestions;
    const answered = input.answersTotal;
    const correct = input.answersCorrect;
    const incorrect = answered - correct;
    const unanswered = totalQuestions - answered;

    const accuracyPercentage =
      totalQuestions === 0 ? null : Math.round((correct / totalQuestions) * 100 * 10) / 10;

    return { totalQuestions, answered, correct, incorrect, unanswered, accuracyPercentage };
  }
}
