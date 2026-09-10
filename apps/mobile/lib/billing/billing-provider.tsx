import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useIAP } from 'expo-iap';
import {
  normalizePremiumProduct,
  selectPremiumMonthlyOffer,
  ZETRYND_PREMIUM_PRODUCT_ID,
  type NormalizedPremiumProduct,
} from './google-play-billing';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-2A.
 *
 * UN solo provider posee el ciclo de vida de la conexion de facturacion (via
 * `useIAP()` de expo-iap 5.5.1, que auto-conecta al montar y cierra al
 * desmontar). Consulta la metadata LOCALIZADA de la suscripcion
 * `zetrynd_premium` y la normaliza para la UI.
 *
 * FRONTERA PB-2A -- este provider:
 *   - NO lanza compra (no expone `purchase()`), NO llama `requestPurchase`;
 *   - NO restaura (no expone `restore()`), NO llama `getAvailablePurchases`;
 *   - NO consulta ni escribe `billing-context`, NO reconcilia tokens;
 *   - NO toca el entitlement (eso sigue siendo 100% backend via `useEntitlement`);
 *   - NO expone ningun `purchaseToken`.
 *   Compra/restore/reconcile llegan en PB-2B.
 *
 * Runtimes sin billing nativo (Expo Go / web / dev-client bare sin el modulo)
 * -> estado `unsupported_runtime`, sin montar `useIAP()` (evita el throw del
 * modulo nativo ausente). En esos runtimes la paywall usa su precio de
 * referencia estatico.
 */
export type BillingConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
export type BillingProductState =
  | 'loading'
  | 'available'
  | 'unavailable'
  | 'error'
  | 'unsupported_runtime';

export interface BillingContextValue {
  /** `true` solo cuando el runtime tiene Google Play Billing nativo. */
  supported: boolean;
  connection: BillingConnectionState;
  product: BillingProductState;
  /** Metadata localizada del plan mensual, solo cuando `product === 'available'`. */
  premiumProduct: NormalizedPremiumProduct | null;
  /** Motivo cuando `product` es `'unavailable'` / `'error'` (diagnostico, no se muestra crudo). */
  productIssue: string | null;
  /** Re-consulta la metadata del producto. No-op en runtime no soportado. */
  refreshProducts: () => Promise<void>;
}

const FALLBACK: BillingContextValue = {
  supported: false,
  connection: 'idle',
  product: 'unsupported_runtime',
  premiumProduct: null,
  productIssue: null,
  refreshProducts: async () => {},
};

const BillingContext = createContext<BillingContextValue | null>(null);

/** ¿Este runtime puede cargar el modulo nativo de Google Play Billing? */
function isNativeBillingRuntime(): boolean {
  if (Platform.OS !== 'android') return false;
  // Expo Go ("storeClient") no incluye modulos nativos de terceros.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return true;
}

export function BillingProvider({ children }: { children: ReactNode }) {
  if (!isNativeBillingRuntime()) {
    return <BillingContext.Provider value={FALLBACK}>{children}</BillingContext.Provider>;
  }
  return <NativeBillingProvider>{children}</NativeBillingProvider>;
}

function NativeBillingProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<BillingConnectionState>('connecting');
  const [product, setProduct] = useState<BillingProductState>('loading');
  const [premiumProduct, setPremiumProduct] = useState<NormalizedPremiumProduct | null>(null);
  const [productIssue, setProductIssue] = useState<string | null>(null);

  /** Invalida consultas en vuelo (desmontaje / reintento). */
  const generationRef = useRef(0);
  const fetchedOnceRef = useRef(false);

  const { connected, subscriptions, fetchProducts, reconnect } = useIAP({
    onError: (error) => {
      setConnection('error');
      setProduct('error');
      setProductIssue(error?.message ?? 'billing-error');
    },
  });

  useEffect(() => {
    setConnection(connected ? 'connected' : 'connecting');
  }, [connected]);

  const refreshProducts = useCallback(async (): Promise<void> => {
    if (!connected) return;
    const gen = ++generationRef.current;
    setProduct((prev) => (prev === 'available' ? prev : 'loading'));
    try {
      await fetchProducts({ skus: [ZETRYND_PREMIUM_PRODUCT_ID], type: 'subs' });
    } catch (error) {
      if (gen !== generationRef.current) return;
      setProduct('error');
      setProductIssue(error instanceof Error ? error.message : 'fetch-products-failed');
    }
  }, [connected, fetchProducts]);

  // Primera consulta al conectar; refresco al volver a primer plano.
  useEffect(() => {
    if (!connected) return;
    if (!fetchedOnceRef.current) {
      fetchedOnceRef.current = true;
      void refreshProducts();
    }
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshProducts();
    });
    return () => subscription.remove();
  }, [connected, refreshProducts]);

  // Reintento unico de conexion si el primer auto-connect no prendio.
  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(() => {
      void reconnect().catch(() => {
        setConnection('error');
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [connected, reconnect]);

  useEffect(() => () => {
    generationRef.current += 1;
  }, []);

  // Deriva el estado del producto de la respuesta de `useIAP().subscriptions`.
  useEffect(() => {
    if (!connected) return;
    // Aun no hay respuesta para nuestro SKU -> seguimos en loading (no lo forzamos a unavailable).
    const sawOurSku = subscriptions.some((s) => s.id === ZETRYND_PREMIUM_PRODUCT_ID);
    if (!sawOurSku && subscriptions.length === 0 && !fetchedOnceRef.current) return;

    const selection = selectPremiumMonthlyOffer(subscriptions);
    if (!selection.ok) {
      setPremiumProduct(null);
      setProductIssue(selection.reason);
      // "product-not-found" cuando todavia no llego la respuesta no es un error duro.
      setProduct(selection.reason === 'not-android' ? 'error' : 'unavailable');
      return;
    }
    const normalized = normalizePremiumProduct(selection.product, selection.offer);
    if (!normalized) {
      setPremiumProduct(null);
      setProductIssue('normalization-failed');
      setProduct('unavailable');
      return;
    }
    setPremiumProduct(normalized);
    setProductIssue(null);
    setProduct('available');
  }, [connected, subscriptions]);

  const value = useMemo<BillingContextValue>(
    () => ({ supported: true, connection, product, premiumProduct, productIssue, refreshProducts }),
    [connection, product, premiumProduct, productIssue, refreshProducts],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling debe usarse dentro de BillingProvider');
  return ctx;
}
