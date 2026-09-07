import { z } from 'zod';
import { entityId, isoDateTime } from './common';

/**
 * Contratos del bloque PS-0C.2 -- "Minimum Compliance Remediation".
 *
 * Cubre EXCLUSIVAMENTE:
 *  - aceptación VERSIONADA de los "Términos de uso y convivencia pública"
 *    (obligatoria antes de PUBLICAR identidad pública / UGC, nunca para el
 *    uso privado de ZETRYND);
 *  - reporte de una identidad pública (username / perfil público) por otro
 *    usuario -- 3 categorías fijas, SIN texto libre;
 *  - bloqueo / desbloqueo entre cuentas.
 *
 * No expande la superficie UGC (username -> Ranking -> perfil público). No
 * hay bio, posts, comentarios, chat ni uploads.
 */

// --- Términos de uso y convivencia pública -------------------------------------

/**
 * AUTORIDAD ÚNICA de la versión vigente -- forma parte del CONTRATO de
 * producto, NUNCA una variable de entorno. El backend acepta una request de
 * aceptación sólo si `version === CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION`
 * y persiste EXACTAMENTE este valor (nunca el string crudo del cliente).
 *
 * Formato: fecha ISO (YYYY-MM-DD) de la revisión editorial. Subir de versión
 * invalida las aceptaciones anteriores -> el perfil público deja de ser
 * presentable hasta re-aceptar.
 */
export const CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION = '2026-09-06' as const;

export const publicParticipationTermsStatusResponseSchema = z.object({
  currentVersion: z.string(),
  acceptedVersion: z.string().nullable(),
  acceptedAt: isoDateTime.nullable(),
  /** `true` sii `acceptedVersion === currentVersion`. Único predicado que habilita publicar identidad pública. */
  isCurrent: z.boolean(),
});
export type PublicParticipationTermsStatusResponse = z.infer<typeof publicParticipationTermsStatusResponseSchema>;

/**
 * `version` es un guard optimista: el cliente declara qué versión está
 * aceptando. El backend rechaza cualquier valor distinto de la vigente
 * (`PUBLIC_TERMS_VERSION_MISMATCH`) -- nunca acepta una versión antigua o
 * futura enviada por el cliente.
 */
export const acceptPublicParticipationTermsRequestSchema = z
  .object({ version: z.string().min(1).max(32) })
  .strict();
export type AcceptPublicParticipationTermsRequest = z.infer<typeof acceptPublicParticipationTermsRequestSchema>;

export const acceptPublicParticipationTermsResponseSchema = publicParticipationTermsStatusResponseSchema;
export type AcceptPublicParticipationTermsResponse = z.infer<typeof acceptPublicParticipationTermsResponseSchema>;

// --- Reporte de identidad pública --------------------------------------------

/** Subconjunto EXACTO -- 3 categorías, sin taxonomía adicional, sin "cuéntanos más". */
export const publicProfileReportTypeSchema = z.enum(['INAPPROPRIATE_USERNAME', 'IMPERSONATION', 'OTHER_SAFETY']);
export type PublicProfileReportType = z.infer<typeof publicProfileReportTypeSchema>;

export const publicProfileReportStatusSchema = z.enum(['OPEN', 'DISMISSED', 'ACTIONED']);
export type PublicProfileReportStatus = z.infer<typeof publicProfileReportStatusSchema>;

/** SIN `description` -- ningún texto libre del reportante (decisión congelada PS-0C.2 §16). */
export const reportPublicProfileRequestSchema = z.object({ reportType: publicProfileReportTypeSchema }).strict();
export type ReportPublicProfileRequest = z.infer<typeof reportPublicProfileRequestSchema>;

/**
 * Respuesta MÍNIMA: nunca expone el `accountId` del objetivo ni ningún
 * identificador interno correlacionable más allá del propio `reportId`
 * (que pertenece al reportante).
 */
export const reportPublicProfileResponseSchema = z.object({
  reportId: entityId,
  reportType: publicProfileReportTypeSchema,
  status: publicProfileReportStatusSchema,
  createdAt: isoDateTime,
  /** `true` cuando el reporte ya existía (doble toque / reintento) y se devolvió el registro previo. */
  alreadyReported: z.boolean(),
});
export type ReportPublicProfileResponse = z.infer<typeof reportPublicProfileResponseSchema>;

// --- Bloqueo entre cuentas ---------------------------------------------------

export const blockedUserSchema = z.object({
  username: z.string(),
  blockedAt: isoDateTime,
});
export type BlockedUser = z.infer<typeof blockedUserSchema>;

/** Idempotente: `alreadyBlocked` distingue "se creó ahora" de "ya estaba". */
export const blockUserResponseSchema = z.object({
  username: z.string(),
  blockedAt: isoDateTime,
  alreadyBlocked: z.boolean(),
});
export type BlockUserResponse = z.infer<typeof blockUserResponseSchema>;

export const listBlockedUsersResponseSchema = z.object({ blocked: z.array(blockedUserSchema) });
export type ListBlockedUsersResponse = z.infer<typeof listBlockedUsersResponseSchema>;

// --- Códigos de error de dominio (estables, mapeados por el móvil) -----------

export const COMPLIANCE_ERROR_CODES = {
  /** Falta aceptar la versión vigente de los Términos antes de publicar identidad pública. */
  PUBLIC_TERMS_ACCEPTANCE_REQUIRED: 'PUBLIC_TERMS_ACCEPTANCE_REQUIRED',
  /** La `version` enviada a `accept` no es la vigente. */
  PUBLIC_TERMS_VERSION_MISMATCH: 'PUBLIC_TERMS_VERSION_MISMATCH',
  CANNOT_REPORT_SELF: 'CANNOT_REPORT_SELF',
  CANNOT_BLOCK_SELF: 'CANNOT_BLOCK_SELF',
  /** El username objetivo no resuelve a una identidad pública reportable/bloqueable. */
  PUBLIC_PROFILE_NOT_FOUND: 'PUBLIC_PROFILE_NOT_FOUND',
} as const;
export type ComplianceErrorCode = (typeof COMPLIANCE_ERROR_CODES)[keyof typeof COMPLIANCE_ERROR_CODES];
