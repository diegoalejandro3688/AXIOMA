# PREMIUM V1 · Layer 3 · Runbook de infraestructura Google Play / Cloud (C3.4A)

> **Estado global de este runbook: `PLANNED` / `DEFERRED`.**
> Ningún recurso externo (Google Cloud / Play Console) ha sido creado ni
> verificado desde el entorno del agente — el agente no tiene acceso a esas
> consolas. Todo lo de abajo es la **especificación exacta** para que el
> operador (Product Owner / DevOps) la ejecute y luego marque cada línea como
> `DONE` con la evidencia correspondiente.
>
> ### ⚠️ Restricción confirmada (2026-09-03): el Product Owner **NO** tiene cuenta de Google Play Console.
>
> Crear una cuenta de Google Play Developer requiere: pago único de **USD 25**,
> verificación de identidad (documento), y — para vender suscripciones — un
> **perfil de pagos / merchant** con datos fiscales y bancarios. Nada de eso lo
> hace el agente.
>
> **Consecuencia para C3.4A:**
> - Todo lo dependiente de Play Console queda marcado
>   **`DEFERRED — PLAY CONSOLE NOT AVAILABLE`** (no `PLANNED`, no `DONE`).
> - Lo puramente **Google Cloud / Pub/Sub** queda `PLANNED` (el operador puede
>   crearlo cuando quiera; no bloquea, y no es requisito para cerrar C3.4A).
> - La **base nativa de Billing** (C3.5A: módulo IAP + `expo prebuild` +
>   resolución de la versión de PBL + build con Billing) **puede avanzar sin
>   Play Console**. El **primer upload a Play** y todo C3.4B quedan `DEFERRED`.
>
> **NUNCA** pegar en este archivo: claves privadas, JSON de service account,
> tokens, `client_secret`, `private_key`, ni credenciales de ninguna cuenta.
> Este archivo sólo lleva **nombres, IDs y emails** de recursos.

- **Increment:** C3.4A — Google backend / control-plane readiness.
- **NO se hace en C3.4A:** crear la suscripción / base plan de Play, crear la
  push subscription de Pub/Sub, tocar Railway, subir builds, release.
- **Backend que consume esto:** C3.2 (`GooglePlaySubscriptionAdapter`) y C3.3
  (`GoogleRtdnPushAuthenticator` + inbox `google_play_rtdn_event`).
- **Contratos congelados que el operador NO puede cambiar:**
  - `packageName` = `com.zetrynd.app` (constante `ZETRYND_PLAY_PACKAGE_NAME` en
    `apps/backend/src/subscription/subscription-product.ts`).
  - `productId` futuro = `zetrynd_premium`; base plan futuro = `premium-monthly`;
    sin offer en V1; precio Chile `$6.990 CLP / mes`. **NO crear en C3.4A.**

---

## 0. Variables de entorno del backend (nombres, sin valores)

| Variable | Consumida por | Valor esperado en producción | Estado |
|---|---|---|---|
| `GOOGLE_PLAY_PROVIDER_IMPL` | `subscription.module.ts` (`resolveSubscriptionProviderChoice`) | `google` (en prod; la factory LANZA si no) | `PLANNED` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | `GooglePlaySubscriptionAdapter` (`getAuth`) | JSON completo de la SA de verificación de Billing (§2) | `PLANNED` |
| `GOOGLE_PLAY_RTDN_AUTH_IMPL` | `subscription.module.ts` (`resolveRtdnAuthChoice`) | `google` (en prod; la factory LANZA si no) | `PLANNED` |
| `GOOGLE_PLAY_RTDN_OIDC_AUDIENCE` | `GoogleRtdnPushAuthenticator` / `readRtdnAuthConfig` | URL pública exacta del endpoint RTDN (§5) | `PLANNED` |
| `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL` | `GoogleRtdnPushAuthenticator` / `readRtdnAuthConfig` | email de la SA de push RTDN (§4) | `PLANNED` |

- `.env.example` ya lista estos nombres (sin valores). **No** añadir valores ahí.
- No hay `GOOGLE_PLAY_PACKAGE_NAME` env: el package es constante en el código.
- No hay (todavía) una env para "pinnear" el recurso de la push subscription;
  el C3.3 valida audiencia + email + firma, no el `message.subscription`.
  Pinear el recurso de la subscription es hardening futuro opcional.

---

## 1. Auditoría PREVIA — preguntas para el Product Owner

> **No crear nada hasta tener estas respuestas.** Evita duplicados.

| # | Pregunta | Respuesta PO | Estado |
|---|---|---|---|
| A1 | ¿Existe ya la cuenta de **Google Play Developer** de ZETRYND? | **NO** (confirmado 2026-09-03) | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| A2 | ¿Existe ya una **app en Play Console** para ZETRYND? | No (no hay cuenta) | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| A3 | ¿El `packageName` de la (futura) app de Play será **exactamente** `com.zetrynd.app`? | debe serlo — el móvil ya usa ese `applicationId`; confirmar al crear la app | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| A4 | ¿Hay un **perfil de pagos / merchant** de Google Payments configurado? | No (no hay cuenta) — requiere datos fiscales/bancarios del PO | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| A5 | ¿Existe ya un **proyecto de Google Cloud** de ZETRYND que corresponda usar? Project ID + número. | _pendiente_ | `PLANNED` |
| A6 | ¿Está habilitada ya la **Google Play Android Developer API** en ese proyecto? | _pendiente_ | `PLANNED` |
| A7 | ¿Existen ya **service accounts** o **topics/subscriptions de Pub/Sub** relacionados con Billing/RTDN? Listar. | _pendiente_ | `PLANNED` |
| A8 | ¿La cuenta de Google del **Samsung de QA** (`R5CW71R7MTP`) será License Tester? Email. | se define al configurar License Testers (necesita Play Console) | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| A9 | ¿Cuál será el **host HTTPS público** del backend (staging) para la push subscription? ¿Railway u otro? (Hoy: NO existe → push subscription `PENDING`.) | _pendiente_ | `PLANNED` |

**Cómo verificar cada punto manualmente** (para el operador):

- **A1/A2/A3** — Play Console → *Todas las apps* → abrir la app → *Configuración
  del panel* / *Detalles de la app*; el package aparece bajo el nombre de la
  app y en *Integridad de la app*. Debe ser `com.zetrynd.app` **carácter por
  carácter**.
- **A4** — Play Console → *Configuración* → *Perfil de pagos*. Debe decir
  "Perfil de pagos activo". Si pide datos fiscales/legales/bancarios → **STOP**,
  el agente no completa eso (§9, §14).
- **A5/A6** — Google Cloud Console → selector de proyecto (arriba). Para la API:
  *APIs y servicios* → *APIs habilitadas* → buscar "Google Play Android
  Developer API". O `gcloud services list --enabled --project <PROJECT_ID> | grep androidpublisher`.
- **A7** — `gcloud iam service-accounts list --project <PROJECT_ID>` y
  `gcloud pubsub topics list --project <PROJECT_ID>`.

---

## 2. Proyecto Google Cloud + Play Developer API

> `PLANNED` — **opcional en C3.4A**, no es requisito para cerrar este increment.
> El operador lo puede hacer cuando quiera; no desbloquea nada mientras B-0
> (cuenta Play) siga abierto, porque la API sólo devuelve datos de una app de
> Play que aún no existe.

| Item | Valor planificado | Cómo verificar | Estado |
|---|---|---|---|
| Proyecto GCP | dedicado a ZETRYND Billing/RTDN (o el confirmado en A5) | selector de proyecto de la consola | `PLANNED` |
| Project ID | `zetrynd-billing` *(sugerido — el operador confirma el real)* | — | `PLANNED` |
| Project number | _(lo asigna Google al crear)_ | *Configuración del proyecto* → "Número de proyecto" | `PLANNED` |
| Propósito | verificación server-to-server de Google Play Billing + ingesta de RTDN vía Pub/Sub | — | `PLANNED` |
| API habilitada | **Google Play Android Developer API** (`androidpublisher.googleapis.com`) — **y NINGUNA otra "por si acaso"** | `gcloud services list --enabled ... | grep androidpublisher` | `PLANNED` |

**Operador — pasos:**

1. Si A5 = "no existe" → *Google Cloud Console* → crear proyecto
   `zetrynd-billing` (o el nombre que el PO decida). Anotar Project ID + número
   abajo.
2. *APIs y servicios* → *Habilitar APIs y servicios* → "Google Play Android
   Developer API" → **Habilitar**.
3. Verificar: `gcloud services list --enabled --project <PROJECT_ID>` — sólo debe
   aparecer `androidpublisher.googleapis.com` como API de Play (Pub/Sub aparece
   aparte en §3).
4. Rellenar la tabla y cambiar los `PLANNED` a `DONE — <fecha> — <evidencia>`.

---

## 3. Topic de Pub/Sub para RTDN

> `PLANNED` — **opcional en C3.4A**. El topic + su IAM se pueden crear ya, pero
> no reciben ninguna notificación hasta que una app de Play (B-0) apunte su
> RTDN a este topic (§7.1). No es requisito para cerrar C3.4A.

| Item | Valor planificado | Estado |
|---|---|---|
| Topic ID | `zetrynd-google-play-rtdn` | `PLANNED` |
| Resource name completo | `projects/<PROJECT_ID>/topics/zetrynd-google-play-rtdn` | `PLANNED` |
| Publisher autorizado | `google-play-developer-notifications@system.gserviceaccount.com` → rol **`roles/pubsub.publisher`** SOBRE ESE TOPIC (no a nivel proyecto) | `PLANNED` |

**Operador — pasos:**

```
# crear el topic
gcloud pubsub topics create zetrynd-google-play-rtdn --project <PROJECT_ID>

# dar SOLO Publisher sobre ESE topic a la cuenta de sistema de Google Play
gcloud pubsub topics add-iam-policy-binding zetrynd-google-play-rtdn \
  --project <PROJECT_ID> \
  --member="serviceAccount:google-play-developer-notifications@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# verificar
gcloud pubsub topics get-iam-policy zetrynd-google-play-rtdn --project <PROJECT_ID>
```

- **NO** dar a `google-play-developer-notifications@system...` ningún rol a nivel
  de proyecto.
- La **push subscription** NO se crea aquí (§5).

---

## 4. Service accounts (dos, con propósitos distintos)

> **Son dos identidades separadas.** Una firma las llamadas a la Play Developer
> API; la otra aparece dentro del JWT OIDC del push de Pub/Sub y la valida C3.3.

### 4.1 SA de verificación de Billing (Play Developer API)

| Item | Valor planificado | Estado |
|---|---|---|
| Nombre / ID | `zetrynd-play-billing` | `PLANNED` |
| Email | `zetrynd-play-billing@<PROJECT_ID>.iam.gserviceaccount.com` | `PLANNED` |
| Roles GCP | **ninguno** a nivel de proyecto (la autorización vive en Play Console) | `PLANNED` |
| Permisos en Play Console | SÓLO: *Ver datos financieros, pedidos y respuestas a encuestas de cancelación* + *Gestionar pedidos y suscripciones*. **NO** *Administrador*, **NO** *Gestión de publicaciones/releases*, **NO** *Editar la app*. | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| Clave | JSON de SA — **fuera del repo**, sólo por env/secret (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`). Ver §6. | `PLANNED` (creación) — el uso real espera al permiso Play (`DEFERRED`) |

**Operador — pasos:**

1. *(PLANNED — se puede hacer ya)* Google Cloud → *IAM y administración* →
   *Cuentas de servicio* → *Crear* → nombre `zetrynd-play-billing`, descripción
   "ZETRYND — verificación server-to-server de Google Play Billing". **Sin**
   roles de proyecto.
2. **`DEFERRED — PLAY CONSOLE NOT AVAILABLE`** Play Console → *Usuarios y
   permisos* → *Invitar usuario* → pegar el email de la SA → *Permisos de la
   app* (sólo la app ZETRYND) → marcar **exactamente**: *View financial data,
   orders, and cancellation survey responses* y *Manage orders and
   subscriptions*. Nada más.
3. **`DEFERRED`** (cuando C3.4B lo necesite de verdad) *Cuentas de servicio* →
   la SA → *Claves* → *Agregar clave* → JSON → **descargar fuera del repo**,
   cargar en el secret manager del hosting. Anotar aquí sólo: "clave generada
   <fecha>, custodiada en <secret store>". **Nunca** el contenido.
4. **`DEFERRED`** Confirmar en Play Console que el usuario aparece con esos 2
   permisos y ningún otro.

### 4.2 SA de push RTDN (identidad del OIDC JWT)

| Item | Valor planificado | Estado |
|---|---|---|
| Nombre / ID | `zetrynd-rtdn-push` | `PLANNED` |
| Email | `zetrynd-rtdn-push@<PROJECT_ID>.iam.gserviceaccount.com` | `PLANNED` |
| Roles | **ninguno** de Billing. (El agente Pub/Sub necesitará `actAs` sobre ella — §5.) | `PLANNED` |
| Uso | su email va en `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`; C3.3 exige que el `email` del JWT sea **exactamente** este y `email_verified === true`. | `PLANNED` |

**Operador — pasos:**

1. Google Cloud → *Cuentas de servicio* → *Crear* → `zetrynd-rtdn-push`,
   descripción "ZETRYND — identidad del push autenticado de Pub/Sub para RTDN".
   **Sin** roles.
2. **NO** invitarla a Play Console. **NO** darle permisos de Billing.
3. Anotar el email exacto abajo; es lo que el backend valida.

---

## 5. Push subscription de Pub/Sub — `PENDING` (falta HTTPS público)

> **BLOCKER conocido:** el endpoint C3.3 es `POST /internal/google-play/rtdn` y
> Pub/Sub push necesita una **URL HTTPS pública**. Hoy el backend sólo corre en
> `http://localhost:3000` / `:3001` (gates). **NO** se crea la subscription
> hasta que exista un backend de staging público (decisión de hosting =
> pendiente del PO; Railway **no** se toca sin aprobación explícita).

Configuración futura EXACTA (cuando exista `https://<HOST>`):

| Parámetro | Valor | Debe coincidir con |
|---|---|---|
| Subscription ID | `zetrynd-google-play-rtdn-push` | — |
| Topic | `projects/<PROJECT_ID>/topics/zetrynd-google-play-rtdn` | §3 |
| Delivery type | **Push** | — |
| Endpoint URL | `https://<HOST>/internal/google-play/rtdn` | `GOOGLE_PLAY_RTDN_OIDC_AUDIENCE` |
| Enable authentication | **Sí** | — |
| Service account | `zetrynd-rtdn-push@<PROJECT_ID>.iam.gserviceaccount.com` | `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL` |
| Audience | `https://<HOST>/internal/google-play/rtdn` (igual que la URL) | `GOOGLE_PLAY_RTDN_OIDC_AUDIENCE` |
| Ack deadline | 60 s (default) | — |
| Retry policy | exponential backoff (default) — el inbox durable de C3.3 tolera reintentos | §H.6 del ADR |

**Prerrequisitos de IAM para crear la push subscription autenticada:**

```
# el AGENTE PUB/SUB del proyecto necesita poder acuñar tokens para la SA de push
PROJECT_NUMBER=<numero del proyecto>
gcloud iam service-accounts add-iam-policy-binding \
  zetrynd-rtdn-push@<PROJECT_ID>.iam.gserviceaccount.com \
  --project <PROJECT_ID> \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# el OPERADOR que crea la subscription necesita actAs sobre la SA de push
gcloud iam service-accounts add-iam-policy-binding \
  zetrynd-rtdn-push@<PROJECT_ID>.iam.gserviceaccount.com \
  --project <PROJECT_ID> \
  --member="user:<email-del-operador>" \
  --role="roles/iam.serviceAccountUser"
```

- Preferir el binding de `serviceAccountTokenCreator` **sobre la SA** (recurso
  estrecho), no a nivel de proyecto.
- Validación que hará C3.3 en cada push: firma del JWT (certs públicos de
  Google), `aud` == audiencia configurada, `email` == SA de push,
  `email_verified === true`, no expirado. Rechazo → 401.

**Estado: `PENDING` — bloqueado por A9 (host HTTPS).**

---

## 6. Estrategia de credenciales

| Aspecto | Decisión | Estado |
|---|---|---|
| ¿Clave en git? | **Nunca.** `.env.example` sólo nombres. | `DONE` (ya es así) |
| Hosting eventual | Pendiente del PO (A9). Si **Railway** → `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` como *secret env* (variable de servicio, no en `railway.json`). Si el hosting soporta **Workload Identity Federation** (sin clave) → preferirlo y NO generar clave JSON. | `PLANNED` |
| Local (C3.4B/C3.5) | Si de verdad hace falta la clave para probar contra Google real: archivo JSON **fuera del repo** (p. ej. `~/secrets/zetrynd-play-billing.json`), cargado sólo vía `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=$(cat ...)` en el entorno. `.gitignore` ya excluye `.env*`. | `PLANNED` |
| Rotación | Documentar quién custodia la clave y cuándo se rota (90 días sugerido) cuando se genere. | `PLANNED` |

**Regla dura:** ninguna clave privada, ningún JSON de SA, ningún `private_key`
aparece en este archivo ni en ningún commit.

---

## 7. Play Console — RTDN + productos — `DEFERRED — PLAY CONSOLE NOT AVAILABLE`

> Toda esta sección requiere una cuenta de Google Play Console, que hoy **no
> existe**. Se documenta la configuración exacta para cuando exista.

### 7.1 RTDN (Real-time developer notifications) — `DEFERRED`

- Play Console → app ZETRYND → *Monetización* → *Configuración de monetización*
  → *Real-time developer notifications*.
- **Topic name:** `projects/<PROJECT_ID>/topics/zetrynd-google-play-rtdn`
  (§3, exacto).
- **NO** finalizar esta config hasta que el topic exista y su IAM esté
  verificado (§3).
- Ámbito V1: **sólo suscripciones**. NO habilitar comportamiento de
  productos de una sola compra (ZETRYND no vende one-time products; C3.3 los
  clasifica `IGNORED` de todos modos).
- Botón *Enviar notificación de prueba* → debe llegar como `testNotification` al
  endpoint (C3.3 la registra `DONE`, sin mutación). Útil para validar la
  cadena Play → Pub/Sub → backend una vez exista el HTTPS.
- **Estado: `DEFERRED — PLAY CONSOLE NOT AVAILABLE`** (además depende de §3 y del
  HTTPS de §5).

### 7.2 Producto — `zetrynd_premium` / `premium-monthly` — `DEFERRED`

> **NO se crea en C3.4A.** Además de la restricción de "cuenta Play no
> disponible": Google exige una build con Billing subida (C3.5A) antes de
> habilitar plenamente la config de productos, y los IDs son **permanentes**
> una vez activados.

Identificadores congelados (crear en **C3.4B**):

| Item | Valor | Estado |
|---|---|---|
| Subscription product ID | `zetrynd_premium` | `FROZEN — no crear aún` |
| Base plan ID | `premium-monthly` | `FROZEN — no crear aún` |
| Renovación | auto-renovable, mensual | `FROZEN` |
| Offer | **ninguno en V1** | `FROZEN` |
| Precio | Chile — `CLP 6990` / mes (mostrado `$6.990`) | `FROZEN` |
| Free trial / intro | **no en V1** | `FROZEN` |

---

## 8. License Testers — `DEFERRED — PLAY CONSOLE NOT AVAILABLE`

| Item | Valor | Estado |
|---|---|---|
| Ruta | Play Console → *Configuración* → *Pruebas de licencias* → *Testers con licencia* | — |
| Cuenta(s) | la del publisher (comportamiento especial ya) **+** la cuenta de Google del Samsung `R5CW71R7MTP` si es distinta | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| Respuesta de licencia | `RESPOND_NORMALLY` | `DEFERRED` |
| Efecto | habilita compras de prueba **sin cargo** con `purchaseToken` reales sobre el **debug APK sideloadeado** — sin necesidad de Internal Track | — |

**Operador (cuando exista la cuenta Play):** añadir el/los email(s) a *Testers
con licencia*, guardar. Anotar abajo **sólo el email**, nunca la contraseña.

---

## 9. Perfil de pagos / merchant — `DEFERRED — PLAY CONSOLE NOT AVAILABLE`

| Check | Estado |
|---|---|
| Cuenta de Google Play Developer creada (pago único USD 25 + verificación de identidad) | `DEFERRED — PLAY CONSOLE NOT AVAILABLE` |
| Perfil de pagos activo | `DEFERRED` |
| Cobertura de país: **Chile** habilitado para suscripciones pagadas | `DEFERRED` |
| Datos fiscales / bancarios / de entidad completos | `DEFERRED` |

> **STOP explícito:** el agente **no** crea la cuenta de Play, **no** paga los
> USD 25, y **no** rellena información fiscal / legal / bancaria / de entidad.
> Cuando el PO vaya a crear la cuenta, Google le pedirá: país, tipo de cuenta
> (personal / organización), nombre legal, dirección, documento de identidad, y
> — para el perfil de pagos — datos fiscales (RUT) y cuenta bancaria. El PO
> decide y aporta todo eso.

---

## 10. Registro de recursos VERIFICADOS (a rellenar por el operador)

> Cambiar cada `PLANNED` a `DONE — <fecha> — <evidencia: screenshot/comando>` a
> medida que se crean/verifican. **Sin secretos.**

```
Google Cloud project ID .............. <PLANNED>
Google Cloud project number ......... <PLANNED>
Play Developer API habilitada ....... <PLANNED>
Pub/Sub topic resource name ......... projects/<PLANNED>/topics/zetrynd-google-play-rtdn
Publisher binding en el topic ....... google-play-developer-notifications@system.gserviceaccount.com : roles/pubsub.publisher  <PLANNED>
SA verificación Billing (email) ..... zetrynd-play-billing@<PLANNED>.iam.gserviceaccount.com
  permisos Play Console ............. DEFERRED — PLAY CONSOLE NOT AVAILABLE
SA push RTDN (email) ................ zetrynd-rtdn-push@<PLANNED>.iam.gserviceaccount.com
  serviceAccountTokenCreator para ... service-<PROJECT_NUMBER>@gcp-sa-pubsub.iam.gserviceaccount.com  <PLANNED>
Push subscription .................. PENDING — falta backend HTTPS público (A9)
  endpoint futuro .................. https://<HOST>/internal/google-play/rtdn
  audiencia futura ................. https://<HOST>/internal/google-play/rtdn
Cuenta Google Play Developer ....... DEFERRED — PLAY CONSOLE NOT AVAILABLE (USD 25 + verificación)
Play Console app (com.zetrynd.app) . DEFERRED — PLAY CONSOLE NOT AVAILABLE
Play Console RTDN topic apuntado ... DEFERRED — PLAY CONSOLE NOT AVAILABLE
License testers ................... DEFERRED — PLAY CONSOLE NOT AVAILABLE
Perfil de pagos / Chile ........... DEFERRED — PLAY CONSOLE NOT AVAILABLE
Producto zetrynd_premium .......... DEFERRED — PLAY CONSOLE NOT AVAILABLE (además: C3.4B, tras build Billing-enabled)
```

---

## 11. Blockers

| # | Blocker | Dueño | Desbloquea |
|---|---|---|---|
| **B-0** | **No existe cuenta de Google Play Console** (confirmado 2026-09-03). Requiere: pago único **USD 25**, verificación de identidad, y (para vender) perfil de pagos con datos fiscales/bancarios. **Bloquea:** crear la app de Play, el producto `zetrynd_premium`, License Testers, los permisos Play de la SA de Billing, la config RTDN en Play Console, y todo C3.4B. **NO bloquea:** el trabajo de repo, la infraestructura Google Cloud/Pub/Sub, ni la base nativa de Billing de C3.5A (módulo IAP + prebuild + resolución de PBL + build con Billing sin subir). | **PO** | app de Play, C3.4B, §4.1-permiso, §7, §8, §9 |
| B-1 | **No hay backend HTTPS público.** Sin él no se puede crear la push subscription de Pub/Sub ni finalizar el RTDN en Play Console. Decisión de hosting de staging = pendiente PO (Railway NO se toca sin aprobación). | PO / DevOps | §5, §7.1 |
| B-2 | **Perfil de pagos / merchant** (subsumido en B-0). Requiere datos fiscales/bancarios que sólo el PO aporta. | PO | §9, C3.4B |
| B-3 | **`packageName`**: la (futura) app de Play debe ser `com.zetrynd.app` exacto — el móvil ya usa ese `applicationId`. Confirmar al crear la app; si por algún motivo no puede ser ese nombre → decisión de arquitectura (cambiar `applicationId` del móvil, impacto en C3.5A). | PO | todo Billing |
| B-4 | **Producto de Play requiere build Billing-enabled subida** (Google). Por eso C3.4B va DESPUÉS de C3.5A. Secuenciamiento, no un blocker "roto". | — | C3.4B |
| B-5 | **Keystore de producción / Internal Track** (Q-3) sigue pendiente; obligatorio antes del cierre (C3.8), no antes del primer QA. | PO / DevOps | C3.4-KS, C3.8 |

---

## 12. Pasos explícitos del operador para C3.4B

> **Precondiciones C3.4B (todas):**
> 0. **Cuenta de Google Play Console creada** (B-0) — USD 25 + verificación de
>    identidad + perfil de pagos activo con cobertura Chile.
> 1. App de Play creada con `packageName` = `com.zetrynd.app` (exacto).
> 2. C3.5A-native completado (módulo IAP + `expo prebuild` + PBL resuelto) **y**
>    una build con Billing subida a Play (borrador o Internal testing) —
>    requisito de Google para habilitar la config de productos de Billing.

1. **Play Console → app ZETRYND → Monetización → Productos → Suscripciones →
   Crear suscripción.**
   - Product ID: `zetrynd_premium` — **exacto, permanente**.
   - Nombre: "ZETRYND Premium". Descripción: (copy aprobado por el PO).
2. **Añadir base plan** dentro de esa suscripción:
   - Base plan ID: `premium-monthly` — **exacto, permanente**.
   - Tipo: *Auto-renovable*. Período de facturación: *1 mes*.
   - Sin período de gracia especial más allá del default; sin free trial; sin
     offer.
3. **Precios** → región **Chile** → `CLP 6990`. Revisar que se muestre `$6.990`.
   Publicar precios sólo para los países aprobados (V1: Chile; el PO decide si
   añade más).
4. **Activar** la suscripción y el base plan.
5. **Verificar `queryProductDetails` real** desde el móvil (C3.5B) o desde un
   script: el `productId` `zetrynd_premium` debe devolver `ProductDetails` con
   el base plan `premium-monthly` y el precio CLP. Si vuelve vacío → revisar que
   la build subida tenga el permiso `com.android.vending.BILLING` y que el
   `applicationId` coincida.
6. **License Testers** (§8) confirmados en el dispositivo de QA.
7. **Backend a `google`:** en el entorno de staging/prod poner
   `GOOGLE_PLAY_PROVIDER_IMPL=google` + `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
   (secret). Verificar que el backend arranca (la factory NO lanza) y que un
   `POST /me/subscription/google-play/reconcile` con un `purchaseToken` de
   prueba real devuelve `verified` y `GET /me/entitlement` → `PREMIUM`.
8. **RTDN a `google`:** `GOOGLE_PLAY_RTDN_AUTH_IMPL=google` +
   `GOOGLE_PLAY_RTDN_OIDC_AUDIENCE` + `GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL`.
   Crear la push subscription (§5) apuntando al HTTPS público. Enviar la
   *notificación de prueba* de Play Console → debe llegar como `testNotification`
   y registrarse `DONE` sin mutación.
9. Actualizar §10 de este runbook con todo `DONE` + evidencia.
10. Actualizar el ADR (§N) marcando C3.4A/C3.5A/C3.4B según corresponda.

---

## 13. Qué SÍ puede avanzar sin cuenta de Play Console

| Trabajo | Depende de Play Console | Estado |
|---|---|---|
| Backend C3.1–C3.3 (dominio, adaptador fake, RTDN inbox, worker) | No | `DONE` |
| Google Cloud: proyecto + habilitar Play Developer API | No (la API se habilita en GCP; el *acceso* a datos de Play se concede después) | `PLANNED` (opcional; el operador cuando quiera) |
| Google Cloud: SA `zetrynd-play-billing` y `zetrynd-rtdn-push` (crear, sin permisos) | No | `PLANNED` |
| Pub/Sub: topic `zetrynd-google-play-rtdn` + binding Publisher a la SA de sistema de Google Play | No (el binding es a un email de sistema de Google; funciona sin Play Console, aunque no recibe nada hasta que Play lo apunte) | `PLANNED` |
| **C3.5A-native**: elegir e instalar el módulo IAP (`expo-iap`), `expo prebuild`, **resolver y registrar la versión de `com.android.billingclient:billing`**, compilar un debug APK con Billing | No | próximo increment (no en C3.4A) |
| Gates puros de `BillingState` / flujo móvil (sin red) | No | C3.5B |

**Bloqueado por B-0 hasta que exista la cuenta Play:** el **primer upload a
Play** (parte final de C3.5A), y **todo C3.4B / C3.5B con QA real** (necesitan
producto + License Testers + `queryProductDetails` real).

---

## 14. Qué NO hace el agente

- No crea proyectos, service accounts, topics ni subscriptions (sin acceso a las
  consolas).
- No crea ni activa el producto de Play (`zetrynd_premium` / `premium-monthly`).
- No genera ni pega claves privadas.
- No rellena datos fiscales / bancarios / de entidad.
- No crea la cuenta de Google Play Console, no paga los USD 25, no aporta datos
  de identidad / fiscales / bancarios.
- No toca Railway ni ningún hosting.
- No sube builds ni hace releases.
- No modifica código de producto — este increment es documentación + plantilla
  de config.
