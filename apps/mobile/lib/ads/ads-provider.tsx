import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import { useAuth } from '../auth/auth-provider';
import { useEntitlement } from '../entitlement/entitlement-provider';
import { getAdsConfig } from '../api/ads';
import { readAdUnitEnv, resolveAdsBuildMode, resolveTestDeviceIds } from './ad-unit-ids';
import { initializeAdsSdk } from './ads-sdk';
import {
  ADS_CONFIG_ENTRY_IDLE,
  deriveAdsPhase,
  effectiveAdsConfig,
  isAdsReady,
  isPlacementEnabled,
  scopeConfigToAccount,
  shouldFetchAdsConfig,
  shouldInitializeSdk,
  toAdsEntitlementInput,
  type AdsConfigEntry,
  type AdsPhase,
  type AdsPlacement,
  type AdsSdkInput,
} from './ads-state';

/**
 * ADS V1 -- ADS-1B / ADS-1B.1. Proveedor CENTRALIZADO de publicidad.
 *
 * Responsabilidades: leer el entitlement, cargar la config remota, decidir la
 * elegibilidad (politica PURA en `ads-state.ts`), inicializar el SDK una sola
 * vez (PG + TEEN antes de la inicializacion, en `ads-sdk.ts`) y exponer un
 * estado SEGURO a los futuros placements. Ninguna pantalla decide nada por su
 * cuenta.
 *
 * FAIL-CLOSED: `ready` solo es alcanzable con entitlement FREE confirmado +
 * modo de build explicito (`test` | `production`) + config remota con
 * `adsEnabled` PARA ESTA CUENTA + SDK inicializado. PREMIUM / `loading` /
 * `error` / config fallida, apagada o de otra cuenta / release sin modo
 * explicito -> sin anuncios, sin solicitudes, sin contenedores. Esta fase NO
 * monta placements ni solicita anuncios (ADS-1C). La publicidad es UI
 * opcional: nada de aqui bloquea la navegacion.
 *
 * VIDA DEL SDK (ADS-1B.1): Google Mobile Ads no expone "desinicializar". La
 * inicializacion es por PROCESO: tras FREE -> logout -> PREMIUM en el mismo
 * proceso el SDK sigue inicializado, pero el contrato de producto NO es "el
 * SDK jamas se inicializo" sino: PREMIUM => cero anuncios renderizados, cero
 * solicitudes de anuncio y todos los placements apagados. `sdkState` es un
 * hecho del proceso (no se resetea al cambiar de cuenta); lo que SI se
 * invalida en cada cambio de cuenta es la config remota y, por ende, la fase.
 *
 * La config se vuelve a leer al volver a primer plano (como maximo cada 5 min)
 * para que el kill switch remoto surta efecto sin reiniciar la app; un fallo en
 * esa lectura apaga todo (fail-closed).
 */
const CONFIG_REFRESH_MIN_INTERVAL_MS = 5 * 60 * 1000;

export interface AdsContextValue {
  phase: AdsPhase;
  /** `true` solo en la fase `ready`. */
  ready: boolean;
  /** Config efectiva: la remota solo en `ready`; si no, TODO apagado. */
  config: AdsConfigResponse;
  isPlacementEnabled: (placement: AdsPlacement) => boolean;
}

const AdsContext = createContext<AdsContextValue | null>(null);

/** Valor seguro cuando no hay proveedor o no es elegible: nada se muestra. */
const ADS_OFF: AdsContextValue = Object.freeze({
  phase: 'disabled' as const,
  ready: false,
  config: ADS_CONFIG_OFF,
  isPlacementEnabled: () => false,
});

export function AdsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const entitlement = useEntitlement();
  const entitlementInput = toAdsEntitlementInput(entitlement.state);
  const accountId = auth.accountId;
  // El entorno es estatico por build: se resuelve una vez.
  const adUnitEnv = useMemo(() => readAdUnitEnv(), []);
  const mode = useMemo(() => resolveAdsBuildMode(adUnitEnv), [adUnitEnv]);

  const [configEntry, setConfigEntry] = useState<AdsConfigEntry>(ADS_CONFIG_ENTRY_IDLE);
  const [sdkState, setSdkState] = useState<AdsSdkInput>('idle');
  const generationRef = useRef(0);
  const lastFetchRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchConfig = useCallback(async (generation: number, forAccountId: string) => {
    const result = await getAdsConfig(); // `apiRequest` nunca lanza: error/timeout/malformado -> ok:false
    if (!mountedRef.current || generation !== generationRef.current) return;
    setConfigEntry({
      accountId: forAccountId,
      state: result.ok ? { status: 'ready', config: result.data } : { status: 'error' },
    });
  }, []);

  // Config remota SOLO para una cuenta FREE confirmada en un build con modo explicito;
  // cualquier otro caso (o cualquier cambio de cuenta) descarta lo anterior.
  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    if (!shouldFetchAdsConfig(entitlementInput, accountId, mode) || accountId === null) {
      setConfigEntry(ADS_CONFIG_ENTRY_IDLE);
      return;
    }
    setConfigEntry({ accountId, state: { status: 'loading' } });
    lastFetchRef.current = Date.now();
    void fetchConfig(generation, accountId);
  }, [entitlementInput, accountId, mode, fetchConfig]);

  // Kill switch remoto sin reiniciar la app + reintento del SDK tras un fallo.
  useEffect(() => {
    if (!shouldFetchAdsConfig(entitlementInput, accountId, mode) || accountId === null) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setSdkState((prev) => (prev === 'failed' ? 'idle' : prev));
      if (Date.now() - lastFetchRef.current >= CONFIG_REFRESH_MIN_INTERVAL_MS) {
        lastFetchRef.current = Date.now();
        void fetchConfig(generationRef.current, accountId);
      }
    });
    return () => subscription.remove();
  }, [entitlementInput, accountId, mode, fetchConfig]);

  // La entrada de config SOLO vale para la cuenta actual (nunca se filtra a otra sesion).
  const configState = scopeConfigToAccount(configEntry, accountId);
  const needsInit = shouldInitializeSdk(entitlementInput, configState, sdkState, mode);

  // Inicializacion unica del SDK: SOLO cuando todos los gates previos pasaron.
  useEffect(() => {
    if (!needsInit) return;
    setSdkState('initializing');
    initializeAdsSdk(resolveTestDeviceIds(adUnitEnv))
      .then(() => {
        if (mountedRef.current) setSdkState('ready');
      })
      .catch(() => {
        if (mountedRef.current) setSdkState('failed');
      });
  }, [needsInit, adUnitEnv]);

  const phase = deriveAdsPhase(entitlementInput, configState, sdkState, mode);

  // Telemetria de QA: SOLO en modo 'test' (dev o smoke), sin datos de usuario
  // (ni cuenta ni email): fase, modo y estado del SDK. Nunca en produccion/off.
  useEffect(() => {
    if (mode !== 'test') return;
    console.info(`[ads] mode=${mode} entitlement=${entitlementInput} phase=${phase} sdk=${sdkState}`);
  }, [mode, entitlementInput, phase, sdkState]);

  const value = useMemo<AdsContextValue>(
    () => ({
      phase,
      ready: isAdsReady(phase),
      config: effectiveAdsConfig(phase, configState),
      isPlacementEnabled: (placement) => isPlacementEnabled(phase, configState, placement),
    }),
    [phase, configState],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

/** Estado de anuncios para los futuros placements. Fuera del proveedor: TODO apagado (fail-closed). */
export function useAds(): AdsContextValue {
  return useContext(AdsContext) ?? ADS_OFF;
}
