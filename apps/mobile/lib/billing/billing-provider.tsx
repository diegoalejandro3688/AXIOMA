import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  ErrorCode,
  getAvailablePurchases,
  useIAP,
  type ExpoPurchaseError,
  type Purchase,
} from 'expo-iap';
import { useAuth } from '../auth/auth-provider';
import { useEntitlement } from '../entitlement/entitlement-provider';
import { postBillingContext, postGooglePlayReconcile } from '../api/subscription';
import {
  mapReconcileResult,
  outcomeGrantsRefresh,
  outcomeIsTerminalForToken,
  purchaseTokenOf,
  selectRestorableSubscriptionTokens,
  type ReconcileOutcome,
} from './purchase-outcome';
import {
  normalizePremiumProduct,
  selectPremiumMonthlyOffer,
  ZETRYND_PREMIUM_PRODUCT_ID,
  type NormalizedPremiumProduct,
} from './google-play-billing';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing).
 *
 * PB-2A: UN solo provider posee el ciclo de vida de la conexion (via `useIAP()`
 * de expo-iap 5.5.1, auto-conecta al montar). Consulta y normaliza la metadata
 * LOCALIZADA de la suscripcion `zetrynd_premium`.
 *
 * PB-2B: el MISMO provider orquesta compra y restore -- SIN un segundo ciclo
 * `useIAP()`. Reglas duras:
 *   - el backend es SIEMPRE la fuente de verdad de Premium. Un callback de
 *     compra de Google Play NUNCA concede Premium localmente. Lo unico que
 *     hacemos tras una compra es enviar el `purchaseToken` a
 *     `POST /me/subscription/google-play/reconcile` y, SOLO si el backend
 *     responde `verified` (y la cuenta no cambio), llamar `entitlement.refresh()`.
 *   - el acknowledge con Google es 100% del BACKEND (`reconcilePurchase` ->
 *     `provider.acknowledgeSubscription`). El movil NUNCA llama
 *     `finishTransaction` / `acknowledgePurchaseAndroid` -- en expo-iap 5.5.1
 *     `finishTransaction({ isConsumable:false })` en Android ES el acknowledge,
 *     y haria un doble-ack / carrera con el backend. Una compra que el backend
 *     no confirme se recupera por RTDN (C3.3) + el reconcile al reanudar la app
 *     (el listener de `useIAP` re-emite las compras no finalizadas).
 *   - compras PENDING nunca conceden Premium.
 *   - el `purchaseToken` NUNCA se loggea, ni se persiste, ni se expone en UI.
 *   - deduplicacion de tokens: un mismo token no se reconcilia dos veces con
 *     resultado terminal (el dedupe se limpia al cambiar de cuenta).
 *
 * Runtimes sin billing nativo (Expo Go / web / dev-client sin el modulo) ->
 * `unsupported_runtime`, sin montar `useIAP()`.
 */
export type BillingConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
export type BillingProductState =
  | 'loading'
  | 'available'
  | 'unavailable'
  | 'error'
  | 'unsupported_runtime';

/**
 * Maquina de estados de compra/restore -- minima y determinista.
 *   idle        -- sin flujo activo
 *   launching   -- pidiendo billing-context + lanzando el flujo nativo de Google
 *   reconciling -- compra recibida; verificando con el backend
 *   success     -- el backend respondio `verified`; entitlement refrescado
 *   pending     -- compra/restore pendiente de pago (Google) -> NO concede Premium
 *   cancelled   -- el usuario cancelo (NO es un error) o un pending se cancelo
 *   error       -- fallo (atribucion / transitorio / store); ver `purchaseError`
 */
export type PurchaseFlowState =
  | 'idle'
  | 'launching'
  | 'reconciling'
  | 'success'
  | 'pending'
  | 'cancelled'
  | 'error';

/** Motivo NORMALIZADO de un `purchaseFlow === 'error'` -- para la UI, nunca crudo. */
export type PurchaseErrorReason =
  | 'billing_context_failed'
  | 'launch_failed'
  | 'account_mismatch'
  | 'unverifiable'
  | 'invalid_product'
  | 'retryable'
  | 'store_error';

export interface BillingRestoreSummary {
  total: number;
  verified: number;
  pending: number;
  failed: number;
}

export interface BillingContextValue {
  supported: boolean;
  connection: BillingConnectionState;
  product: BillingProductState;
  premiumProduct: NormalizedPremiumProduct | null;
  productIssue: string | null;
  refreshProducts: () => Promise<void>;
  // --- PB-2B ---
  purchaseFlow: PurchaseFlowState;
  purchaseError: PurchaseErrorReason | null;
  /** `true` mientras hay una compra o restore en curso (evita lanzamientos duplicados). */
  busy: boolean;
  /** Resumen del ultimo restore (para UI/QA); `null` si nunca se corrio. */
  lastRestore: BillingRestoreSummary | null;
  /** Lanza el flujo de compra de la suscripcion mensual. No-op si ya hay uno en curso o el producto no esta disponible. */
  purchase: () => Promise<void>;
  /** Reconcilia las compras que Google Play reporta como propias. Seguro de repetir. */
  restore: () => Promise<void>;
  /** Vuelve `purchaseFlow` a `idle` (p.ej. al cerrar el paywall). */
  resetPurchaseFlow: () => void;
}

const FALLBACK: BillingContextValue = {
  supported: false,
  connection: 'idle',
  product: 'unsupported_runtime',
  premiumProduct: null,
  productIssue: null,
  refreshProducts: async () => {},
  purchaseFlow: 'idle',
  purchaseError: null,
  busy: false,
  lastRestore: null,
  purchase: async () => {},
  restore: async () => {},
  resetPurchaseFlow: () => {},
};

const BillingContext = createContext<BillingContextValue | null>(null);

const ERROR_REASON_BY_OUTCOME: Partial<Record<ReconcileOutcome['kind'], PurchaseErrorReason>> = {
  account_mismatch: 'account_mismatch',
  unverifiable: 'unverifiable',
  invalid: 'invalid_product',
  retryable: 'retryable',
};

/** ¿Este runtime puede cargar el modulo nativo de Google Play Billing? */
function isNativeBillingRuntime(): boolean {
  if (Platform.OS !== 'android') return false;
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
  const auth = useAuth();
  const entitlement = useEntitlement();

  const [connection, setConnection] = useState<BillingConnectionState>('connecting');
  const [product, setProduct] = useState<BillingProductState>('loading');
  const [premiumProduct, setPremiumProduct] = useState<NormalizedPremiumProduct | null>(null);
  const [productIssue, setProductIssue] = useState<string | null>(null);

  const [purchaseFlow, setPurchaseFlow] = useState<PurchaseFlowState>('idle');
  const [purchaseError, setPurchaseError] = useState<PurchaseErrorReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastRestore, setLastRestore] = useState<BillingRestoreSummary | null>(null);

  const generationRef = useRef(0); // invalida fetchProducts en vuelo
  const fetchedOnceRef = useRef(false);

  /** Cuenta a la que pertenece el estado de compra actual. Un callback cuya cuenta ya no coincide se DESCARTA. */
  const accountIdRef = useRef<string | null>(auth.accountId);
  /** Tokens ya reconciliados con resultado terminal (dedupe). Se limpia al cambiar de cuenta. */
  const processedTokensRef = useRef<Set<string>>(new Set());
  /** Guard de concurrencia: una sola compra/restore a la vez. */
  const inFlightRef = useRef(false);
  /** Producto normalizado vigente (offerToken incluido). Nunca `offers[0]`. */
  const premiumProductRef = useRef<NormalizedPremiumProduct | null>(null);

  const setError = useCallback((reason: PurchaseErrorReason) => {
    setPurchaseError(reason);
    setPurchaseFlow('error');
  }, []);

  /**
   * Reconcilia UN token con el backend. Deduplica, mapea el resultado y -- SOLO
   * si el backend responde `verified` y la cuenta no cambio desde que empezo --
   * refresca el entitlement. Nunca concede Premium por su cuenta.
   */
  const reconcileToken = useCallback(
    async (token: string): Promise<ReconcileOutcome> => {
      if (processedTokensRef.current.has(token)) {
        return { kind: 'verified' }; // ya procesado en esta sesion de cuenta -> no-op idempotente
      }
      const accountAtStart = accountIdRef.current;
      const result = await postGooglePlayReconcile(token);
      const outcome = mapReconcileResult(result);

      if (outcomeIsTerminalForToken(outcome)) {
        processedTokensRef.current.add(token);
      }
      if (accountIdRef.current === accountAtStart && outcomeGrantsRefresh(outcome)) {
        await entitlement.refresh();
      }
      return outcome;
    },
    [entitlement],
  );

  const runRestore = useCallback(
    async (): Promise<void> => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setBusy(true);
      setPurchaseError(null);
      setPurchaseFlow('reconciling');

      let purchases: Purchase[] = [];
      try {
        purchases = await getAvailablePurchases();
      } catch {
        inFlightRef.current = false;
        setBusy(false);
        setError('retryable');
        return;
      }

      const tokens = selectRestorableSubscriptionTokens(purchases);
      const summary: BillingRestoreSummary = { total: tokens.length, verified: 0, pending: 0, failed: 0 };

      for (const token of tokens) {
        const outcome = await reconcileToken(token);
        if (outcome.kind === 'verified') summary.verified += 1;
        else if (outcome.kind === 'pending') summary.pending += 1;
        else if (outcome.kind === 'canceled') continue; // terminal, no concede, no bloquea
        else summary.failed += 1; // retryable / account_mismatch / unverifiable / invalid
      }

      inFlightRef.current = false;
      setBusy(false);
      setLastRestore(summary);

      if (summary.verified > 0) setPurchaseFlow('success');
      else if (summary.failed > 0) setError('retryable');
      else if (summary.pending > 0) setPurchaseFlow('pending');
      else setPurchaseFlow('idle'); // cero compras reconciliables
    },
    [reconcileToken, setError],
  );

  const handlePurchaseCallback = useCallback(
    async (purchase: Purchase) => {
      const driving = inFlightRef.current;
      const token = purchaseTokenOf(purchase);
      if (!token) {
        if (driving) {
          inFlightRef.current = false;
          setBusy(false);
          setError('store_error');
        }
        return;
      }

      if (driving) setPurchaseFlow('reconciling');
      const outcome = await reconcileToken(token);
      if (!driving) return; // replay espontaneo (resume): reconcilia en silencio, sin tocar la UI del paywall

      inFlightRef.current = false;
      setBusy(false);

      switch (outcome.kind) {
        case 'verified':
          setPurchaseError(null);
          setPurchaseFlow('success');
          break;
        case 'pending':
          setPurchaseError(null);
          setPurchaseFlow('pending');
          break;
        case 'canceled':
          setPurchaseError(null);
          setPurchaseFlow('cancelled');
          break;
        default:
          setError(ERROR_REASON_BY_OUTCOME[outcome.kind] ?? 'retryable');
      }
    },
    [reconcileToken, setError],
  );

  const handlePurchaseError = useCallback(
    (error: ExpoPurchaseError) => {
      inFlightRef.current = false;
      setBusy(false);
      switch (error.code) {
        case ErrorCode.UserCancelled:
          setPurchaseError(null);
          setPurchaseFlow('cancelled');
          break;
        case ErrorCode.Pending:
        case ErrorCode.DeferredPayment:
          setPurchaseError(null);
          setPurchaseFlow('pending');
          break;
        case ErrorCode.AlreadyOwned:
          // Ya es dueño de la suscripcion pero el backend puede no saberlo ->
          // reconciliar desde las compras que Google reporta como propias.
          void runRestore();
          break;
        default:
          setError('store_error');
      }
    },
    [runRestore, setError],
  );

  const { connected, subscriptions, fetchProducts, reconnect, requestPurchase } = useIAP({
    onError: (error) => {
      setConnection('error');
      setProduct((prev) => (prev === 'available' ? prev : 'error'));
      setProductIssue(error?.message ?? 'billing-error');
    },
    onPurchaseSuccess: (purchase) => {
      void handlePurchaseCallback(purchase);
    },
    onPurchaseError: (error) => {
      handlePurchaseError(error);
    },
  });

  useEffect(() => {
    premiumProductRef.current = premiumProduct;
  }, [premiumProduct]);

  useEffect(() => {
    setConnection(connected ? 'connected' : 'connecting');
  }, [connected]);

  const purchase = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    const normalized = premiumProductRef.current;
    if (product !== 'available' || !normalized) {
      setError('store_error');
      return;
    }

    inFlightRef.current = true;
    setBusy(true);
    setPurchaseError(null);
    setPurchaseFlow('launching');

    // 1. billing-context: el backend emite el `billingAccountRef` (obfuscated
    //    account id) de la cuenta autenticada. Sin el, NO se lanza la compra.
    const ctx = await postBillingContext();
    if (!ctx.ok) {
      inFlightRef.current = false;
      setBusy(false);
      setError('billing_context_failed');
      return;
    }
    accountIdRef.current = auth.accountId;

    // 2. flujo nativo de Google Play. El resultado llega por
    //    `onPurchaseSuccess` / `onPurchaseError` -- NO por el retorno.
    try {
      await requestPurchase({
        type: 'subs',
        request: {
          google: {
            skus: [ZETRYND_PREMIUM_PRODUCT_ID],
            subscriptionOffers: [{ sku: ZETRYND_PREMIUM_PRODUCT_ID, offerToken: normalized.offerToken }],
            obfuscatedAccountId: ctx.data.billingAccountRef,
          },
        },
      });
    } catch {
      inFlightRef.current = false;
      setBusy(false);
      setError('launch_failed');
    }
  }, [auth.accountId, product, requestPurchase, setError]);

  const restore = useCallback(() => runRestore(), [runRestore]);

  const resetPurchaseFlow = useCallback(() => {
    if (inFlightRef.current) return; // no cortar un flujo en curso
    setPurchaseFlow('idle');
    setPurchaseError(null);
  }, []);

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
      void reconnect().catch(() => setConnection('error'));
    }, 3000);
    return () => clearTimeout(timer);
  }, [connected, reconnect]);

  useEffect(
    () => () => {
      generationRef.current += 1;
    },
    [],
  );

  // Cambio de cuenta / logout: reset del estado de compra + dedupe. Un flujo de
  // la cuenta anterior NUNCA afecta a la nueva.
  useEffect(() => {
    if (auth.accountId === accountIdRef.current) return;
    accountIdRef.current = auth.accountId;
    processedTokensRef.current = new Set();
    inFlightRef.current = false;
    setBusy(false);
    setPurchaseFlow('idle');
    setPurchaseError(null);
    setLastRestore(null);
  }, [auth.accountId]);

  // Deriva el estado del producto de `useIAP().subscriptions`.
  useEffect(() => {
    if (!connected) return;
    const sawOurSku = subscriptions.some((s) => s.id === ZETRYND_PREMIUM_PRODUCT_ID);
    if (!sawOurSku && subscriptions.length === 0 && !fetchedOnceRef.current) return;

    const selection = selectPremiumMonthlyOffer(subscriptions);
    if (!selection.ok) {
      setPremiumProduct(null);
      setProductIssue(selection.reason);
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
    () => ({
      supported: true,
      connection,
      product,
      premiumProduct,
      productIssue,
      refreshProducts,
      purchaseFlow,
      purchaseError,
      busy,
      lastRestore,
      purchase,
      restore,
      resetPurchaseFlow,
    }),
    [
      connection,
      product,
      premiumProduct,
      productIssue,
      refreshProducts,
      purchaseFlow,
      purchaseError,
      busy,
      lastRestore,
      purchase,
      restore,
      resetPurchaseFlow,
    ],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling debe usarse dentro de BillingProvider');
  return ctx;
}
