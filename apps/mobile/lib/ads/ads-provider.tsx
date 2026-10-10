import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import { useAuth } from '../auth/auth-provider';
import { useEntitlement } from '../entitlement/entitlement-provider';
import { getAdsConfig } from '../api/ads';
import { readAdUnitEnv, resolveTestDeviceIds } from './ad-unit-ids';
import { initializeAdsSdk } from './ads-sdk';
import {
  deriveAdsPhase,
  effectiveAdsConfig,
  isAdsReady,
  isPlacementEnabled,
  shouldInitializeSdk,
  toAdsEntitlementInput,
  type AdsConfigInput,
  type AdsPhase,
  type AdsPlacement,
  type AdsSdkInput,
} from './ads-state';

/**
 * ADS V1 -- ADS-1B. Proveedor CENTRALIZADO de publicidad.
 *
 * Responsabilidades: leer el entitlement, cargar la config remota, decidir la
 * elegibilidad (politica PURA en `ads-state.ts`), inicializar el SDK una sola
 * vez (PG + TEEN antes de la inicializacion, en `ads-sdk.ts`) y exponer un
 * estado SEGURO a los futuros placements. Ninguna pantalla decide nada por su
 * cuenta.
 *
 * FAIL-CLOSED: `ready` solo es alcanzable con entitlement FREE confirmado +
 * config remota con `adsEnabled` + SDK inicializado. PREMIUM / `loading` /
 * `error` / config fallida o apagada -> sin SDK, sin solicitudes, sin
 * contenedores. Esta fase NO monta placements ni solicita anuncios (ADS-1C).
 * La publicidad es UI opcional: nada de aqui bloquea la navegacion.
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

  const [configState, setConfigState] = useState<AdsConfigInput>({ status: 'idle' });
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

  const fetchConfig = useCallback(async (generation: number) => {
    const result = await getAdsConfig(); // `apiRequest` nunca lanza: error/timeout/malformado -> ok:false
    if (!mountedRef.current || generation !== generationRef.current) return;
    setConfigState(result.ok ? { status: 'ready', config: result.data } : { status: 'error' });
  }, []);

  // Config remota SOLO para una cuenta FREE confirmada; cualquier otro caso la descarta.
  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    if (entitlementInput !== 'FREE' || !accountId) {
      setConfigState({ status: 'idle' });
      return;
    }
    setConfigState({ status: 'loading' });
    lastFetchRef.current = Date.now();
    void fetchConfig(generation);
  }, [entitlementInput, accountId, fetchConfig]);

  // Kill switch remoto sin reiniciar la app + reintento del SDK tras un fallo.
  useEffect(() => {
    if (entitlementInput !== 'FREE' || !accountId) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setSdkState((prev) => (prev === 'failed' ? 'idle' : prev));
      if (Date.now() - lastFetchRef.current >= CONFIG_REFRESH_MIN_INTERVAL_MS) {
        lastFetchRef.current = Date.now();
        void fetchConfig(generationRef.current);
      }
    });
    return () => subscription.remove();
  }, [entitlementInput, accountId, fetchConfig]);

  const needsInit = shouldInitializeSdk(entitlementInput, configState, sdkState);

  // Inicializacion unica del SDK: SOLO cuando todos los gates previos pasaron.
  useEffect(() => {
    if (!needsInit) return;
    setSdkState('initializing');
    initializeAdsSdk(resolveTestDeviceIds(readAdUnitEnv()))
      .then(() => {
        if (mountedRef.current) setSdkState('ready');
      })
      .catch(() => {
        if (mountedRef.current) setSdkState('failed');
      });
  }, [needsInit]);

  const phase = deriveAdsPhase(entitlementInput, configState, sdkState);

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
