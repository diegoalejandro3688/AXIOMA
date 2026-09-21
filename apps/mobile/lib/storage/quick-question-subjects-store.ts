import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuickQuestionSubjectKey } from '@axioma/contracts';
import { DEFAULT_QUICK_QUESTION_SUBJECT_KEYS, isValidQuickQuestionSubjectSelection } from '../quick-question/subjects';

/**
 * vc3 (F03, Quick Subject Selector) -- persistencia LOCAL de la selección de
 * materias de Pregunta Rápida. Mismo patrón que `lib/storage/local-flags.ts`
 * (ADR-0009: AsyncStorage, claves versionadas, lectura/escritura defensivas
 * con fallback seguro) -- SIN backend, SIN migración, tal como decidido para
 * V1.
 *
 * NAMESPACED POR CUENTA (`accountId`, identidad estable de `useAuth()`,
 * NUNCA username/email/display name): sin esto, dos cuentas en el mismo
 * dispositivo compartirían una única clave global y se mezclarían sus
 * preferencias -- justo lo que este bloque exige evitar. Una cuenta sin
 * preferencia guardada (primera vez, o dato corrupto) cae al default de
 * las 5 materias -- nunca un array vacío ni una materia sola.
 */
function storageKey(accountId: string): string {
  return `axioma.v1.quickSubjects.${accountId}`;
}

export async function getQuickQuestionSubjects(accountId: string): Promise<QuickQuestionSubjectKey[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountId));
    if (raw === null) return [...DEFAULT_QUICK_QUESTION_SUBJECT_KEYS];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string') && isValidQuickQuestionSubjectSelection(parsed)) {
      return parsed;
    }
    // Dato corrupto o de una forma irreconocible -- default seguro, nunca
    // una selección inválida (p. ej. 1 sola materia) silenciosamente activa.
    return [...DEFAULT_QUICK_QUESTION_SUBJECT_KEYS];
  } catch {
    return [...DEFAULT_QUICK_QUESTION_SUBJECT_KEYS];
  }
}

/** Rechaza selecciones inválidas (< 2, > 5, duplicadas, clave desconocida) antes de escribir -- misma validación que el backend, defensa en profundidad local. */
export async function setQuickQuestionSubjects(accountId: string, keys: readonly QuickQuestionSubjectKey[]): Promise<boolean> {
  if (!isValidQuickQuestionSubjectSelection(keys)) return false;
  try {
    await AsyncStorage.setItem(storageKey(accountId), JSON.stringify(keys));
    return true;
  } catch {
    // No bloquea el flujo -- en el peor caso, la selección no sobrevive a
    // esta sesión y se vuelve a ofrecer el default la próxima vez.
    return false;
  }
}
