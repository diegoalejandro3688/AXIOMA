import { z } from 'zod';

/**
 * Contrato compartido de ADS V1 -- ADS-1B (Ads foundation + kill switch remoto).
 *
 * `GET /me/ads-config` devuelve la configuracion REMOTA de publicidad de la
 * cuenta autenticada. Dos reglas congeladas:
 *
 *   1. FAIL-CLOSED en ambos lados: el servidor devuelve TODO apagado para
 *      PREMIUM (y ante cualquier fallo/ausencia de configuracion) y el cliente
 *      trata cualquier error, timeout o respuesta malformada como TODO apagado
 *      (`ADS_CONFIG_OFF`).
 *   2. Proyeccion MINIMA y `.strict()`: ningun campo extra (ni ids de unidad de
 *      anuncio, ni tier, ni datos de cuenta) viaja por esta ruta.
 *
 * Los ids de unidad de anuncio NO viajan por la API: viven en la configuracion
 * de build del cliente (ver `lib/ads/ad-unit-ids.ts` en mobile).
 */
export const adsConfigResponseSchema = z
  .object({
    /** Interruptor maestro: si es `false` ningun SDK de anuncios se inicializa. */
    adsEnabled: z.boolean(),
    bannerHomeEnabled: z.boolean(),
    bannerStudyEnabled: z.boolean(),
    bannerCompeteEnabled: z.boolean(),
    interstitialCompeteEnabled: z.boolean(),
    /** Minutos minimos entre dos intersticiales. `0` mientras el intersticial esta apagado. */
    interstitialCooldownMinutes: z.number().int().min(0).max(1440),
    /** Maximo de intersticiales por sesion de app. `0` mientras el intersticial esta apagado. */
    interstitialMaxPerSession: z.number().int().min(0).max(10),
  })
  .strict();

export type AdsConfigResponse = z.infer<typeof adsConfigResponseSchema>;

/** Estado "todo apagado" -- default seguro del servidor y del cliente. */
export const ADS_CONFIG_OFF: AdsConfigResponse = Object.freeze({
  adsEnabled: false,
  bannerHomeEnabled: false,
  bannerStudyEnabled: false,
  bannerCompeteEnabled: false,
  interstitialCompeteEnabled: false,
  interstitialCooldownMinutes: 0,
  interstitialMaxPerSession: 0,
});
