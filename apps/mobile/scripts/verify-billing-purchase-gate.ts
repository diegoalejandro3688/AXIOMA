// Gate -- PREMIUM V1, Capa 3 (Google Play Billing), PB-2B:
// ORQUESTACION DE COMPRA + RECONCILE + RESTORE (mobile).
//
// Verificacion DETERMINISTA -- Node puro, scan de fuente. NINGUN archivo de
// produccion se modifica, NO se ejecuta Gradle, NO se toca ningun dispositivo,
// NO se lanza ninguna compra real. El QA fisico en Samsung es un paso aparte.
//
// Prueba estaticamente los 15 invariantes de PB-2B:
//   1.  la compra EXIGE el `billingAccountRef` del backend (billing-context)
//       ANTES de lanzar el flujo nativo.
//   2.  el `requestPurchase` lleva la atribucion de cuenta Android
//       (`obfuscatedAccountId` = billingAccountRef).
//   3.  se elige el offer/base-plan congelado via el producto normalizado
//       (offerToken), nunca `offers[0]`.
//   4.  el `purchaseToken` SOLO viaja al endpoint backend de reconcile.
//   5.  NINGUN "grant" local de Premium desde el resultado de Play.
//   6.  `entitlement.refresh()` ocurre SOLO tras un reconcile backend `verified`.
//   7.  callbacks duplicados / mismo token repetido -> deduplicado, sin
//       transiciones inseguras.
//   8.  compras pending / canceladas NUNCA conceden Premium.
//   9.  restore reconcilia por backend, no por entitlement local.
//   10. los tokens se deduplican (Set en seleccion + dedupe en reconcile).
//   11. el `purchaseToken` crudo NO se loggea / persiste / expone en UI.
//   12. el gate PB-2A "sin compra" quedo SUPERSEDIDO explicitamente, no borrado.
//   13. se conservan los invariantes PB-1A/PB-1B (billing-context sin body;
//       reconcile body `.strict()` solo `{ purchaseToken }`; summary GET read).
//   14. sin segunda libreria de billing.
//   15. sin autoridad de precio estatico para la compra en vivo.
//   + el acknowledge con Google es del BACKEND: el movil NUNCA llama
//     `finishTransaction` / `acknowledgePurchaseAndroid` / `consumePurchaseAndroid`.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MOBILE_ROOT = join(__dirname, '..');
const REPO_ROOT = join(MOBILE_ROOT, '..', '..');
const read = (...seg: string[]) => readFileSync(join(MOBILE_ROOT, ...seg), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

console.log('=== Gate PB-2B -- orquestacion de compra / reconcile / restore (estatico) ===\n');

const providerSrc = read('lib', 'billing', 'billing-provider.tsx');
const provider = stripComments(providerSrc);
const outcomeSrc = read('lib', 'billing', 'purchase-outcome.ts');
const outcome = stripComments(outcomeSrc);
const apiSrc = read('lib', 'api', 'subscription.ts');
const api = stripComments(apiSrc);
const paywallSrc = read('components', 'premium', 'premium-paywall.tsx');
const paywall = stripComments(paywallSrc);
const billingBlob = [provider, outcome].join('\n');

// --- 1. billing-context requerido antes de lanzar ---------------------------
check(
  '1: purchase() llama postBillingContext() y ABORTA si !ctx.ok antes de requestPurchase',
  /const ctx = await postBillingContext\(\)/.test(provider) &&
    /if \(!ctx\.ok\)[\s\S]{0,160}return;/.test(provider) &&
    provider.indexOf('postBillingContext()') < provider.indexOf('requestPurchase({'),
);
check('1: postBillingContext NO manda body (accountId sale de la sesion)', /apiRequest\('POST', '\/me\/subscription\/google-play\/billing-context', \{\s*schema:/.test(api) && !/billing-context'[\s\S]{0,120}body:/.test(api));

// --- 2. atribucion de cuenta Android --------------------------------------
check(
  "2: requestPurchase lleva obfuscatedAccountId = ctx.data.billingAccountRef",
  /obfuscatedAccountId:\s*ctx\.data\.billingAccountRef/.test(provider),
);
check('2: la atribucion usa el campo Android real de expo-iap (obfuscatedAccountId dentro de request.google)', /request:\s*\{\s*google:\s*\{[\s\S]{0,200}obfuscatedAccountId:/.test(provider));

// --- 3. offer / base plan correctos --------------------------------------
check(
  '3: subscriptionOffers usa el offerToken del producto normalizado (nunca offers[0])',
  /subscriptionOffers:\s*\[\{\s*sku:\s*ZETRYND_PREMIUM_PRODUCT_ID,\s*offerToken:\s*normalized\.offerToken\s*\}\]/.test(provider) &&
    !/offers\[0\]|subscriptionOffers\[0\]/.test(provider),
);
check('3: el producto normalizado viene de selectPremiumMonthlyOffer/normalizePremiumProduct (PB-2A)', /selectPremiumMonthlyOffer|normalizePremiumProduct/.test(provider));

// --- 4. purchaseToken solo al reconcile backend --------------------------
check('4: el unico consumidor del token es postGooglePlayReconcile', /postGooglePlayReconcile\(token\)/.test(provider));
check(
  '4: postGooglePlayReconcile pega SOLO a /me/subscription/google-play/reconcile con body { purchaseToken }',
  /apiRequest\('POST', '\/me\/subscription\/google-play\/reconcile', \{\s*body:\s*\{ purchaseToken \},/.test(api),
);
check('4: el token NUNCA se manda a otro host / endpoint / analytics', !/fetch\(|analytics|Segment|amplitude|sentry|Bugsnag/i.test(billingBlob));

// --- 5. sin grant local de Premium --------------------------------------
check(
  '5: el provider NO concede Premium localmente (sin setPremium/setTier/setEntitlement/setIsPremium)',
  !/set(Premium|Tier|Entitlement|IsPremium|Subscribed)\s*\(/i.test(billingBlob),
);
check('5: lo unico que toca el entitlement es entitlement.refresh()', /entitlement\.refresh\(\)/.test(provider) && !/entitlement\.(set|grant|activate|mutate)/i.test(provider));
check('5: lib/billing NO importa el _internal/entitlement admin ni un override de tier', !/_internal\/entitlement|set-tier-override|entitlement-internal/i.test(billingBlob));

// --- 6. refresh SOLO tras verified --------------------------------------
check(
  '6: entitlement.refresh() esta guardado por outcomeGrantsRefresh(outcome)',
  /if \(accountIdRef\.current === accountAtStart && outcomeGrantsRefresh\(outcome\)\) \{\s*await entitlement\.refresh\(\);/.test(provider),
);
check("6: outcomeGrantsRefresh devuelve true SOLO para kind === 'verified'", /export function outcomeGrantsRefresh\([^)]*\):\s*boolean\s*\{\s*return outcome\.kind === 'verified';\s*\}/.test(outcome));
check("6: mapReconcileResult mapea status 'verified' -> kind 'verified', 'pending'/'canceled' -> no-grant", /case 'verified':\s*return \{ kind: 'verified' \};/.test(outcome) && /case 'pending':\s*return \{ kind: 'pending' \};/.test(outcome) && /case 'canceled':\s*return \{ kind: 'canceled' \};/.test(outcome));

// --- 7. callbacks / tokens duplicados -----------------------------------
check(
  '7: reconcileToken deduplica por processedTokensRef antes de pegarle al backend',
  /if \(processedTokensRef\.current\.has\(token\)\)/.test(provider) &&
    provider.indexOf('processedTokensRef.current.has(token)') < provider.indexOf('await postGooglePlayReconcile(token)'),
);
check('7: los resultados terminales se marcan procesados (outcomeIsTerminalForToken)', /if \(outcomeIsTerminalForToken\(outcome\)\) \{\s*processedTokensRef\.current\.add\(token\);/.test(provider));
check('7: un replay espontaneo (resume, sin flujo activo) reconcilia en silencio, sin tocar la UI del paywall', /const driving = inFlightRef\.current;/.test(provider) && /if \(!driving\) return;/.test(provider));
check('7: guard de concurrencia -- una sola compra/restore a la vez (inFlightRef)', /if \(inFlightRef\.current\) return;/.test(provider));

// --- 8. pending / cancelled no conceden --------------------------------
check("8: UserCancelled -> 'cancelled' (no error, no refresh)", /case ErrorCode\.UserCancelled:\s*setPurchaseError\(null\);\s*setPurchaseFlow\('cancelled'\);/.test(provider));
check("8: Pending / DeferredPayment -> 'pending' (sin refresh)", /case ErrorCode\.Pending:\s*case ErrorCode\.DeferredPayment:\s*setPurchaseError\(null\);\s*setPurchaseFlow\('pending'\);/.test(provider));
check('8: purchase-outcome documenta que solo verified concede + selectRestorableSubscriptionTokens salta pending', /p\.purchaseState === 'pending'/.test(outcome));

// --- 9. restore por backend -------------------------------------------
check('9: runRestore recorre getAvailablePurchases() y reconcilia CADA token por backend', /await getAvailablePurchases\(\)/.test(provider) && /for \(const token of tokens\) \{\s*const outcome = await reconcileToken\(token\)/.test(provider));
check('9: restore NO concede entitlement local -- solo reconcileToken (mismo path que la compra)', /const runRestore = useCallback\(/.test(provider) && !/runRestore[\s\S]*?set(Premium|Tier|Entitlement|IsPremium)\s*\(/i.test(provider));

// --- 10. dedupe de tokens --------------------------------------------
check('10: selectRestorableSubscriptionTokens deduplica con un Set', /const seen = new Set<string>\(\)/.test(outcome) && /if \(seen\.has\(token\)\) continue;/.test(outcome));
check('10: el filtro exige el producto congelado zetrynd_premium y descarta tokens vacios/pending', /ids\.has\(ZETRYND_PREMIUM_PRODUCT_ID\)/.test(outcome));

// --- 11. token no loggeado / persistido / en UI ----------------------
check('11: lib/billing NO tiene console.* (ningun log de token ni de nada)', !/console\.(log|info|warn|error|debug)\(/.test(providerSrc + outcomeSrc));
check('11: lib/billing NO persiste el token (AsyncStorage / SecureStore / MMKV)', !/AsyncStorage|SecureStore|expo-secure-store|MMKV|@react-native-async-storage/.test(billingBlob));
check('11: purchase-outcome NUNCA devuelve el token dentro de un ReconcileOutcome (solo `kind`)', !/kind:\s*'[a-z_]+',\s*token/.test(outcome) && !/token:\s*(string|token)/.test(stripComments(outcomeSrc).replace(/selectRestorableSubscriptionTokens[\s\S]*?\n\}/, '')));
check('11: el paywall NO renderiza premiumProduct.offerToken ni ningun token', !/offerToken|purchaseToken/.test(paywall));

// --- 12. gate PB-2A superseded, no borrado --------------------------
const foundationGate = read('scripts', 'verify-mobile-billing-foundation-gate.ts');
check('12: verify-mobile-billing-foundation-gate.ts sigue existiendo', foundationGate.length > 0);
check('12: y marca EXPLICITAMENTE que PB-2B supersede sus checks de "sin compra"', /PB-2B/.test(foundationGate) && /supersed|SUPERSED/.test(foundationGate));

// --- 13. invariantes PB-1A / PB-1B ---------------------------------
check('13: postGooglePlayReconcile NO manda accountId / productId / tier / state', !/reconcile'[\s\S]{0,200}(accountId|productId|tier|state)\s*:/.test(api));
check('13: getSubscriptionSummary sigue siendo GET de solo lectura', /apiRequest\('GET', '\/me\/subscription', \{ schema: subscriptionSummaryResponseSchema \}\)/.test(api));
check('13: los 3 wrappers usan los schemas Zod de @axioma/contracts (validacion en cliente)', /googlePlayBillingContextResponseSchema/.test(api) && /subscriptionReconcileResponseSchema/.test(api) && /subscriptionSummaryResponseSchema/.test(api));

// --- 14. sin segunda pila de billing ------------------------------
const mobilePkg = JSON.parse(read('package.json'));
const allDeps = { ...mobilePkg.dependencies, ...mobilePkg.devDependencies };
check('14: package.json sin react-native-iap / react-native-purchases / RevenueCat / purchasely', !Object.keys(allDeps).some((d) => /react-native-iap|react-native-purchases|@revenuecat|purchasely/.test(d)));
check('14: lib/billing NO importa una segunda pila de billing', !/react-native-iap|react-native-purchases|RevenueCat|purchasely/.test(billingBlob));
check('14: expo-iap es la unica dependencia de billing (dependencies)', typeof allDeps['expo-iap'] === 'string');

// --- 15. sin autoridad de precio estatico para compra en vivo -----
check('15: el paywall toma el precio en vivo de billing.premiumProduct.localizedPrice', /billing\.premiumProduct/.test(paywall) && /localizedPrice/.test(paywall));
check(
  '15: PREMIUM_PRICE_DISPLAY solo se usa como fallback cuando NO hay liveProduct, y etiquetado "referencial"',
  /displayPrice = liveProduct \? liveProduct\.localizedPrice : PREMIUM_PRICE_DISPLAY/.test(paywall) &&
    /[Pp]recio referencial/.test(paywall),
);
check(
  '15: el boton de compra SOLO se renderiza con liveProduct (sin metadata Google -> sin compra)',
  /liveProduct \?\s*\(\s*<Button[\s\S]{0,200}label="Suscribirme"/.test(paywall) &&
    /const canPurchase = liveProduct !== null && !billing\.busy/.test(paywall),
);
check('15: el literal 6.990 / CLP NO esta hard-codeado en el paywall (solo via pricing.ts)', !/6[.,]990|\bCLP\b/.test(paywall));

// --- acknowledge = backend ---------------------------------------
check(
  'ACK: el movil NUNCA llama finishTransaction / acknowledgePurchaseAndroid / consumePurchaseAndroid (el backend acknowledgea)',
  !/finishTransaction|acknowledgePurchaseAndroid|consumePurchaseAndroid|acknowledgePurchase\b/.test(billingBlob + paywall),
);
check('ACK: el provider documenta que el acknowledge es del backend', /acknowledge[\s\S]{0,120}BACKEND|BACKEND[\s\S]{0,120}acknowledge/i.test(providerSrc));

// --- una sola conexion useIAP ----------------------------------
check('LIFECYCLE: exactamente un useIAP() (se EXTIENDE el provider PB-2A, no un 2do ciclo)', (provider.match(/useIAP\(/g) ?? []).length === 1);

// --- higiene de repo ------------------------------------------
check('REPO: sin apps/mobile/android/ trackeado (CNG / gitignored)', !existsSync(join(REPO_ROOT, 'apps', 'mobile', 'android', '.gitkeep')));

console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.\nGate PB-2B (orquestacion de compra): FAIL\n`);
  process.exit(1);
}
console.log('Gate PB-2B (orquestacion de compra / reconcile / restore): PASS\n');
process.exit(0);
