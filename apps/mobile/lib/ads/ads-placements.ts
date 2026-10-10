import type { AdsPlacement } from './ads-state';

/**
 * ADS V1 -- ADS-1C. Politica PURA de los banners (sin React, sin el SDK).
 *
 * Un banner solo se monta cuando se cumplen TODAS estas condiciones:
 *   - `useAds().isPlacementEnabled(<placement>)` -- que ya implica FREE
 *     confirmado + fase `ready` + SDK listo + `adsEnabled` maestro + el flag
 *     INDIVIDUAL de ese placement (ver `ads-state.ts`);
 *   - el resolver devolvio un id de unidad valido para el modo de build;
 *   - la pantalla esta ENFOCADA (una pestana/pantalla en segundo plano no
 *     solicita ni deja una vista nativa viva);
 *   - el anuncio no fallo (un fallo degrada limpio: se oculta y no deja bloque).
 * Todo lo demas => NO se renderiza nada (ni placeholder).
 *
 * Los tres slots son independientes: el flag de uno nunca habilita otro.
 */
export type BannerSlot = 'home' | 'study' | 'compete';

export const BANNER_SLOT_PLACEMENT: Readonly<Record<BannerSlot, AdsPlacement>> = Object.freeze({
  home: 'bannerHome',
  study: 'bannerStudy',
  compete: 'bannerCompete',
});

export type BannerHiddenReason = 'ineligible' | 'no-unit-id' | 'unfocused' | 'load-failed';

export type BannerDecision = { render: true } | { render: false; reason: BannerHiddenReason };

export interface BannerDecisionInput {
  /** `useAds().isPlacementEnabled(placement)` para el placement de ESTE slot. */
  placementEnabled: boolean;
  /** Resultado del resolver (`resolveAdUnitId`) para ESTE placement. */
  unitId: string | null;
  focused: boolean;
  failed: boolean;
}

export function decideBanner(input: BannerDecisionInput): BannerDecision {
  if (!input.placementEnabled) return { render: false, reason: 'ineligible' };
  if (input.unitId === null || input.unitId.length === 0) return { render: false, reason: 'no-unit-id' };
  if (!input.focused) return { render: false, reason: 'unfocused' };
  if (input.failed) return { render: false, reason: 'load-failed' };
  return { render: true };
}
