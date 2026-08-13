import type { AiAssistanceMode } from '@axioma/contracts';

/**
 * Modos de asistencia pedagógica (LEF Bloque VI, Incremento 5, decisión E) --
 * ver `aiAssistanceModeSchema` en `packages/contracts/src/ai.ts` y
 * `apps/backend/src/ai/ai-pedagogy.ts`.
 *
 * El VALOR es SIEMPRE el enum canónico del contrato (`HINT_FIRST`, ...); la
 * etiqueta en español es únicamente presentación. El cliente nunca infiere el
 * modo del texto del estudiante ni inventa un modo intermedio -- solo puede
 * enviar EXACTAMENTE uno de estos cuatro, o ninguno.
 *
 * `null` = SIN selección explícita: el cliente NO envía `requestedMode` y el
 * backend aplica su propia progresión conservadora (nunca `WORKED_SOLUTION`,
 * ver `buildAssistanceInstructionBlock`). Mobile jamás fuerza `HINT_FIRST`
 * por defecto -- forzarlo desde el cliente convertiría una decisión de
 * dominio del servidor en una decisión de UI.
 */
export interface AssistanceModeOption {
  /** `null` = sin selección explícita (ausencia del campo en la petición). */
  value: AiAssistanceMode | null;
  label: string;
  description: string;
}

export const DEFAULT_ASSISTANCE_MODE: AiAssistanceMode | null = null;

export const ASSISTANCE_MODE_OPTIONS: readonly AssistanceModeOption[] = [
  { value: null, label: 'Automático', description: 'El Tutor elige cómo acompañarte.' },
  { value: 'HINT_FIRST', label: 'Pista', description: 'Una pista para que sigas tú.' },
  { value: 'CONCEPTUAL_EXPLANATION', label: 'Explicación', description: 'El concepto explicado.' },
  { value: 'GUIDED_STEPS', label: 'Pasos guiados', description: 'Paso a paso, sin darte el resultado.' },
  { value: 'WORKED_SOLUTION', label: 'Solución completa', description: 'La resolución desarrollada.' },
] as const;

/** Etiqueta en español de un modo YA seleccionado -- nunca al revés (la UI nunca deriva el enum de un texto libre). */
export function describeAssistanceMode(mode: AiAssistanceMode | null): string {
  return ASSISTANCE_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? 'Automático';
}
