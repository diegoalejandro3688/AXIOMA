import {
  CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION,
  acceptPublicParticipationTermsResponseSchema,
  publicParticipationTermsStatusResponseSchema,
  type PublicParticipationTermsStatusResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * PS-0C.2 -- estado y aceptación de los "Términos de uso y convivencia
 * pública". La aceptación NUNCA bloquea el uso privado de ZETRYND -- sólo el
 * flujo de publicación de identidad pública consulta `isCurrent`.
 */
export function getPublicParticipationTermsStatus(): Promise<ApiResult<PublicParticipationTermsStatusResponse>> {
  return apiRequest('GET', '/me/public-participation-terms', { schema: publicParticipationTermsStatusResponseSchema });
}

/** Acepta EXACTAMENTE la versión vigente (autoridad del backend). */
export function acceptPublicParticipationTerms(): Promise<ApiResult<PublicParticipationTermsStatusResponse>> {
  return apiRequest('POST', '/me/public-participation-terms/accept', {
    body: { version: CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION },
    schema: acceptPublicParticipationTermsResponseSchema,
  });
}
