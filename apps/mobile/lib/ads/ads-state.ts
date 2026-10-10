import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';

/**
 * ADS V1 -- ADS-1B. Maquina de estados PURA de la publicidad (sin React, sin
 * React Native, sin el SDK) -- toda la politica de elegibilidad vive aqui para
 * poder verificarla de forma determinista.
 *
 * Invariante CRITICA: `ready` NUNCA es alcanzable para PREMIUM ni con el
 * entitlement sin resolver (`loading` / `error`). El entitlement se evalua
 * PRIMERO; un SDK ya inicializado o una config favorable no lo anulan.
 *
 * Orden de gates (cada uno corta a los siguientes):
 *   entitlement resuelto -> confirmado FREE -> config remota resuelta con
 *   `adsEnabled` -> SDK configurado (PG + TEEN) e inicializado -> `ready`.
 */
export type AdsPhase = 'disabled' | 'waiting_entitlement' | 'waiting_config' | 'initializing' | 'ready' | 'error';

export type AdsEntitlementInput = 'loading' | 'error' | 'FREE' | 'PREMIUM';

export type AdsConfigInput =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; config: AdsConfigResponse };

export type AdsSdkInput = 'idle' | 'initializing' | 'ready' | 'failed';

/**
 * Modo de build de anuncios (ver `ad-unit-ids.ts`). `off` = release SIN modo
 * explicito (variable olvidada o configuracion contradictoria): SIN anuncios,
 * sin pedir config y sin inicializar el SDK.
 */
export type AdsBuildMode = 'test' | 'production' | 'off';

/**
 * Config remota etiquetada con la cuenta para la que se pidio. Una entrada de
 * OTRA cuenta (o sin sesion) se descarta: la config habilitada de un usuario
 * FREE jamas puede filtrarse a la sesion siguiente.
 */
export interface AdsConfigEntry {
  accountId: string | null;
  state: AdsConfigInput;
}

export const ADS_CONFIG_ENTRY_IDLE: AdsConfigEntry = Object.freeze({ accountId: null, state: { status: 'idle' } as AdsConfigInput });

export function scopeConfigToAccount(entry: AdsConfigEntry, accountId: string | null): AdsConfigInput {
  return accountId !== null && entry.accountId === accountId ? entry.state : { status: 'idle' };
}

/** `true` si hay que pedir la config remota para esta sesion (FREE confirmado, cuenta conocida y modo != off). */
export function shouldFetchAdsConfig(entitlement: AdsEntitlementInput, accountId: string | null, mode: AdsBuildMode): boolean {
  return entitlement === 'FREE' && accountId !== null && mode !== 'off';
}

/** Placements previstos (ADS-1C los consume; ADS-1B NO monta ninguno). */
export type AdsPlacement = 'bannerHome' | 'bannerStudy' | 'bannerCompete' | 'interstitialQuickExit';

/** Proyeccion estructural del estado de `EntitlementProvider` (sin importar su modulo). */
export type EntitlementStateLike = { status: 'loading' } | { status: 'error' } | { status: 'ready'; tier: string };

export function toAdsEntitlementInput(state: EntitlementStateLike): AdsEntitlementInput {
  if (state.status === 'ready') return state.tier === 'FREE' ? 'FREE' : state.tier === 'PREMIUM' ? 'PREMIUM' : 'error';
  return state.status;
}

export function deriveAdsPhase(entitlement: AdsEntitlementInput, config: AdsConfigInput, sdk: AdsSdkInput, mode: AdsBuildMode): AdsPhase {
  if (entitlement === 'loading') return 'waiting_entitlement';
  // PREMIUM, `error` y cualquier valor inesperado: SIN anuncios (fail-closed).
  if (entitlement !== 'FREE') return 'disabled';
  // Release sin modo explicito (o contradictorio): SIN anuncios (nunca prueba, nunca produccion).
  if (mode !== 'test' && mode !== 'production') return 'disabled';

  if (config.status === 'idle' || config.status === 'loading') return 'waiting_config';
  if (config.status === 'error') return 'error';
  if (!config.config.adsEnabled) return 'disabled';

  if (sdk === 'failed') return 'error';
  if (sdk === 'ready') return 'ready';
  return 'initializing';
}

/** `true` UNICAMENTE cuando todos los gates previos pasaron y el SDK aun no se ha pedido inicializar. */
export function shouldInitializeSdk(entitlement: AdsEntitlementInput, config: AdsConfigInput, sdk: AdsSdkInput, mode: AdsBuildMode): boolean {
  return deriveAdsPhase(entitlement, config, sdk, mode) === 'initializing' && sdk === 'idle';
}

export function isAdsReady(phase: AdsPhase): boolean {
  return phase === 'ready';
}

/** Config efectiva: la remota SOLO si la fase es `ready`; en cualquier otro caso, TODO apagado. */
export function effectiveAdsConfig(phase: AdsPhase, config: AdsConfigInput): AdsConfigResponse {
  return phase === 'ready' && config.status === 'ready' ? config.config : ADS_CONFIG_OFF;
}

export function isPlacementEnabled(phase: AdsPhase, config: AdsConfigInput, placement: AdsPlacement): boolean {
  const effective = effectiveAdsConfig(phase, config);
  if (!isAdsReady(phase) || !effective.adsEnabled) return false;
  switch (placement) {
    case 'bannerHome':
      return effective.bannerHomeEnabled;
    case 'bannerStudy':
      return effective.bannerStudyEnabled;
    case 'bannerCompete':
      return effective.bannerCompeteEnabled;
    case 'interstitialQuickExit':
      return effective.interstitialCompeteEnabled;
    default:
      return false;
  }
}
