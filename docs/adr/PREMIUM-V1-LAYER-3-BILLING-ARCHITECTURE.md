# PREMIUM V1 — LAYER 3 / GOOGLE PLAY BILLING — ARCHITECTURE & REPO READINESS AUDIT

## Estado

**C3.0 — AUDITORÍA DE ARQUITECTURA (READ-ONLY). NO IMPLEMENTADO.**

Este documento es el único artefacto de C3.0. **No** modifica código, `package.json`, proyectos nativos, configuración de Google Play, ni el esquema Prisma. **No** declara la Capa 3 implementada.

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD | `2340099` `docs(premium): correct layer 2 closure evidence` |
| Fecha | 2026-09-02 |
| Capa 1 (backend entitlement) | CLOSED (`7bf735f`) |
| Capa 2 (mobile entitlement UX) | CLOSED (`969dd2e` + `2340099`) |

Fuentes oficiales consultadas (Google, septiembre 2026) — ver §R.

---

## 0. Objetivo, scope y no-goals

### 0.1 Objetivo de la Capa 3

Conectar **Google Play Billing real** y el **ciclo de vida de suscripción** a ZETRYND, manteniendo intacto el modelo de authorization de la Capa 1: el backend es la única autoridad; los servicios de producto siguen leyendo **sólo** `AccountEntitlement` (`{ tier: FREE | PREMIUM }`).

### 0.2 V1 comercial (congelado)

- **Un** tier Premium. Sin múltiples tiers.
- Precio de lanzamiento Chile: **`$6.990 CLP / mes`** (autoridad final = metadata de producto de Google Play).
- Solo **mensual**, **auto-renovable**. Sin plan anual V1.
- **Sin** prueba gratuita inicial. **Sin** oferta introductoria inicial. **Sin** plan prepago.
- Beneficios Premium: todas las unidades · catálogo Recursos · iniciar Ensayos · cupo ampliado del Tutor IA · sin publicidad.

### 0.3 Regla de arquitectura crítica

```
AccountSubscription  ≠  AccountEntitlement

AccountSubscription  = verdad de billing/suscripción (estado de Google Play verificado)
AccountEntitlement   = authorization de producto (lo único que consumen Estudio / Ensayos / Tutor / Ads)

Billing RECONCILIA entitlement.
Las superficies de producto NUNCA leen el estado de suscripción de Google Play directamente.
```

Cancelar la auto-renovación **NO** produce FREE inmediatamente. El suscriptor sigue PREMIUM hasta el fin del periodo ya pagado. El *grace period* conserva el entitlement. *Account hold* / expiración / revocación se mapean según el estado autoritativo de Google Play (§E).

### 0.4 No-goals de la Capa 3 completa

Publicidad / AdMob (bloque separado; sólo se congela que Ads consumirá `entitlement`) · web billing · iOS / App Store (proyecto Android-only por ahora) · plan anual · pruebas / ofertas introductorias · cambio de precio a suscriptores existentes · pausar suscripción · upgrade/downgrade entre tiers (no hay más de uno).

### 0.5 No-goals de C3.0 (este incremento)

Sin push · sin Railway · sin migración Prisma · sin cambios en Google Play Console · sin instalación de paquetes · sin `expo prebuild` · sin modificación nativa Android · sin SDK de Billing · nunca `git add .`.

---

## A. Auditoría de preparación del repo (hechos)

### A.1 Mobile — configuración actual

| Aspecto | Hecho verificado |
|---|---|
| Expo SDK | `expo ~54.0.36` |
| React Native | `0.81.5` · React `19.1.0` |
| Router | `expo-router ~6.0.24`, `typedRoutes: true` |
| Native modules presentes | `expo-constants`, `expo-crypto`, `expo-linking`, `expo-secure-store`, `expo-sqlite`, `expo-status-bar`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`. **Ningún módulo de IAP.** |
| `firebase` (JS SDK) | `12.17.0` — presente para identidad; hoy `AUTH_IDENTITY_CLIENT=stub` en dev. |
| New Architecture | `newArchEnabled=true` (`android/gradle.properties`) |
| Hermes | `hermesEnabled=true` |
| `expo-dev-client` | **NO instalado** (ni en `dependencies` ni en `node_modules`) |
| `eas.json` | **No existe.** Sin EAS Build configurado. |
| `app.config.*` | No existe. Config vive en `app.json`. |
| Config plugins declarados | sólo `"expo-router"` |
| `android/` | **Gitignored** (`.gitignore:13` + `apps/mobile/.gitignore:41`, 0 archivos trackeados). Es un artefacto local generado por **CNG / prebuild-on-demand** (`npx expo prebuild` / `expo run:android`). La fuente de verdad nativa es `app.json` + plugins. |
| `applicationId` / `namespace` | `com.zetrynd.app` (dev y release; **sin flavor split / sin sufijo `.dev`**) |
| `versionCode` / `versionName` | `1` / `"0.1.0"` (en `app.json` como `0.1.0` / versionCode `1`) |
| Firma | `release` usa **`signingConfigs.debug`** — temporal, sin keystore de producción (documentado en `docs/adr/TESTER-DISTRIBUTION-1C-CLOSURE-REPORT.md` §2). |
| Workflow APK/AAB | Build local en la máquina del Product Owner: `.\gradlew.bat assembleRelease` → `app-release.apk`, instalado con `adb install -r`. Serie `TESTER-DISTRIBUTION-1A/1B/1C` (primera APK de testers); `1D.2` = preparación de deploy de backend remoto. Sin AAB, sin CI/CD, sin OTA. |
| Entorno de build Android | Documentado como frágil en `docs/ANDROID-BUILD-ENVIRONMENT-STATUS.md` (fallos de link C++/CMake resueltos moviendo el SDK a `C:\Android\Sdk`; el agente **no puede** compilar Android — limitación de sandbox; el Product Owner compila en su máquina). |
| QA físico | Samsung `R5CW71R7MTP`, **debug build local conectado a Metro** (no Expo Go — la existencia del `android/` generado + los intentos de bundle release lo confirman). Nunca emulador. |

### A.2 Backend — configuración actual

| Aspecto | Hecho verificado |
|---|---|
| Framework | NestJS (`@nestjs/common/core/platform-express/config/schedule/throttler`) |
| ORM | Prisma (`@prisma/client` + `@prisma/adapter-pg` + `pg`) |
| Migraciones | 47 en `apps/backend/prisma/migrations/`, nombre con prefijo timestamp manual (`YYYYMMDDHHMMSS_slug`). Aplicadas con `prisma migrate dev` (local) / `prisma migrate deploy`. |
| Identidad / cuenta | Firebase (`firebase-admin`). `Account.id` UUID. `AuthIdentity(providerCode='firebase', providerSubject=<Firebase UID>)`, `@@unique([providerCode, providerSubject])`. `AuthSession` propia y revocable. **`Account` no tiene ninguna relación de billing/suscripción.** |
| Entitlement (Capa 1) | `apps/backend/src/entitlement/` — `EntitlementService.getEntitlement(accountId) → { tier }`. Módulo **transversal** (`EntitlementModule` importa sólo `Auth`/`Config`/`InternalOps`; los módulos de dominio lo importan a él). `GET /me/entitlement` (AuthGuard, schema estricto `{ tier }`). `POST /_internal/entitlement/set-tier-override` (`InternalOpsGuard` + rechazo en producción; override in-memory para gates). |
| **Frontera ya congelada en código** | El docstring de `EntitlementService` **ya declara** la derivación de la Capa 3: *"cuando exista `AccountSubscription` (`autoRenew`, `currentPeriodEnd`, token de store), este método derivará el tier de la VIGENCIA del periodo — `tier = (subscription && subscription.currentPeriodEnd > now) ? 'PREMIUM' : 'FREE'`. Cancelar la renovación automática NO degrada… Este es el ÚNICO archivo que cambia cuando llegue esa fuente de verdad."* |
| Config / secrets | `@nestjs/config` + `dotenv`. Patrón de credenciales de service-account: **JSON completo en variable de entorno** (`FIREBASE_SERVICE_ACCOUNT_JSON`). |
| Endpoints internos / webhooks | `InternalOpsGuard` (`x-internal-ops-key`) para operaciones internas del equipo. **No hay** endpoint público sin auth, ni configuración de raw-body, ni cliente de Pub/Sub, ni `googleapis`. |
| Schedulers | `@nestjs/schedule` usado ampliamente (`gamification`, `analytics`, `privacy`, `leaderboard`…). Patrón disponible para un barrido de reconciliación. |
| Cliente HTTP saliente | `fetch` nativo (Anthropic vía `@anthropic-ai/sdk`). Sin `axios`/`got`. Falta `googleapis` / `google-auth-library` / `@google-cloud/pubsub`. |
| Convención de gates | `verify-*-gate.ts` en `scripts/`, ejecutados vía `scripts/run-gate.ts` (aisla la DB a `axioma_gates_dev`, nunca `axioma_dev`; antepone `http://127.0.0.1:3001`). Gates puros = `tsx` + stubs. |
| Ledger de uso IA | `AiUsageLedgerEntry(accountId, operationId @unique, …)` — el consumo del Tutor se registra por cuenta, **independiente del tier**. Confirma que subir/bajar de plan **no** resetea la cuota. |

### A.3 Consecuencia técnica de añadir una dependencia IAP nativa

**Pregunta obligatoria: ¿el runtime de QA actual puede ejecutar Google Play Billing?**

**Respuesta (basada en el repo + documentación oficial de Expo, sept 2026): SÍ y NO — depende del build.**

- El QA actual **NO usa Expo Go** — usa un **debug build nativo compilado localmente** del proyecto CNG (Metro conectado). La documentación de Expo es explícita: *"In-app purchase libraries require configuring custom native code. Native code is not configurable when using Expo Go."* Si el equipo estuviera en Expo Go, Billing sería imposible sin cambiar de runtime.
- Como ZETRYND **ya compila su propio binario nativo** (`expo run:android` / `gradlew assembleDebug`), añadir una dependencia IAP **no obliga a un cambio de paradigma**: es exactamente la clase de módulo nativo que un CNG build ya soporta. Lo que cambia:
  1. La dependencia se añade a `apps/mobile/package.json` y (según la librería) su **config plugin** a `app.json`.
  2. Un `npx expo prebuild --clean` regenera `android/` con el módulo autolinkeado.
  3. Un **rebuild nativo** del debug APK (no basta un reload de Metro).
  4. Google Play Billing exige una **app configurada en Play Console** (mismo `packageName`) para poder consultar `ProductDetails` y lanzar el flujo de compra. **No** exige que el binario venga descargado de un track de Play: la documentación oficial de Google establece que los **License Testers** eluden el requisito de "firmado y subido a Play" y pueden probar **apps sideloadeadas, incluidas builds de debug firmadas con la firma de debug**, siempre que (a) el `packageName` coincida con la app configurada en Play Console y (b) la cuenta de Google del dispositivo esté configurada como License Tester. Con eso, un **debug APK sideloadeado + License Tester** puede: consultar `ProductDetails` reales, ejecutar `launchBillingFlow`, obtener `purchaseToken` reales (de prueba, sin cargo) y ejercitar el `subscriptionsv2.get` real del backend. Ver §M.
- **Transición mínima a un "development build" de ZETRYND** (a ejecutar en C3.5, **no** en C3.0):
  1. añadir/configurar el módulo IAP nativo elegido (dependencia + config plugin si aplica);
  2. regenerar el proyecto nativo vía CNG/prebuild según lo requiera el módulo;
  3. **rebuild/reinstalar** ZETRYND en el Samsung físico;
  4. **continuar** con el workflow Metro + Samsung físico (`expo start` + build instalado).

  `expo-dev-client` **no es obligatorio** — Expo soporta development builds sin ese paquete, y ZETRYND ya compila su propio binario de debug + Metro. `expo-dev-client` queda como **herramienta opcional/recomendada** a evaluar en C3.5 (aporta el dev-menu y una carga de Metro más flexible sobre un binario con módulos nativos), no como prerrequisito de arquitectura. Un `flavor`/`applicationId` de desarrollo distinto (hoy ambos son `com.zetrynd.app`) es igualmente opcional, sólo si se quiere instalar dev y prod en paralelo.

**Conclusión A**: no hay un salto de arquitectura de runtime. Se requiere: (a) app + producto configurados en Play Console y una cuenta **License Tester** en el dispositivo; (b) un **rebuild nativo** al integrar el módulo IAP. El **primer QA físico de Billing NO requiere un Internal Track** — basta el debug APK sideloadeado actual + License Tester. El Internal Track sigue siendo **recomendado y obligatorio más adelante** para el QA pre-release realista de distribución y antes del cierre de la Capa 3. El sandbox del agente **no puede** compilar Android — todo build nativo lo ejecuta el Product Owner.

---

## B. Baseline actual de Google Play Billing y enfoque de integración

### B.1 Qué generación de Billing Library usar hoy

| Hecho oficial (sept 2026) | Consecuencia para ZETRYND |
|---|---|
| Última: **Play Billing Library 9.1.0** (Google I/O 2026). | — |
| **Desde el 31-ago-2026**, apps nuevas y updates de apps existentes deben usar **PBL 8 o superior** (extensión posible hasta 1-nov-2026). | ZETRYND es una integración nueva → **PBL 8+ es obligatorio**. No se elige v7 de tutoriales viejos. |
| Ciclo de deprecación de 2 años por versión. Binarios v7 ya publicados siguen transaccionando, pero no se puede publicar un release nuevo con ellos. | Objetivo: la versión que traiga el wrapper elegido, **≥ 8**; preferible **9.x** para maximizar la ventana de soporte. |
| El wrapper (expo-iap / react-native-purchases) es quien fija la versión de PBL empaquetada. | La decisión práctica es *qué wrapper*, no *qué PBL* directamente. **Invariante de implementación para C3.5**: tras instalar el bridge RN/Expo elegido, **inspeccionar y registrar la versión de `com.android.billingclient:billing` realmente resuelta** en el proyecto Android (`./gradlew :app:dependencies` / árbol de dependencias), en vez de asumir la generación de PBL del wrapper. Objetivo: una PBL **actualmente soportada, preferiblemente 9.x** si el wrapper mantenido elegido la soporta. Evitar PBL 7 para una integración nueva. |
| Verificación de compra server-side: **`purchases.subscriptionsv2.get`** de la Google Play Developer API (`androidpublisher` v3). Es *"the source of truth for subscription management"*. Scope OAuth `https://www.googleapis.com/auth/androidpublisher`. | El backend necesita `googleapis` (o `google-auth-library` + fetch), una **service account** con acceso a la Play Console, y `purchases.subscriptionsv2.get` como llamada canónica. |

### B.2 Enfoques de integración evaluados para ESTE repo

| Criterio | Integración nativa directa (`react-native-iap` sin Expo) | **`expo-iap`** (wrapper mantenido para Expo, sobre Play Billing / StoreKit2, spec OpenIAP) | RevenueCat (`react-native-purchases` + backend RevenueCat) |
|---|---|---|---|
| Autoridad del backend | Total (ZETRYND verifica). | Total (ZETRYND verifica). | **Compartida**: RevenueCat verifica y mantiene el estado; ZETRYND consultaría a RevenueCat o recibiría sus webhooks. Fricción con el dominio propio de entitlement ya existente. |
| Google Play Developer API | ZETRYND la llama directo (`subscriptionsv2.get`). | ZETRYND la llama directo. | RevenueCat la llama; ZETRYND normalmente **no** ve `SubscriptionPurchaseV2` crudo salvo vía su API. |
| RTDN / Pub/Sub | ZETRYND recibe RTDN directo. | ZETRYND recibe RTDN directo. | RevenueCat consume el RTDN; ZETRYND recibe **webhooks de RevenueCat** (otra forma, otro contrato). |
| Acceso a `purchaseToken` | Directo. | Directo. | Disponible, pero el flujo canónico es el `RCPurchaserInfo`/entitlement de RevenueCat. |
| Compatibilidad Expo / CNG | Requiere manejar autolinking + (a veces) parches; menos "Expo-first". | **Diseñado para binarios nativos propios de Expo**, con config plugin. Menor fricción de prebuild. `expo-dev-client` opcional. | Config plugin oficial, compatible con CNG. Requiere un binario nativo propio (no Expo Go); `expo-dev-client` opcional. |
| Dependencia de proveedor / lock-in | Ninguna. | Ninguna (OpenIAP es un estándar; el proyecto es de la comunidad Expo, activo). | **Alta**: el estado de suscripción vive en RevenueCat; migrar fuera después es costoso. |
| Coste | $0. | $0. | Gratis hasta ~$2.5k USD MTR/mes; luego % de ingresos. Para un lanzamiento de pago en CLP puede ser irrelevante al principio y relevante después. |
| Testabilidad | License Testing sobre debug APK sideloadeado (primer QA físico); track interno recomendado después. Fakes propios en backend. | Igual. | RevenueCat añade su propio sandbox/dashboard, pero también su propia superficie a mockear. |
| Mantenimiento | Alto (autolinking, versiones de PBL, edge cases del ciclo de vida a mano). | Medio (el wrapper sigue las versiones de PBL; el ciclo de vida sigue siendo responsabilidad del backend de ZETRYND). | Bajo del lado cliente; el ciclo de vida lo lleva RevenueCat — pero a cambio de ceder la fuente de verdad. |
| Encaje con ZETRYND | — | **Alto**: ZETRYND ya tiene un backend NestJS real y un dominio de entitlement propio y cerrado (Capas 1–2). El wrapper sólo aporta el puente cliente↔Play; toda la lógica de negocio queda en casa. | Bajo: duplicaría / desplazaría un dominio que ya está construido y aprobado. |

### B.3 Recomendación

**`expo-iap`** como puente cliente, con **verificación y ciclo de vida 100 % en el backend NestJS de ZETRYND** (Google Play Developer API + RTDN + `AccountSubscription` propio).

Razonamiento:

1. ZETRYND **ya invirtió** en un dominio de authorization propio, cerrado y auditado (Capa 1: `EntitlementService`, `PremiumContentPolicy`, enforcement en 5 puntos). RevenueCat resolvería un problema que ZETRYND ya resolvió, a cambio de mover la fuente de verdad fuera del sistema y añadir lock-in + coste sobre umbral de ingresos.
2. `expo-iap` minimiza la fricción de prebuild/CNG (está diseñado para binarios nativos propios de Expo, `expo-dev-client` opcional) sin imponer un backend de terceros. Empaqueta Play Billing moderno; en C3.5 se registra la versión de `com.android.billingclient:billing` realmente resuelta (invariante de B.1) — objetivo PBL soportada, preferiblemente 9.x.
3. El backend llamando `purchases.subscriptionsv2.get` directamente da a ZETRYND el `SubscriptionPurchaseV2` **crudo y autoritativo** — exactamente lo que la regla de arquitectura §0.3 exige (billing reconcilia entitlement; las superficies no leen Play directo).
4. Riesgo asumido: ZETRYND implementa a mano el mapeo de estados del ciclo de vida (§E) y la idempotencia de RTDN (§H). Es trabajo real pero acotado y testeable, y mantiene la coherencia con el resto del backend.

**Decisión abierta para producto** (§Q-1): confirmar `expo-iap` vs RevenueCat. La recomendación técnica es `expo-iap` + backend propio.

---

## C. Modelo de producto de Google Play

**No crear nada en Play Console en C3.0.** Se proponen identificadores estables.

### C.1 Jerarquía

```
Subscription (product)              ← "qué es": ZETRYND Premium, beneficios, metadata
  └── Base plan (monthly, auto-renewing)   ← "cómo se cobra": periodo mensual, renovación, precio por región
        └── Offer (ninguna en V1)           ← "descuento temporal": trials, intro pricing → NO V1
```

| Elemento | Qué contiene | ZETRYND V1 |
|---|---|---|
| **Subscription** | Nombre visible, descripción, beneficios, si concede acceso a algo, tags. **No** tiene precio. | 1 subscription: "ZETRYND Premium". |
| **Base plan** | Tipo (auto-renewing / prepaid), **periodo de facturación**, **precios por región/moneda**, grace period, account hold, resubscribe, proration. El precio **vive aquí**. | 1 base plan: mensual, auto-renovable, precio CLP fijado en Play Console (`$6.990` de lanzamiento). |
| **Offer** | Descuentos temporales (free trial, intro price, developer-determined) sobre un base plan. | Ninguna en V1. |

### C.2 IDs candidatos (production-safe, sin codificar precio mutable)

| Concepto | ID candidato | Notas |
|---|---|---|
| Subscription product id | `zetrynd_premium` | Minúsculas, sin versión, sin precio, sin región. Estable de por vida del producto. |
| Monthly base plan id | `premium-monthly` | Los base plan ids usan `-` (no `_` ni mayúsculas — restricción de Play). Describe *cadencia*, no precio ni país. |
| (futuro) Annual base plan id | `premium-annual` | Reservado, **no** V1. |
| (futuro) Offer ids | `premium-monthly-trial-7d`, `premium-monthly-intro-cl` | Reservados, **no** V1. |

Reglas: los IDs **nunca** contienen el precio, el país, "6990", "clp", ni un número de versión. El precio de producción se lee de la metadata de Play (`ProductDetails` en el cliente; `basePlanId` + región en el backend). No se crean offers V1.

**Decisión abierta para producto** (§Q-2): aprobar `zetrynd_premium` / `premium-monthly` como IDs definitivos antes de crearlos en Play Console.

---

## D. Modelo de dominio backend — `AccountSubscription` (diseño, sin migrar)

### D.1 Principio

`AccountSubscription` es la **proyección persistida de la verdad de Google Play** para una cuenta. **No** es el entitlement. Un solo servicio (`SubscriptionService`) la escribe, siempre a partir de una respuesta verificada de `purchases.subscriptionsv2.get`. `EntitlementService` la **lee** para derivar el tier (§E).

### D.2 Campos — clasificados

#### D.2.a Autoritativos (necesarios para el ciclo de vida de producto/billing)

| Campo | Tipo | Origen | Por qué |
|---|---|---|---|
| `id` | UUID PK | — | — |
| `accountId` | UUID FK → `account.id` | binding en el flujo de compra (§F) + `obfuscatedAccountId` | vínculo cuenta↔suscripción |
| `provider` | enum `SubscriptionProvider` (`GOOGLE_PLAY`) | constante | preparar iOS/otros sin re-migrar |
| `productId` | String | `SubscriptionPurchaseV2` / token | qué producto (`zetrynd_premium`) |
| `basePlanId` | String? | `SubscriptionPurchaseV2.lineItems[].offerDetails.basePlanId` | qué cadencia; útil para el futuro plan anual |
| `purchaseToken` | String **@unique** | compra / RTDN | identidad de la suscripción en Play; clave de idempotencia |
| `linkedPurchaseToken` | String? | `SubscriptionPurchaseV2` (resubscribe / upgrade) | rotación de token — ver D.4 |
| `state` | enum `SubscriptionState` | `SubscriptionPurchaseV2.subscriptionState` mapeado | estado del ciclo de vida (§E) |
| `expiryTime` | DateTime? | `lineItems[].expiryTime` (o `expiryTimeMillis`) | **`currentPeriodEnd`** — la fecha que decide `PREMIUM` vs `FREE` |
| `startTime` | DateTime? | `SubscriptionPurchaseV2.startTime` | inicio de la suscripción |
| `autoRenewing` | Boolean | `lineItems[].autoRenewingPlan.autoRenewEnabled` | **diagnóstico de intención**, NO decide el tier (§E) |
| `acknowledgementState` | enum (`PENDING` / `ACKNOWLEDGED`) | `SubscriptionPurchaseV2.acknowledgementState` | gate de 3 días — si no se acknowledgea, Google reembolsa y revoca |
| `latestNotificationType` | String? | RTDN `subscriptionNotification.notificationType` | último evento conocido |
| `latestEventTime` | DateTime? | RTDN `eventTimeMillis` / respuesta de la API | ordenar eventos, descartar RTDN atrasados |
| `createdAt` / `updatedAt` | DateTime | Prisma | — |

#### D.2.b Diagnóstico / auditoría (persistir, pero ningún consumidor de producto los lee)

| Campo | Notas |
|---|---|
| `cancelReason` / `cancelUserInitiated` / `cancelTime` | de `canceledStateContext` — sólo para la pantalla de gestión (§K) y soporte. |
| `regionCode` | `SubscriptionPurchaseV2.regionCode` — país de la compra, para analytics/fraude. |
| `testPurchase` | `true` si `SubscriptionPurchaseV2.testPurchase` presente — nunca debe llegar a producción; señal de QA. |
| `rawSnapshot` | `Json?` — **la última respuesta completa de `subscriptionsv2.get`**, para depuración y para poder re-derivar si el mapeo cambia. Con TTL/retención acotada (ver D.5). |

#### D.2.c NO persistir

- El `Purchase` crudo del cliente (payload de `expo-iap`) — **nunca** es autoridad; se usa sólo para obtener el `purchaseToken` que se manda al backend y se descarta.
- Datos de pago / tarjeta / método de pago — Google nunca los expone y ZETRYND no debe intentar inferirlos.
- El precio pagado como número de negocio propio — el precio mostrado se lee de Play en el cliente; el backend no necesita persistir montos para V1 (analytics de ingresos = bloque separado, y saldría de Play Console / RevenueCat-si-se-usara).
- `obfuscatedAccountId` / `obfuscatedProfileId` en claro — ver §L.6 (se guarda un hash o se recomputa, no el identificador de cuenta en claro dentro de campos de Play).
- Tokens de servicio / credenciales de la service account — **jamás** en la base ni en el cliente (§L.9).

### D.3 Unicidad e idempotencia

- `purchaseToken` **@unique** global. Es la identidad canónica de una suscripción en Play.
- `@@unique([accountId, provider])` **NO** — una cuenta puede tener históricamente varias filas (una expirada + una nueva tras resubscribe con token nuevo). En su lugar: a lo sumo **una fila "vigente"** por `(accountId, provider)`, garantizada en lógica (`SubscriptionService`), no por constraint, porque el histórico es legítimo.
- Índices: `@@index([accountId])`, `@@index([state])` (para el barrido de reconciliación), `@@index([expiryTime])` (para detectar expiraciones sin RTDN).
- Toda escritura pasa por un `upsert` por `purchaseToken` + comparación de `latestEventTime` (descarta eventos más viejos que el estado ya guardado).

### D.4 Rotación de token / linked tokens

Google **rota el `purchaseToken`** en varios casos (resubscribe tras expirar, upgrade/downgrade de plan — no aplica V1, restore en algunos flujos). El nuevo `SubscriptionPurchaseV2` trae `linkedPurchaseToken` apuntando al anterior.

Regla:

1. Al procesar un token nuevo con `linkedPurchaseToken` presente: buscar la fila del token viejo, marcarla `SUPERSEDED` (estado terminal interno), y crear/actualizar la fila del token nuevo con `accountId` **heredado** de la vieja (no confiar sólo en `obfuscatedAccountId` del token nuevo, que puede venir vacío en restore).
2. Nunca borrar la fila vieja — se conserva para auditoría y para resolver RTDN atrasados que aún referencian el token viejo.
3. Si un RTDN llega con un token que ya está `SUPERSEDED`: consultar la API igualmente; si Google devuelve un estado terminal coherente, ignorar; si no, alertar (posible desincronización).
4. **`SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED`** (compra pendiente cancelada — C3.2 hardening): el `linkedPurchaseToken` NO indica un reemplazo completado, sino uno que **se canceló antes de completarse**. El token cancelado **nunca es una fila** (`AccountSubscription`), **nunca acknowledgea** y **nunca marca `SUPERSEDED`** a la suscripción linkeada. Con `linkedPurchaseToken` presente se reconsulta y reconcilia esa suscripción existente (por sus efectos — el entitlement se deriva de ELLA); sin él, resultado neto = nada. Si la suscripción linkeada pertenece a otra cuenta → `SUBSCRIPTION_ACCOUNT_MISMATCH`, sin transferir. **El `status` del endpoint describe la disposición del token que el cliente envió: SIEMPRE `canceled` para un token en este estado**, aunque el entitlement resultante (vía `GET /me/entitlement`) sea PREMIUM por la suscripción previa. Devolver `verified` haría que el móvil interpretara un intento de compra cancelado como exitoso.

### D.5 Metadata cruda

`rawSnapshot: Json?` guarda **sólo la última** respuesta de `subscriptionsv2.get` (no un log de todas). Retención: mantener mientras la fila esté activa + N días tras un estado terminal, luego nullificar (barrido). Un `SubscriptionEvent` separado y append-only (opcional, decisión abierta §Q-6) podría registrar cada RTDN + respuesta para forense; si se añade, con retención estricta y sin PII.

### D.6 Enums propuestos

```
enum SubscriptionProvider { GOOGLE_PLAY }

enum SubscriptionState {
  PENDING          // compra creada, pago pendiente (signup) — NO concede entitlement
  ACTIVE           // vigente y pagada
  IN_GRACE_PERIOD  // pago falló, Google reintenta, usuario CONSERVA acceso
  ON_HOLD          // account hold — usuario PIERDE acceso
  CANCELED         // auto-renovación cancelada, pero `expiryTime` puede estar en el futuro → sigue PREMIUM hasta entonces
  EXPIRED          // terminó — FREE
  REVOKED          // reembolso / chargeback / revocación — FREE inmediato
  PAUSED           // no aplica V1 (pausa deshabilitada), pero mapeado por completitud → sin acceso
  SUPERSEDED       // interno: reemplazada por otra fila vía linkedPurchaseToken
}

enum SubscriptionAcknowledgementState { PENDING ACKNOWLEDGED }
```

Estos NO se exponen en ningún contrato de producto. `AccountEntitlement` sigue siendo `{ tier: FREE | PREMIUM }`.

---

## E. Derivación de entitlement (mapeo puro conceptual)

```
purchases.subscriptionsv2.get(purchaseToken)   ← autoridad de Google Play
        ↓  (SubscriptionService: verificar + mapear)
AccountSubscription.{ state, expiryTime, autoRenewing, acknowledgementState }
        ↓  (EntitlementService.getEntitlement: función pura de derivación)
AccountEntitlement { tier: FREE | PREMIUM }
        ↓
Estudio · Ensayos · Tutor IA · (futuro) Ads   ← consumen SÓLO `tier`
```

### E.1 Función de derivación (pura, testeable — el corazón de C3)

```
deriveTier(sub: AccountSubscription | null, now: Date): 'FREE' | 'PREMIUM'

  si sub == null                                   → FREE
  si sub.state == PENDING                          → FREE   (pago no confirmado)
  si sub.state == REVOKED                          → FREE   (reembolso/chargeback: inmediato)
  si sub.state == EXPIRED                          → FREE
  si sub.state == ON_HOLD                          → FREE   (Google ya bloquea; expiryTime en el pasado)
  si sub.state == PAUSED                           → FREE   (no aplica V1)
  si sub.state == SUPERSEDED                       → derivar de la fila que la reemplazó
  si sub.state ∈ { ACTIVE, IN_GRACE_PERIOD }       → PREMIUM
  si sub.state == CANCELED:
        si sub.expiryTime != null && sub.expiryTime > now  → PREMIUM   (periodo pagado sigue vigente)
        si no                                              → FREE
```

**Invariante clave**: el tier **nunca** se deriva de `autoRenewing`. `CANCELED` con `expiryTime` futuro = **PREMIUM**. Cancelar la renovación NO degrada.

Guarda de robustez: si `state ∈ {ACTIVE, IN_GRACE_PERIOD}` pero `expiryTime` está claramente en el pasado (> tolerancia), tratar como `EXPIRED` y forzar una reconsulta a la API (el estado guardado está stale).

### E.2 Tabla de ciclo de vida

| Evento del ciclo de vida | `SubscriptionState` (Google) | RTDN típico | `AccountSubscription.state` | Entitlement | Notas |
|---|---|---|---|---|---|
| Compra nueva (pago inmediato) | `SUBSCRIPTION_STATE_ACTIVE` | `SUBSCRIPTION_PURCHASED` | `ACTIVE` | **PREMIUM** | tras verificar + acknowledge (< 3 días). |
| Compra pendiente (método de pago diferido) | `SUBSCRIPTION_STATE_PENDING` | `SUBSCRIPTION_PURCHASED` con estado pending | `PENDING` | **FREE** | **NO** concede PREMIUM. Esperar a `ACTIVE`. |
| Pending → comprada | `ACTIVE` | `SUBSCRIPTION_PURCHASED` / `SUBSCRIPTION_RENEWED` | `ACTIVE` | **PREMIUM** | reconsultar; entonces conceder. |
| Pending → cancelada (compra pendiente INICIAL) | `SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED` (`linkedPurchaseToken` = null) | `SUBSCRIPTION_PENDING_PURCHASE_CANCELED` (tipo 20) | **ninguna fila** | **FREE** | nunca se concedió; disposición del mapper, no un `state`. Endpoint responde `canceled`. |
| Pending → cancelada (REEMPLAZO de una suscripción existente) | `SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED` (`linkedPurchaseToken` = A) | `SUBSCRIPTION_PENDING_PURCHASE_CANCELED` (tipo 20) | A **sin cambios** (NO `SUPERSEDED`) | **según A** | el reemplazo NO completó; se reconsulta y reconcilia A (`linkedPurchaseToken`), el entitlement se deriva de A. El token cancelado nunca es una fila. Endpoint responde `canceled` (disposición del token enviado), no `verified`. |
| Renovación | `ACTIVE` | `SUBSCRIPTION_RENEWED` | `ACTIVE` (nuevo `expiryTime`) | **PREMIUM** | actualizar `expiryTime`. |
| Usuario cancela auto-renovación, periodo pagado sigue | `CANCELED` (con `expiryTime` futuro) | `SUBSCRIPTION_CANCELED` | `CANCELED` | **PREMIUM** hasta `expiryTime` | `autoRenewing=false`. Mostrar "acceso hasta <fecha>" (§K). |
| Grace period (fallo de pago, Google reintenta) | `SUBSCRIPTION_STATE_IN_GRACE_PERIOD` | `SUBSCRIPTION_IN_GRACE_PERIOD` | `IN_GRACE_PERIOD` | **PREMIUM** | usuario conserva acceso; `queryPurchasesAsync` aún lo devuelve. |
| Account hold (grace agotado) | `SUBSCRIPTION_STATE_ON_HOLD` | `SUBSCRIPTION_ON_HOLD` | `ON_HOLD` | **FREE** | `expiryTime` en el pasado; `queryPurchasesAsync` **no** lo devuelve. Bloquear acceso. |
| Recuperación (usuario arregla el pago durante hold/grace) | `ACTIVE` | `SUBSCRIPTION_RECOVERED` / `SUBSCRIPTION_RESTARTED` | `ACTIVE` | **PREMIUM** | reconceder. |
| Expiración | `SUBSCRIPTION_STATE_EXPIRED` | `SUBSCRIPTION_EXPIRED` | `EXPIRED` | **FREE** | terminal. |
| Revocación / reembolso / chargeback | (estado revocado) | `SUBSCRIPTION_REVOKED` | `REVOKED` | **FREE inmediato** | no esperar a `expiryTime`. |
| Resubscribe (mismo usuario, token nuevo) | `ACTIVE` | `SUBSCRIPTION_RESTARTED` / `SUBSCRIPTION_PURCHASED` | fila nueva `ACTIVE`; vieja → `SUPERSEDED` | **PREMIUM** | `linkedPurchaseToken` (§D.4). |
| Deferred / pause-schedule / price-change / cancellation-scheduled | varios | `SUBSCRIPTION_DEFERRED`, `SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED`, `SUBSCRIPTION_PRICE_CHANGE_UPDATED`, `SUBSCRIPTION_CANCELLATION_SCHEDULED`, `SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED` | reconsultar y re-derivar; casi siempre no cambia el tier en V1 | — | registrar `latestNotificationType`; ningún efecto de producto salvo el que dicte el `state`+`expiryTime` re-consultados. |

Todos los RTDN → **reconsultar `subscriptionsv2.get`** → re-derivar. El RTDN nunca es la verdad final.

---

## F. Flujo de compra

### F.1 Secuencia canónica

```
[MÓVIL]                                    [BACKEND ZETRYND]                 [GOOGLE]
  1. queryProductDetails('zetrynd_premium')  ──────────────────────────────►  ProductDetails (precio localizado)
  2. usuario pulsa "Suscribirme"
  3. launchBillingFlow(offerToken,
        obfuscatedAccountId = hash(accountId))
  4. Play procesa el pago
  5. onPurchasesUpdated → Purchase{ purchaseToken, ... }   (NO es autoridad)
  6. POST /me/subscription/verify { purchaseToken }  ────►
                                                     7. subscriptionsv2.get(token) ──►  SubscriptionPurchaseV2
                                                     8. validar packageName + productId + obfuscatedAccountId
                                                     9. upsert AccountSubscription (por purchaseToken)
                                                    10. si state=ACTIVE && ackState=PENDING → acknowledge (API)
                                                    11. re-derivar AccountEntitlement
                                                    ◄── 12. 200 { entitlement: { tier } }   (o 202 si PENDING)
 13. entitlement.refresh()  → EntitlementProvider re-lee GET /me/entitlement
 14. paywall muestra éxito / pending / error
```

### F.2 Ordenamiento y semántica de fallos

| Situación | Comportamiento |
|---|---|
| **El `Purchase` del móvil nunca concede PREMIUM** | El cliente **sólo** extrae `purchaseToken` y lo POSTea. La UI muestra "verificando…" hasta el 200 del backend. El entitlement sólo cambia cuando el backend lo reconcilia. |
| **Compra pendiente** (`SUBSCRIPTION_STATE_PENDING`) | Backend responde `202` con `{ tier: FREE, pending: true }`. Móvil muestra "Pago pendiente — te avisaremos". **No** se concede acceso. Un RTDN posterior (`SUBSCRIPTION_PURCHASED` → `ACTIVE`) dispara la reconciliación real; el móvil lo recoge al refrescar entitlement (foreground). |
| **POST duplicado / retry** | El endpoint es **idempotente por `purchaseToken`**: `upsert` + comparación de `latestEventTime`. Reintentar con el mismo token converge al mismo estado. El cliente puede reintentar sin límite. |
| **App muerta tras el pago, antes del POST** | Al reabrir, el móvil ejecuta `queryPurchasesAsync()` (mismo mecanismo que Restore, §G) → encuentra la compra no reconciliada → POST. También: si el pago llegó a Google, el **RTDN `SUBSCRIPTION_PURCHASED`** ya habrá reconciliado la suscripción en el backend por su cuenta (vía `obfuscatedAccountId`), y el móvil sólo necesita `entitlement.refresh()`. Doble red de seguridad. |
| **Red perdida tras el pago** | El `purchaseToken` sobrevive en Google (`queryPurchasesAsync` lo devuelve hasta que se acknowledgea/expira). El móvil reintenta el POST al recuperar red o al siguiente arranque. Google **reembolsa y revoca a los 3 días** si nadie acknowledgea — por eso el acknowledge lo hace el **backend** en el paso 10, no el cliente, y el barrido de reconciliación (§H.4) es un tercer resguardo. |
| **Backend tiene éxito pero el cliente pierde la respuesta** | Estado ya reconciliado + acknowledgeado en el backend. El móvil, al no recibir 200, reintenta el POST → idempotente, 200 otra vez. El entitlement ya está PREMIUM; `refresh()` lo confirma. |
| **Acknowledged vs unacknowledged** | El backend acknowledgea SÓLO tras verificar `state=ACTIVE`. `acknowledgementState` se persiste. Un barrido detecta filas `ACTIVE` + `PENDING` con > X horas y re-acknowledgea (protección contra el reembolso a 3 días). |
| **Account mismatch** (el `obfuscatedAccountId` del token ≠ la cuenta autenticada que hace el POST) | Rechazar con `409 SUBSCRIPTION_ACCOUNT_MISMATCH`. No reconciliar. Registrar para fraude (§L). El móvil muestra "Esta compra está asociada a otra cuenta". |
| **Suscripción ya poseída** (`launchBillingFlow` devuelve `ITEM_ALREADY_OWNED`) | El móvil trata como "ya suscrito": ejecuta `queryPurchasesAsync` + POST para reconciliar (cubre el caso "compró en otro dispositivo / otra sesión"). No es un error de usuario. |
| **Verificación falla** (`subscriptionsv2.get` 4xx/5xx, packageName/productId no coincide) | `packageName`/`productId` no coincide → `400 SUBSCRIPTION_INVALID` + alerta de fraude. 5xx de Google → `503`, el móvil reintenta con backoff; el RTDN reconciliará igual. |

---

## G. Restore / reconciliación

### G.1 Qué significa "Restaurar compras" en ZETRYND

> El móvil **descubre** las compras de Play que posee la cuenta de Google del dispositivo (`queryPurchasesAsync`) y **envía sus `purchaseToken` al backend** para reconciliación autoritativa. El móvil **nunca** fija el entitlement por su cuenta.

Endpoint: `POST /me/subscription/restore { purchaseTokens: string[] }` → el backend verifica cada uno (`subscriptionsv2.get`), reconcilia, re-deriva, responde `{ entitlement: { tier } }`.

### G.2 Casos

| Caso | Comportamiento |
|---|---|
| **Instalación nueva** (misma cuenta Google + misma cuenta ZETRYND) | `queryPurchasesAsync` devuelve la suscripción activa → POST restore → backend reconcilia → PREMIUM. También el RTDN histórico ya dejó la fila reconciliada si el `obfuscatedAccountId` estaba bien; restore es el camino explícito del usuario. |
| **Usuario borra los datos de la app** | Igual que instalación nueva: `queryPurchasesAsync` + restore. La `AccountSubscription` en el backend nunca se perdió. |
| **Usuario cambia de teléfono** (misma cuenta Google, se re-loguea en ZETRYND) | Igual. El vínculo `accountId ↔ purchaseToken` vive en el backend. |
| **Compra de Play asociada a OTRA cuenta ZETRYND** | El backend detecta `obfuscatedAccountId` (o la fila existente) apuntando a otra cuenta → `409 SUBSCRIPTION_ACCOUNT_MISMATCH`. **No** se transfiere la suscripción. Mensaje al usuario: "Esta suscripción pertenece a otra cuenta de ZETRYND. Gestiónala desde esa cuenta o desde Google Play." (Política de transferencia = decisión abierta §Q-5.) |
| **Compra iniciada/reiniciada fuera de la app** (Play Store → "Resubscribe" desde la pantalla de suscripciones canceladas) | Genera un RTDN (`SUBSCRIPTION_RESTARTED` / `SUBSCRIPTION_PURCHASED`, token nuevo con `linkedPurchaseToken`) → el backend reconcilia sin intervención del cliente. El móvil lo ve al refrescar entitlement. |
| **Múltiples tokens devueltos** (histórico) | El backend procesa todos; la lógica de "fila vigente" (§D.3) elige el estado correcto. |

### G.3 `obfuscatedAccountId`

Se pasa en `launchBillingFlow` (`setObfuscatedAccountId`) y viaja en `SubscriptionPurchaseV2`. ZETRYND lo usa para:

1. **Atribución** — reconciliar un RTDN a una cuenta sin que el cliente POSTee (el RTDN sólo trae el token).
2. **Antifraude** — detectar un token presentado por una cuenta distinta de la que compró (§F.2 account mismatch).

Valor a usar: **un identificador opaco derivado del `accountId`** (p. ej. `sha256(accountId + salt)` truncado a ≤ 64 chars, el límite de Google), **no** el `accountId` UUID en claro y **no** un dato personal (Google prohíbe PII ahí). El backend mantiene el mapeo `obfuscatedAccountId → accountId` (columna indexada o recomputable con el salt). Decisión abierta §Q-4: hash con salt en env vs columna `obfuscatedAccountId @unique` en `Account`.

---

## H. Arquitectura RTDN

```
Google Play  ──(Real-time developer notification)──►  Cloud Pub/Sub topic
                                                          │  push subscription (HTTPS + OIDC)
                                                          ▼
                                       POST /_google/play-rtdn   (endpoint público, verificado por OIDC)
                                                          │  1. verificar el JWT OIDC de Google (audience = la URL del endpoint)
                                                          │  2. decodificar el mensaje Pub/Sub (base64 → JSON)
                                                          │  3. extraer purchaseToken + notificationType
                                                          ▼
                                       SubscriptionService.reconcileFromNotification(token)
                                                          │  4. purchases.subscriptionsv2.get(token)   ← AUTORIDAD
                                                          │  5. upsert AccountSubscription (idempotente por token + eventTime)
                                                          ▼
                                       EntitlementService  → AccountEntitlement re-derivado
                                                          │  6. ACK 200 a Pub/Sub (siempre, salvo error transitorio → 5xx para reintento)
```

### H.1 El RTDN NO es la verdad

Confirmado por la doc oficial: *"This endpoint [`purchases.subscriptionsv2.get`] provides the latest subscription state given a purchase token and is considered the source of truth."* El backend **siempre** llama a la API tras un RTDN; nunca actúa sobre el `notificationType` a ciegas.

### H.2 Tipos cubiertos

`SUBSCRIPTION_PURCHASED`, `SUBSCRIPTION_RENEWED`, `SUBSCRIPTION_IN_GRACE_PERIOD`, `SUBSCRIPTION_ON_HOLD`, `SUBSCRIPTION_RECOVERED`, `SUBSCRIPTION_RESTARTED`, `SUBSCRIPTION_CANCELED`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_REVOKED`, `SUBSCRIPTION_DEFERRED`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED`, `SUBSCRIPTION_PRICE_CHANGE_UPDATED`, `SUBSCRIPTION_CANCELLATION_SCHEDULED`, `SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED`. También `oneTimeProductNotification` (no aplica — no hay one-time products) y `testNotification` (log + ACK, sin efecto). **Manejo uniforme**: cualquier `subscriptionNotification` → reconsultar el token → re-derivar. El `notificationType` sólo se registra (`latestNotificationType`) y sirve para métricas/alertas.

### H.3 Idempotencia y duplicados

- Pub/Sub garantiza **at-least-once** → el mismo RTDN puede llegar varias veces.
- Clave de dedup: `(purchaseToken, eventTimeMillis)` o el `messageId` de Pub/Sub. Se guarda en una tabla ligera `PlayRtdnReceipt(messageId @unique, receivedAt)` con TTL, o se apoya en la comparación `latestEventTime` de `AccountSubscription` (un evento con `eventTime ≤` el guardado es no-op).
- El endpoint responde **200** tras reconciliar (o tras determinar no-op). Responde **5xx** sólo en fallo transitorio (Google API caída, DB caída) para que Pub/Sub reintente con backoff. Nunca 4xx a Pub/Sub salvo OIDC inválido (403).
- Orden no garantizado → siempre re-derivar del estado **actual** de la API, nunca aplicar transiciones incrementales.

### H.4 Barrido de reconciliación (resguardo)

`@nestjs/schedule` cron (patrón ya usado en `gamification`/`privacy`):

- Cada N horas: filas `ACTIVE`/`IN_GRACE_PERIOD` con `expiryTime` ya pasado (RTDN perdido) → reconsultar.
- Filas `ACTIVE` + `acknowledgementState=PENDING` con > X horas → re-acknowledge.
- Filas sin evento en > D días → reconsultar (salud).

### H.5 C3.0 no toca infraestructura Pub/Sub

El topic, la push subscription y la cuenta de servicio se configuran en C3.x (§N). C3.0 sólo diseña el contrato del endpoint.

---

## I. Estado de billing en el móvil

### I.1 Separación estricta

```
useEntitlement()  → EntitlementState { loading | ready(tier) | error }     ← lo consumen Estudio/Ensayos/Tutor/(Ads)
useBilling()       → BillingState  { ... }                                  ← lo consume SÓLO el paywall
```

**Ningún** hook de billing entra en pantallas de Estudio / Ensayos / Tutor. La UI de compra vive detrás del `PaywallProvider` global (Capa 2, C2.1).

### I.2 `BillingState` propuesto (móvil)

```
type BillingState =
  | { status: 'unavailable'; reason: 'no_play_services' | 'not_installed_from_play' | 'error' }
  | { status: 'loading' }                          // consultando ProductDetails
  | { status: 'ready'; product: {                  // producto disponible
        productId: 'zetrynd_premium';
        basePlanId: 'premium-monthly';
        formattedPrice: string;                    // localizado, de Play (ej. "$6.990")
        billingPeriod: string;                     // ISO 8601 "P1M", formateado a "al mes"
    } }

type PurchaseFlowState =
  | { status: 'idle' }
  | { status: 'purchasing' }                       // launchBillingFlow abierto / esperando backend verify
  | { status: 'pending' }                          // compra creada, pago diferido — NO PREMIUM
  | { status: 'canceled' }                         // usuario cerró el flujo de Play
  | { status: 'verified' }                         // backend confirmó → entitlement.refresh() disparado
  | { status: 'error'; message: string }

type RestoreState = { status: 'idle' | 'restoring' | 'done' | 'error'; message?: string }
```

### I.3 APIs móviles nuevas (namespace `lib/billing/`)

| Función | Rol |
|---|---|
| `initBilling()` / `useBilling()` | conecta `BillingClient` (vía expo-iap), consulta `ProductDetails`, expone `BillingState`. |
| `startPremiumPurchase()` | `launchBillingFlow` con `obfuscatedAccountId`; al recibir el `Purchase`, POST `/me/subscription/verify`; actualiza `PurchaseFlowState`; al `verified` → `entitlement.refresh()`. |
| `restorePurchases()` | `queryPurchasesAsync` → POST `/me/subscription/restore` → `entitlement.refresh()`. |
| `lib/api/subscription.ts` | wrappers tipados de `POST /me/subscription/verify` y `/restore`, y `GET /me/subscription` (§K). Schemas en `@axioma/contracts`. |

### I.4 Contratos nuevos (`@axioma/contracts`)

- `subscriptionVerifyRequestSchema = { purchaseToken: string }`
- `subscriptionRestoreRequestSchema = { purchaseTokens: string[] }`
- `subscriptionVerifyResponseSchema = { entitlement: accountEntitlementResponseSchema, pending: boolean }`
- `subscriptionSummaryResponseSchema` (§K) — **derivado del backend**, no de Play local.

`accountEntitlementResponseSchema` (Capa 1, `{ tier }` estricto) **no cambia**.

---

## J. Evolución del paywall

| | Capa 2 (hoy) | Capa 3 (objetivo) |
|---|---|---|
| Precio | `PREMIUM_PRICE_DISPLAY = '$6.990 CLP / mes'` (constante temporal local, único consumidor `premium-paywall.tsx`) | `billingState.product.formattedPrice` (localizado, de Google Play). La constante se **elimina**. |
| CTA principal | `Disponible próximamente` (`<Text>` no interactivo) | **`Suscribirme`** (`<Button>`) → `startPremiumPurchase()` |
| Estados | sólo "Ahora no" | `purchasing` (spinner) · `pending` ("pago pendiente") · `canceled` (vuelve al estado normal) · `verified` (éxito breve, cierra) · `error` (mensaje + reintento) |
| CTA secundario | `Ahora no` (cierra) | `Ahora no` (cierra) — se conserva |
| Restore | — | enlace "Restaurar compra" cuando aplique (p. ej. `billingState` detecta una compra no reconciliada) |
| Host | `PaywallProvider` global, `Dialog` | **igual** — sin route/sheet/modal nuevo |
| Origins | `unit | resources | exams | ai_quota` | **igual — sin cambios** |
| `billing unavailable` | — | mensaje neutro: "Las compras no están disponibles en este dispositivo" + "Ahora no". Nunca bloquea el resto de la app. |

**No implementar en C3.0.** Ads consumirá `entitlement` más adelante (bloque AdMob separado — fuera de Layer 3).

---

## K. Gestión de suscripción (`Perfil → Ajustes → Suscripción`)

### K.1 Principio

La pantalla muestra información **del backend de ZETRYND** (`GET /me/subscription`), derivada de `AccountSubscription` verificada — **no** se infiere sólo del estado local de Play.

### K.2 `GET /me/subscription` → `subscriptionSummaryResponseSchema`

```
{
  tier: 'FREE' | 'PREMIUM',
  isSubscribed: boolean,               // hay una AccountSubscription no-terminal
  renewalStatus: 'renews' | 'cancels' | 'grace_period' | 'on_hold' | 'none',
  accessUntil: string | null,          // ISO — currentPeriodEnd; para 'cancels'/'grace' es la fecha de fin de acceso
  paymentIssue: boolean,               // state == IN_GRACE_PERIOD || ON_HOLD
  managementUrl: string                // deep link a la pantalla de suscripciones de Google Play
}
```

Nunca expone `purchaseToken`, `subscriptionState` cruda, ni raw metadata.

### K.3 UI

- Badge Premium / Free.
- Si `renews`: "Se renueva el <accessUntil>".
- Si `cancels`: "Tu acceso Premium continúa hasta el <accessUntil>" (**congelado**: cancelar auto-renovación ≠ downgrade inmediato).
- Si `grace_period` / `on_hold`: "Hay un problema con tu pago" + CTA a Play.
- **`Gestionar suscripción`** → abre la pantalla de suscripciones de Google Play (`https://play.google.com/store/account/subscriptions?sku=zetrynd_premium&package=com.zetrynd.app`).
- **Sin cancelación propia V1** — toda cancelación ocurre en la UI de Google Play.

---

## L. Seguridad / fraude

| # | Control | Diseño |
|---|---|---|
| L.1 | Verificación server-side | **Todo** `purchaseToken` se verifica con `purchases.subscriptionsv2.get`. El `Purchase` del cliente nunca concede nada. |
| L.2 | `packageName` | La respuesta / el request se valida contra `com.zetrynd.app` (constante de config). Cualquier otro → rechazo + alerta. |
| L.3 | `productId` esperado | Debe ser `zetrynd_premium`. Cualquier otro → rechazo. |
| L.4 | Unicidad de `purchaseToken` | `@unique`. Un token ya asociado a otra cuenta → `409 SUBSCRIPTION_ACCOUNT_MISMATCH`, nunca se re-vincula. |
| L.5 | Binding de cuenta | El POST `/verify` corre bajo `AuthGuard`; se cruza `obfuscatedAccountId` del token contra la cuenta autenticada. |
| L.6 | `obfuscatedAccountId` | Identificador opaco derivado del `accountId` (hash con salt) — nunca PII, nunca el UUID en claro (§G.3). |
| L.7 | Replay | Idempotencia por `purchaseToken` + `latestEventTime`. Un POST repetido converge; no duplica efecto. |
| L.8 | RTDN duplicado / falsificado | Endpoint verifica el **JWT OIDC de Google** (issuer `accounts.google.com`, audience = URL del endpoint, `email` = la service account de la push subscription). Dedup por `messageId` / `eventTime`. Sin OIDC válido → `403`. |
| L.9 | Payload de cliente forjado | Imposible ganar PREMIUM: el único input del cliente es un `purchaseToken` opaco que **debe** existir y estar `ACTIVE` en Google para el `packageName`/`productId` correctos. |
| L.10 | Revocado / reembolsado | `SUBSCRIPTION_REVOKED` → `REVOKED` → **FREE inmediato** (no espera `expiryTime`). El barrido también detecta revocaciones si el RTDN se perdió. |
| L.11 | Credenciales de service account | JSON de la service account **sólo** en variable de entorno del backend (patrón `FIREBASE_SERVICE_ACCOUNT_JSON` ya existente → nuevo `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`). **Jamás** en el repo, jamás en el cliente, jamás en logs. Rotación documentada. |
| L.12 | Nunca credenciales de Play en el móvil | El móvil sólo habla con Google vía el `BillingClient` (que no requiere secretos) y con el backend de ZETRYND. |
| L.13 | Logs | `purchaseToken` se trunca/hashea en logs. `rawSnapshot` no se loguea. |

---

## M. Estrategia de testing

### M.1 Capas

| # | Capa | Qué prueba | Ejecuta en |
|---|---|---|---|
| 1 | **Pura / unit / gates** | `deriveTier()` (todos los casos de §E), mapeo `SubscriptionState`, idempotencia de reconciliación, dedup de RTDN, validación de `packageName`/`productId`, forma de `BillingState`/`PurchaseFlowState`. | `tsx` puro (backend `verify-*-gate.ts` vía `run-gate.ts`; mobile `verify-*-gate.ts`). **Sin red, sin Play, sin dispositivo.** Es el grueso de la cobertura. |
| 2 | **Adaptador Google fake (backend)** | `SubscriptionService` contra un `GooglePlayApiPort` falso que devuelve `SubscriptionPurchaseV2` sintéticos para cada estado del ciclo de vida; RTDN sintéticos contra el endpoint. Prueba `AccountSubscription` + `AccountEntitlement` end-to-end **dentro del backend**, con DB real de gates. | `run-gate.ts` + `axioma_gates_dev`. |
| 3 | **Integración local** | Backend real + un cliente de prueba que simula el POST `/verify` y `/restore`. | `start:dev:gates` + curl/script. |
| 4 | **Google Play License Testing** | Compras reales de prueba sin cargo, con cuentas *license tester*, sobre un **debug APK sideloadeado** (mismo `packageName` que la app configurada en Play Console; **no** requiere un track de Play). Prueba `ProductDetails` reales, `launchBillingFlow`, `purchaseToken` reales, acknowledge, `subscriptionsv2.get` real. | **Samsung físico** `R5CW71R7MTP`, debug APK local + cuenta License Tester. |
| 5 | **Play Billing Lab** | Simular renovaciones aceleradas, grace period, account hold, recovery, revoke — estados que license testing solo no cubre bien. | Play Console + dispositivo (también con debug APK + License Tester). |
| 6 | **Track interno de Play (Internal testing)** | Build **firmada con el keystore de producción** (pendiente §Q-3) subida a *Internal testing*; instalada por testers reales desde Play. QA realista de distribución: descarga desde Play, updates, firma real. **Recomendado y obligatorio antes del cierre/release de la Capa 3**, pero **no** es prerrequisito del primer QA físico de Billing. | Google Play. |
| 7 | **QA físico Samsung `R5CW71R7MTP`** | Smoke del flujo completo + los estados del ciclo de vida a través de Play Billing Lab. | Dispositivo. |

### M.2 ¿Qué se puede y qué no se puede testear en el runtime actual?

- **SÍ se puede** hacer QA de Billing real con el **debug APK sideloadeado actual + una cuenta License Tester** en el Samsung: `ProductDetails` reales, `launchBillingFlow`, compras de prueba sin cargo, `purchaseToken` reales y la verificación server-side real. La documentación oficial de Google confirma que los License Testers eluden el requisito de "firmado y subido a Play" y pueden probar builds de debug sideloadeadas, con la condición de que el `packageName` coincida con la app de Play Console y la cuenta del dispositivo sea License Tester.
- **Prerrequisitos reales** de las capas 4–5: (a) app + producto (`zetrynd_premium`/`premium-monthly`) configurados en Play Console; (b) cuenta License Tester en el dispositivo. **No** hace falta un Internal Track para esto.
- **Requiere Internal Track** (capa 6): QA de descarga desde Play, updates, y firma de release real — obligatorio antes del cierre de la Capa 3, no antes del primer QA de Billing.
- `queryProductDetails` puede devolver vacío o error si el `applicationId` no tiene el producto activo en Play Console.
- Todo lo que **no** dependa de Play (capas 1–3) se testea hoy sin cambios de entorno.

### M.3 Escenarios a cubrir (mapa a capas)

| Escenario | Capas |
|---|---|
| Compra exitosa | 1,2,4,7 |
| Usuario cancela el flujo | 1 (state), 4 |
| Pending → purchased | 2 (RTDN sintético), 5 |
| Pending → canceled | 2, 5 |
| Renovación | 2, 5 |
| Fallo de pago → grace | 2, 5 |
| Account hold | 2, 5 |
| Recovery | 2, 5 |
| Cancelación voluntaria estando aún vigente | 1 (`deriveTier(CANCELED, expiry futuro)=PREMIUM`), 2, 4/5 |
| Expiración | 1, 2, 5 |
| Revoke / refund | 1, 2, 5 |
| Restore | 1, 2, 4, 7 |
| Reinstalación / clear data | 2, 4, 7 |
| Token duplicado (POST repetido) | 1, 2 |
| Cuenta equivocada | 1, 2 |
| Backend caído justo tras la compra de Play | 1 (retry semantics), 2, 3 |

---

## N. Plan incremental (C3.1 en adelante) — propuesto

Cada incremento: independientemente auditable, commit-sized, aprobado por separado. **Nada se implementa en C3.0.**

| Inc. | Contenido | Prisma migration | Dev build / dep nativa | Play Console | Pub/Sub | Samsung físico |
|---|---|---|---|---|---|---|
| **C3.1** | **Contrato + dominio backend (sin Google real).** `packages/contracts`: schemas de suscripción. `AccountSubscription` + enums (**migración Prisma**). `SubscriptionService` con `GooglePlayApiPort` (interfaz) + adaptador **fake**. `deriveTier()` puro. `EntitlementService.getEntitlement` pasa a leer `AccountSubscription` (el "único archivo que cambia"). Gates: `verify:subscription-derivation-gate`, `verify:subscription-reconcile-gate`. Endpoints `POST /me/subscription/verify` + `/restore` + `GET /me/subscription` contra el fake. | **SÍ** (primera) | No | No | No | No |
| **C3.2** | **Adaptador Google real (server-side).** `google-auth-library`/`googleapis` (dep de **backend**, no móvil). `GooglePlayApiAdapter` → `subscriptionsv2.get` + `acknowledge`. Config: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`. Gate con respuestas grabadas (fixtures). Todavía sin cliente móvil. | No | No | **Service account + acceso lectura Play** (setup, no productos) | No | No |
| **C3.3** | **RTDN endpoint.** `POST /_google/play-rtdn` + verificación OIDC + dedup + `reconcileFromNotification`. Barrido `@nestjs/schedule`. Gates de idempotencia/duplicados con RTDN sintéticos. | Posible (`PlayRtdnReceipt`) | No | RTDN topic name configurado en Play | **SÍ** (topic + push subscription) | No |
| **C3.4** | **Producto en Play Console + License Testers.** Crear `zetrynd_premium` + base plan `premium-monthly` + precio CLP. Configurar la cuenta de Google del Samsung como **License Tester**. Esto **habilita el QA físico de Billing de C3.5 sobre el debug APK sideloadeado** — sin necesidad de un track de Play. | No | No | **SÍ** (crear subscription + base plan + precio + license testers) | — | — |
| **C3.4b** *(en paralelo, requerido antes de C3.8)* | **Keystore de producción + Internal Track.** Resolver la deuda de `signingConfigs.debug` (Q-3): generar/custodiar el keystore de producción (o Play App Signing + upload key). Primera **build de release firmada** subida a *Internal testing*. **Recomendado y obligatorio antes del cierre de la Capa 3**; **no** bloquea el primer QA de Billing (C3.5). | No | **Build de release firmada** | **SÍ** (Internal testing) | — | Instalación desde Internal Track |
| **C3.5** | **Cliente móvil de billing.** Módulo IAP elegido (`expo-iap` recomendado — dep **móvil** + config plugin si aplica). `lib/billing/`, `lib/api/subscription.ts`. `useBilling`, `startPremiumPurchase`, `restorePurchases`. **`expo prebuild` (según lo requiera el módulo) + rebuild/reinstalar el debug APK.** `expo-dev-client` = **opcional**, a evaluar aquí (dev-menu / carga Metro más flexible), **no** prerrequisito. **Invariante**: registrar la versión de `com.android.billingclient:billing` realmente resuelta (§B.1). Gates mobile puros de `BillingState`/flujo. Paywall **todavía** con la constante temporal. | No | **SÍ** (módulo IAP + prebuild + rebuild; `expo-dev-client` opcional) | — | — | **SÍ** — **debug APK sideloadeado + License Tester** (C3.4): `ProductDetails`, compra de prueba, verify |
| **C3.6** | **Paywall real.** Sustituir `Disponible próximamente` → `Suscribirme`; estados purchasing/pending/canceled/verified/error; precio localizado; eliminar `PREMIUM_PRICE_DISPLAY`. `verify:premium-paywall-gate` actualizado. | No | rebuild | — | — | **SÍ** — flujo completo end-to-end (debug APK + License Tester) |
| **C3.7** | **Perfil → Suscripción.** Pantalla + `GET /me/subscription` consumido + deep link a Play. | No | rebuild | — | — | **SÍ** |
| **C3.8** | **QA de ciclo de vida + Internal Track + cierre.** Play Billing Lab: grace / hold / recovery / revoke / renewal / cancel-still-entitled (sobre debug APK + License Tester). **QA de distribución realista desde el Internal Track (C3.4b): descarga desde Play, updates, firma real.** ADR de cierre `PREMIUM-V1-LAYER-3-BILLING-CLOSURE-REPORT.md`. | No | — | Play Billing Lab + Internal Track | — | **SÍ** — batería completa §M.3 + Internal Track |

Hitos:

- **Migración Prisma**: C3.1 (y posiblemente C3.3).
- **Dependencia nativa / rebuild**: C3.5 (móvil). `expo-dev-client` **opcional**, no es un hito de arquitectura. El backend (C3.2/C3.3) no toca nativo.
- **Play Console — producto + License Testers**: C3.4 (setup de service account en C3.2). Habilita el QA físico de Billing.
- **Keystore de producción + Internal Track**: C3.4b, en paralelo; **obligatorio antes del cierre (C3.8)**, no antes del primer QA de Billing.
- **Google Cloud Pub/Sub**: C3.3.
- **Samsung físico con Billing real**: desde C3.5, sobre el **debug APK sideloadeado + cuenta License Tester** (no requiere Internal Track). QA de distribución realista desde el Internal Track en C3.8. Batería completa de ciclo de vida en C3.8.

---

## O. Diagramas de arquitectura (texto)

### O.1 Autoridad

```
                     ┌─────────────────────────── GOOGLE ───────────────────────────┐
                     │  Play Billing (dispositivo)      Play Developer API (server)  │
                     │        │  purchaseToken                │ subscriptionsv2.get  │
                     └────────┼───────────────────────────────┼──────────────────────┘
                              │                               │ (AUTORIDAD)
        ┌─────────────────────▼─────────┐          ┌──────────▼───────────────────────┐
        │  MÓVIL                         │          │  BACKEND ZETRYND (NestJS)         │
        │  lib/billing (expo-iap)        │  POST    │  SubscriptionService              │
        │  useBilling / startPurchase    │ ───────► │   → verifica → AccountSubscription │
        │  restorePurchases              │  verify  │   → acknowledge                    │
        │                                │  restore │  EntitlementService               │
        │  useEntitlement() ◄────────────┼──────────┤   deriveTier(sub) → AccountEntitlement
        │       │  (SÓLO tier)           │  GET     │                                   │
        │       ▼                        │ /me/     │  RTDN: POST /_google/play-rtdn     │
        │  Estudio · Ensayos · Tutor     │ entitle- │   → reconcile → re-derive          │
        │  paywall (Dialog)              │  ment    │                                   │
        └───────────────────────────────┘          └───────────────────────────────────┘
                                                              ▲
                                          Cloud Pub/Sub ──────┘  (RTDN push + OIDC)
```

### O.2 Estado

```
EntitlementState (móvil, Capa 2, SIN CAMBIOS)     BillingState (móvil, Capa 3, NUEVO, sólo paywall)
  loading | ready(FREE|PREMIUM) | error             unavailable | loading | ready(product)
                                                   PurchaseFlowState: idle|purchasing|pending|canceled|verified|error

AccountEntitlement (backend, Capa 1, SIN CAMBIOS)  AccountSubscription (backend, Capa 3, NUEVO)
  { tier: FREE | PREMIUM }                           { state, expiryTime, autoRenewing, purchaseToken, ... }
        ▲                                                     │
        └──────────────── deriveTier() ◄──────────────────────┘
```

---

## P. Semántica de fallos (consolidada)

| Punto de fallo | Regla |
|---|---|
| `Purchase` de cliente | Nunca concede PREMIUM. Sólo aporta el `purchaseToken`. |
| Compra `PENDING` | Nunca concede PREMIUM. `202`, mensaje "pago pendiente". |
| POST `/verify` duplicado | Idempotente por `purchaseToken`. Converge. |
| App muerta / red perdida post-pago | `queryPurchasesAsync` al reabrir + RTDN → doble reconciliación. |
| Backend OK, cliente pierde respuesta | Estado ya reconciliado; retry → 200; `refresh()` confirma. |
| Acknowledge no hecho | Backend acknowledgea tras verificar; barrido re-acknowledgea; si nadie → Google reembolsa a 3 días (comportamiento correcto de Google). |
| Account mismatch | `409`, no reconciliar, alerta de fraude. |
| Already owned | Tratar como "ya suscrito": `queryPurchasesAsync` + reconciliar. |
| `subscriptionsv2.get` 5xx | `503` al cliente, retry con backoff; RTDN reconciliará. |
| `packageName`/`productId` incorrectos | `400` + alerta de fraude, no reconciliar. |
| RTDN duplicado | Dedup por `messageId`/`eventTime`; no-op. |
| RTDN atrasado / fuera de orden | Re-derivar del estado **actual** de la API, no aplicar deltas. |
| RTDN sin OIDC válido | `403`, no procesar. |
| Revoke / refund | FREE inmediato, no esperar `expiryTime`. |
| Grace period | Conserva PREMIUM. |
| Account hold | FREE (Google ya bloquea). |
| Pub/Sub caído / RTDN perdido | Barrido de reconciliación + `queryPurchasesAsync` del cliente. |

---

## Q. Decisiones abiertas que requieren aprobación de producto

| # | Decisión | Recomendación técnica |
|---|---|---|
| Q-1 | **Wrapper de billing**: `expo-iap` + backend propio **vs** RevenueCat. | `expo-iap` + backend propio — ZETRYND ya tiene el dominio de entitlement cerrado; RevenueCat añade lock-in y coste sin resolver nada nuevo. |
| Q-2 | **IDs de producto** definitivos: `zetrynd_premium` / `premium-monthly`. | Aprobar tal cual; sin precio/país/versión en el ID. |
| Q-3 | **Keystore de producción y estrategia de firma** (hoy `release` usa la debug key). Bloqueante para el Internal Track y el release, **no** para el primer QA de Billing (que corre sobre el debug APK sideloadeado + License Tester). | Generar y custodiar un keystore de producción (o Play App Signing con upload key) en **C3.4b**, antes del cierre de la Capa 3 (C3.8). |
| Q-4 | **`obfuscatedAccountId`**: hash con salt en env recomputable **vs** columna `Account.obfuscatedAccountId @unique`. | Columna `@unique` en `Account` — evita depender de un salt secreto para atribuir RTDN; más simple de auditar. |
| Q-5 | **Política de transferencia de suscripción entre cuentas ZETRYND** (compra asociada a otra cuenta). | V1: **no transferir**. `409`, mensaje al usuario, gestionar desde Google Play / la cuenta original. Revisar si soporte lo necesita. |
| Q-6 | **`SubscriptionEvent` append-only** para forense de RTDN, además de `rawSnapshot`. | Añadirlo en C3.3 con retención estricta (≤ 90 días) y sin PII — útil para depurar desincronizaciones. |
| Q-7 | **Nombre del `applicationId` de desarrollo**: mantener `com.zetrynd.app` único **vs** `com.zetrynd.app.dev` para instalar dev+prod en paralelo. | Mantener único por ahora (menos configuración); introducir `.dev` sólo si el equipo necesita ambos binarios a la vez. |
| Q-8 | **Precio CLP exacto y punto de precio de Google Play** (`$6.990` vs el price point más cercano que ofrezca Play para Chile). | Confirmar en Play Console al crear el base plan (C3.4); el ADR congela `$6.990` como intención de lanzamiento. |
| Q-9 | **Región/monedas adicionales** más allá de Chile en V1. | V1 = sólo CLP / Chile; Play permite añadir regiones después sin re-migrar. |
| Q-10 | **Grace period y account hold**: activarlos en el base plan (recomendado por Google para reducir churn involuntario). | Activar ambos (grace 3–7 días). El diseño de §E ya los soporta. |

---

## R. Fuentes oficiales consultadas (2026-09)

- Google Play Billing Library — version deprecation FAQ: <https://developer.android.com/google/play/billing/deprecation-faq>
- Google Play Billing Library — release notes (v9.1.0): <https://developer.android.com/google/play/billing/release-notes>
- Play Billing — Play Developer API deprecations: <https://developer.android.com/google/play/billing/play-developer-apis-deprecations>
- Subscription lifecycle | Play Billing: <https://developer.android.com/google/play/billing/lifecycle/subscriptions>
- REST: `purchases.subscriptionsv2` / `.get`: <https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2> · <https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2/get>
- `SubscriptionPurchaseV2` model (`subscriptionState`): <https://googleapis.dev/java/google-api-services-androidpublisher/v3-rev20240516-2.0.0/com/google/api/services/androidpublisher/model/SubscriptionPurchaseV2.html>
- Using in-app purchases — Expo Documentation: <https://docs.expo.dev/guides/in-app-purchases/>
- RevenueCat — Play Billing v9 (Google I/O 2026): <https://www.revenuecat.com/blog/engineering/play-billing-v9>
- RevenueCat — Google Play subscription lifecycle guide: <https://www.revenuecat.com/blog/engineering/google-play-lifecycle>
- RevenueCat — Expo installation: <https://www.revenuecat.com/docs/getting-started/installation/expo>
- Test Google Play Billing / License Testing (los License Testers eluden el requisito de firmado-y-subido-a-Play; prueban builds de debug sideloadeadas con `packageName` coincidente): <https://developer.android.com/google/play/billing/test> · Play Console Help "Test in-app billing with Google Play": <https://support.google.com/googleplay/android-developer/answer/6062777>
- Expo — Development builds (soportados sin el paquete `expo-dev-client`): <https://docs.expo.dev/develop/development-builds/introduction/>

Referencias internas del repo: `docs/adr/PREMIUM-V1-LAYER-1-ENTITLEMENT-CLOSURE-REPORT.md`, `docs/adr/PREMIUM-V1-LAYER-2-MOBILE-CLOSURE-REPORT.md`, `docs/adr/TESTER-DISTRIBUTION-1C-CLOSURE-REPORT.md`, `docs/adr/TESTER-DISTRIBUTION-1D.2-BACKEND-DEPLOY-PREPARATION.md`, `docs/ANDROID-BUILD-ENVIRONMENT-STATUS.md`, `apps/backend/src/entitlement/entitlement.service.ts` (frontera ya congelada).

---

## S. Estado final de C3.0

**ARQUITECTURA PROPUESTA — LISTA PARA REVISIÓN.**

C3.0 es exclusivamente este documento. No se ha implementado nada de la Capa 3. No se han modificado `package.json`, código, proyectos nativos, esquema Prisma, ni configuración de Google Play. No se declara la Capa 3 implementada.

**DETENERSE para revisión de arquitectura antes de C3.1.**
