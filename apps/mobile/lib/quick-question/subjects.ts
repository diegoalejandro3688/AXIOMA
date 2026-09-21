import { QUICK_QUESTION_SUBJECT_KEYS, type QuickQuestionSubjectKey } from '@axioma/contracts';

/**
 * vc3 (F03, Quick Subject Selector) -- helpers PUROS de la selección de
 * materias. Reutiliza `QUICK_QUESTION_SUBJECT_KEYS` de contracts (misma
 * whitelist que valida el backend, NUNCA un vocabulario propio del móvil).
 *
 * Las etiquetas reproducen `Subject.name` real del catálogo
 * (`apps/backend/prisma/seed.ts`) -- "Lenguaje", NO "Competencia Lectora"
 * (ese es el nombre de un TEMA dentro de Lenguaje, no de la materia; mismo
 * criterio ya documentado en `lib/academic/subject-icon.ts`).
 */
export interface QuickQuestionSubjectOption {
  key: QuickQuestionSubjectKey;
  label: string;
}

export const QUICK_QUESTION_SUBJECT_OPTIONS: readonly QuickQuestionSubjectOption[] = [
  { key: 'matematica', label: 'Matemática M1' },
  { key: 'matematica-m2', label: 'Matemática M2' },
  { key: 'lenguaje', label: 'Lenguaje' },
  { key: 'ciencias', label: 'Ciencias' },
  { key: 'historia', label: 'Historia' },
];

export const QUICK_QUESTION_SUBJECT_MIN_SELECTED = 2;

/** Default para cuentas sin preferencia guardada: las 5 materias. */
export const DEFAULT_QUICK_QUESTION_SUBJECT_KEYS: readonly QuickQuestionSubjectKey[] = QUICK_QUESTION_SUBJECT_KEYS;

/** `true` sólo si son >= 2, todas de la whitelist y sin duplicados -- mismo invariante que valida el backend. */
export function isValidQuickQuestionSubjectSelection(keys: readonly string[]): keys is QuickQuestionSubjectKey[] {
  if (keys.length < QUICK_QUESTION_SUBJECT_MIN_SELECTED || keys.length > QUICK_QUESTION_SUBJECT_KEYS.length) return false;
  if (new Set(keys).size !== keys.length) return false;
  return keys.every((key) => (QUICK_QUESTION_SUBJECT_KEYS as readonly string[]).includes(key));
}

export function quickQuestionSubjectsSummary(keys: readonly string[]): string {
  if (keys.length === QUICK_QUESTION_SUBJECT_KEYS.length) return 'Todas las materias';
  return `${keys.length} materia${keys.length === 1 ? '' : 's'} seleccionada${keys.length === 1 ? '' : 's'}`;
}
