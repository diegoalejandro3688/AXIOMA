import type { AiResponseReportType } from '@axioma/contracts';

/**
 * Categorías de reporte de una respuesta del Tutor (LEF Bloque VI,
 * Incremento 6; PRD AI-015) -- subconjunto EXACTO de
 * `aiResponseReportTypeSchema`, sin taxonomía propia de mobile.
 *
 * El VALOR enviado al backend es siempre el enum canónico; la etiqueta en
 * español es solo presentación. Reportar NO cambia la respuesta ni crea
 * ningún estado de moderación visible -- el cliente nunca inventa "en
 * revisión"/"resuelto"/"eliminado", solo confirma que el reporte se envió.
 */
export interface ReportCategoryOption {
  value: AiResponseReportType;
  label: string;
}

export const REPORT_CATEGORY_OPTIONS: readonly ReportCategoryOption[] = [
  { value: 'INCORRECT', label: 'Incorrecta' },
  { value: 'CONFUSING', label: 'Confusa' },
  { value: 'TOO_LONG', label: 'Demasiado extensa' },
  { value: 'OFF_TOPIC', label: 'Poco relacionada' },
  { value: 'INAPPROPRIATE', label: 'Inapropiada' },
] as const;

export const REPORT_SENT_MESSAGE = 'Gracias. Recibimos tu reporte.';
