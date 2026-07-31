import { z } from 'zod';
import { entityId } from './common';

/**
 * Contratos del dominio ANALYTICS -- ver docs/adr/0006-analytics-foundation.md.
 *
 * Analytics no produce eventos: consume Domain Events ya publicados por otros
 * dominios (hoy AUTH y PRIVACY) a través del Outbox de la plataforma. Este
 * archivo declara SOLO los payloads de los 5 hechos reales que el producto
 * genera hoy -- el catálogo completo del Bloque 19 del Data Model (registro
 * de esquemas, cohortes, experimentos) queda deliberadamente fuera de alcance
 * de Fase 0.
 *
 * `.strict()` en cada payload es la aplicación concreta del principio "solo
 * la información estrictamente necesaria para análisis": cualquier propiedad
 * no declarada (ej. email, nombre) hace fallar la validación en vez de
 * colarse silenciosamente en un evento analítico.
 */

export const ANALYTICS_EVENT_KEYS = [
  'account_registered',
  'account_verified',
  'account_deletion_requested',
  'account_deletion_completed',
  'account_recovered',
] as const;

export type AnalyticsEventKey = (typeof ANALYTICS_EVENT_KEYS)[number];

/** Versión de esquema única hoy -- se incrementa si algún payload cambia de forma incompatible. */
export const ANALYTICS_SCHEMA_VERSION = 'v1' as const;

const accountEventPayload = z.object({ accountId: entityId }).strict();

export const analyticsEventPayloadSchemas: Record<AnalyticsEventKey, typeof accountEventPayload> = {
  account_registered: accountEventPayload,
  account_verified: accountEventPayload,
  account_deletion_requested: accountEventPayload,
  account_deletion_completed: accountEventPayload,
  account_recovered: accountEventPayload,
};

export type AnalyticsAccountEventPayload = z.infer<typeof accountEventPayload>;

export const analyticsEventSummaryItemSchema = z.object({
  eventKey: z.string(),
  count: z.number().int().nonnegative(),
});

export const analyticsEventSummaryResponseSchema = z.object({
  since: z.string().datetime({ offset: true }),
  totalsByEventKey: z.array(analyticsEventSummaryItemSchema),
});

export type AnalyticsEventSummaryResponse = z.infer<typeof analyticsEventSummaryResponseSchema>;
