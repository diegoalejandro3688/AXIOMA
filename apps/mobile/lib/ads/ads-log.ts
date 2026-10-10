import { isTestAdMode, readAdUnitEnv } from './ad-unit-ids';

/**
 * ADS V1 -- ADS-1C. Log de diagnostico de QA: SOLO en modo de prueba (dev o
 * smoke con ids de prueba). En produccion (o release sin modo explicito) NO
 * emite nada. Nunca recibe ni imprime cuenta, email, token ni secretos: los
 * llamadores solo pasan estados/eventos/motivos.
 */
let enabled: boolean | null = null;

function loggingEnabled(): boolean {
  if (enabled === null) enabled = isTestAdMode(readAdUnitEnv());
  return enabled;
}

export function adsDevLog(tag: 'ads-banner' | 'ads-interstitial', message: string): void {
  if (!loggingEnabled()) return;
  console.info(`[${tag}] ${message}`);
}
