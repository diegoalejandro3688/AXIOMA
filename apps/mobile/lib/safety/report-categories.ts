import type { PublicProfileReportType } from '@axioma/contracts';

/**
 * PS-0C.2 -- 3 categorías fijas para reportar una identidad pública. El
 * VALOR enviado al backend es el enum canónico; la etiqueta es sólo
 * presentación. SIN texto libre, sin "cuéntanos más".
 */
export interface ReportCategoryOption {
  value: PublicProfileReportType;
  label: string;
}

export const PUBLIC_PROFILE_REPORT_OPTIONS: readonly ReportCategoryOption[] = [
  { value: 'INAPPROPRIATE_USERNAME', label: 'Nombre de usuario inapropiado' },
  { value: 'IMPERSONATION', label: 'Suplantación de identidad' },
  { value: 'OTHER_SAFETY', label: 'Otro problema de seguridad' },
] as const;

export const REPORT_SENT_MESSAGE = 'Gracias. Recibimos tu reporte.';
