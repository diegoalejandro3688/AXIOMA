import { ADS_CONFIG_OFF, type AdsConfigResponse, type PremiumTier } from '@axioma/contracts';

/**
 * ADS V1 -- ADS-1B. Resolucion PURA de la configuracion remota de anuncios.
 *
 * Fuente: variables de entorno (Railway) -- interruptor de emergencia SIN
 * release movil y SIN modelo de base de datos. Cambiar una variable en Railway
 * redespliega el servicio y la nueva config llega al cliente en su proxima
 * lectura (apertura de la app / vuelta a primer plano).
 *
 * FAIL-CLOSED por construccion:
 *   - cualquier tier que NO sea exactamente `FREE` -> TODO apagado (PREMIUM
 *     nunca ve anuncios, tampoco si el cliente fuera manipulado);
 *   - un flag solo vale `true` si el valor es literalmente "true"
 *     (minusculas, sin espacios significativos); ausente, vacio, "1", "TRUE",
 *     "yes" o basura -> `false`;
 *   - `ADS_ENABLED` es maestro: apagado -> TODO apagado, sin importar los demas;
 *   - los numeros solo se emiten con el intersticial encendido, estrictamente
 *     digitos y acotados; fuera de rango/invalido -> default conservador.
 */
export const ADS_ENV_KEYS = {
  adsEnabled: 'ADS_ENABLED',
  bannerHomeEnabled: 'ADS_BANNER_HOME_ENABLED',
  bannerStudyEnabled: 'ADS_BANNER_STUDY_ENABLED',
  bannerCompeteEnabled: 'ADS_BANNER_COMPETE_ENABLED',
  interstitialCompeteEnabled: 'ADS_INTERSTITIAL_COMPETE_ENABLED',
  interstitialCooldownMinutes: 'ADS_INTERSTITIAL_COOLDOWN_MINUTES',
  interstitialMaxPerSession: 'ADS_INTERSTITIAL_MAX_PER_SESSION',
} as const;

/** Defaults conservadores (retencion por sobre ingreso) cuando el intersticial esta encendido y el numero falta o es invalido. */
export const DEFAULT_INTERSTITIAL_COOLDOWN_MINUTES = 20;
export const DEFAULT_INTERSTITIAL_MAX_PER_SESSION = 1;

export type AdsEnvReader = (key: string) => string | undefined;

function parseFlag(raw: string | undefined): boolean {
  return typeof raw === 'string' && raw.trim() === 'true';
}

function parseBoundedInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  const value = Number.parseInt(trimmed, 10);
  return value >= min && value <= max ? value : fallback;
}

export function resolveAdsConfig(tier: PremiumTier | string, read: AdsEnvReader): AdsConfigResponse {
  if (tier !== 'FREE') return { ...ADS_CONFIG_OFF };
  if (!parseFlag(read(ADS_ENV_KEYS.adsEnabled))) return { ...ADS_CONFIG_OFF };

  const interstitialCompeteEnabled = parseFlag(read(ADS_ENV_KEYS.interstitialCompeteEnabled));
  return {
    adsEnabled: true,
    bannerHomeEnabled: parseFlag(read(ADS_ENV_KEYS.bannerHomeEnabled)),
    bannerStudyEnabled: parseFlag(read(ADS_ENV_KEYS.bannerStudyEnabled)),
    bannerCompeteEnabled: parseFlag(read(ADS_ENV_KEYS.bannerCompeteEnabled)),
    interstitialCompeteEnabled,
    interstitialCooldownMinutes: interstitialCompeteEnabled
      ? parseBoundedInt(read(ADS_ENV_KEYS.interstitialCooldownMinutes), 1, 1440, DEFAULT_INTERSTITIAL_COOLDOWN_MINUTES)
      : 0,
    interstitialMaxPerSession: interstitialCompeteEnabled
      ? parseBoundedInt(read(ADS_ENV_KEYS.interstitialMaxPerSession), 1, 10, DEFAULT_INTERSTITIAL_MAX_PER_SESSION)
      : 0,
  };
}
