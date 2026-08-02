import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { getOutboxRepository } from '../offline/database';
import { flushOperation } from '../offline/sync-worker';
import { submitResponse, type SubmitResponseOutcome } from '../api/progress';

export interface EnqueueResponseInput {
  curriculumTopicId: string;
  questionVersionId: string;
  answerOptionId: string;
}

/**
 * Punto de entrada único para responder una pregunta -- ver ADR-0014, punto
 * 5. SIEMPRE encola primero (el `id` que genera el repositorio es el
 * `operationId`, estable en reintentos -- ADR-0011), luego intenta un envío
 * directo. Si hay red y el backend confirma, la UI recibe el resultado real
 * (`isCorrect`, etc.) sin percibir latencia de cola; si falla, la operación
 * queda `PENDING` y el resultado que se devuelve refleja eso (la UI muestra
 * "guardado, pendiente de sincronizar", nunca inventa un `isCorrect`).
 *
 * En Web se omite la cola por completo: el soporte de `expo-sqlite` en ese
 * target es alpha y las operaciones de escritura no completan (limitación
 * ya documentada y aceptada en ADR-0011 -- "el pedido del worker... quedó
 * pendiente sin completar"; Web es plataforma complementaria, no el
 * objetivo de producto). Se envía directo, sin cola local -- Web nunca
 * queda en estado "pendiente de sincronizar", solo éxito o error.
 */
export async function submitResponseViaOutbox(
  input: EnqueueResponseInput,
): Promise<SubmitResponseOutcome | { kind: 'skipped' }> {
  if (Platform.OS === 'web') {
    return submitResponse(input.curriculumTopicId, {
      questionVersionId: input.questionVersionId,
      answerOptionId: input.answerOptionId,
      operationId: randomUUID(),
    });
  }

  const outbox = await getOutboxRepository();
  const { id } = await outbox.enqueue({
    operationType: 'submit_response',
    aggregateType: 'question_version',
    aggregateId: input.questionVersionId,
    payload: input,
  });

  const operation = await outbox.getById(id);
  if (!operation) {
    // No debería ocurrir (se acaba de insertar) -- defensivo.
    return { kind: 'network', message: 'No se pudo leer la operación recién encolada.' };
  }

  return flushOperation(operation, outbox);
}
