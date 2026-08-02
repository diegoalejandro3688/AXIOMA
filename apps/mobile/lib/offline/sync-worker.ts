import { Platform } from 'react-native';
import { getOutboxRepository } from './database';
import { submitResponse, type SubmitResponseOutcome } from '../api/progress';
import type { OutboxOperation, OutboxRepository } from './outbox-repository';

/**
 * Worker mínimo de sincronización -- primer consumidor real de la cola
 * offline de ADR-0011. Ver ADR-0014, punto 5: sin cursores, sin
 * reconciliación bidireccional, sin batches -- drena `listPending()` en
 * orden y despacha por `operationType` (hoy solo existe `submit_response`).
 *
 * Disparadores documentados (ADR-0014): justo después de encolar (este
 * archivo, vía `flushOperation` llamado directamente), `AppState` -> active
 * y montaje de `estudio/[topicId].tsx` (`app/_layout.tsx` y esa pantalla,
 * llamando `syncPendingOperations()`), y el botón "Reintentar" de
 * `ErrorState`. Ningún temporizador ni polling periódico.
 */

interface SubmitResponsePayload {
  curriculumTopicId: string;
  questionVersionId: string;
  answerOptionId: string;
}

/**
 * Intenta sincronizar UNA operación y actualiza su `sync_status` según el
 * resultado. Reutilizado tanto por el intento inmediato tras encolar
 * (`lib/progress/submit-response.ts`) como por el drenado en lote de
 * `syncPendingOperations()` -- una sola implementación, sin duplicar la
 * lógica de qué falla es permanente vs. transitorio.
 */
export async function flushOperation(
  operation: OutboxOperation,
  outbox: OutboxRepository,
): Promise<SubmitResponseOutcome | { kind: 'skipped' }> {
  if (operation.operationType !== 'submit_response') {
    return { kind: 'skipped' }; // ningún otro tipo existe todavía en M1 -- defensivo.
  }

  let payload: SubmitResponsePayload;
  try {
    payload = JSON.parse(operation.payload) as SubmitResponsePayload;
  } catch {
    await outbox.markFailed(operation.id, 'Payload local corrupto (no es JSON válido).');
    return { kind: 'error', message: 'Payload local corrupto.', status: 0 };
  }

  const outcome = await submitResponse(payload.curriculumTopicId, {
    questionVersionId: payload.questionVersionId,
    answerOptionId: payload.answerOptionId,
    operationId: operation.id,
  });

  switch (outcome.kind) {
    case 'ok':
      // Solo pasa a SYNCED tras confirmación real del backend (ADR-0014, punto 5).
      await outbox.markSynced(operation.id);
      break;
    case 'conflict':
      // Fallo permanente: la alternativa local ya no coincide con lo registrado en el servidor.
      await outbox.markFailed(operation.id, 'Conflicto: ya existe una respuesta distinta registrada para esta pregunta.');
      break;
    case 'error':
      if (outcome.status >= 400 && outcome.status < 500) {
        // 4xx (validación, etc.) -- fallo permanente, reintentar no lo resolvería.
        await outbox.markFailed(operation.id, outcome.message);
      }
      // 5xx -- transitorio, se deja PENDING sin tocar sync_status.
      break;
    case 'network':
      // Transitorio -- se deja PENDING para el próximo disparador.
      break;
  }

  return outcome;
}

let syncing = false;

/**
 * Drena todas las operaciones PENDING, en orden. Ver disparadores
 * documentados arriba. No-op en Web -- no hay cola que drenar en ese target
 * (`submitResponseViaOutbox` nunca encola ahí, ver ADR-0014/ADR-0011).
 */
export async function syncPendingOperations(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (syncing) return; // evita ejecuciones superpuestas (mismo criterio que la guarda `busy` de dev-offline-diagnostics.tsx)
  syncing = true;
  try {
    const outbox = await getOutboxRepository();
    const pending = await outbox.listPending();
    for (const operation of pending) {
      await flushOperation(operation, outbox);
    }
  } finally {
    syncing = false;
  }
}
