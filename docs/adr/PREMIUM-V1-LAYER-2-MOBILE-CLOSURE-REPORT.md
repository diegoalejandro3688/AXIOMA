# PREMIUM V1 — LAYER 2 / MOBILE ENTITLEMENT UX — CLOSURE REPORT

## Estado

**PREMIUM V1 — LAYER 2 / MOBILE ENTITLEMENT UX — CLOSED**

Cierre **solo documentación + gates**. No product code nuevo · no fixes incidentales · no push · no Railway · no emulator · no Billing · no Prisma.

Este cierre cubre **exclusivamente la Capa 2** de Premium V1: la **presentación móvil** del entitlement ya resuelto y forzado por la Capa 1 (backend). El servidor sigue siendo la única autoridad de authorization; la Capa 2 sólo decide *cómo se ve* un acceso concedido o denegado.

**NO** declara: Premium V1 completo · Google Play Billing implementado · suscripciones reales · precio localizado de la store · compra / restaurar compra · UI de gestión de suscripción · Candidate APK de lanzamiento · validación final de la asignación (allowance) del Tutor contra unit economics.

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre (antes de este commit) | `24348dc` `feat(premium): add tutor ai quota upsell` |
| Base de la Capa 2 | `7bf735f` `docs(premium): close layer 1 entitlement backend` |
| Fecha | 2026-09-02 |
| Dispositivo QA | Samsung físico `R5CW71R7MTP` (nunca emulador) |

Producto y arquitectura de la Capa 2 (Architecture v2) fueron aprobados por separado. Cada incremento funcional (C2.0–C2.4) fue aprobado individualmente, y C2.2/C2.3/C2.4 además con QA en dispositivo físico. Este documento consolida esa implementación y añade la verificación global.

---

## B. Objetivo

Presentar en la app móvil el modelo Premium V1 ya definido y forzado server-side:

- **FREE**: primeras 2 unidades de cada materia + todo su contenido, Práctica libre, Competir, Perfil/progreso base/cosméticos, catálogo de Ensayos visible, Tutor IA con su cupo FREE.
- **PREMIUM**: todas las unidades, modo Recursos independiente, crear intentos de Ensayo, cupo ampliado del Tutor IA. **Mismo modelo / inteligencia / herramientas** — Premium sólo compra profundidad y cantidad, nunca poder competitivo ni un modelo mejor.

Restricciones de diseño transversales: el móvil nunca reimplementa una regla de negocio (posiciones de unidad, números de cuota, límites de turnos); un estado de entitlement incierto (`loading`/`error`) nunca se interpreta como FREE; el paywall es informativo (no hay compra en Capa 2); ningún sistema FREE (Práctica libre, Competir, Perfil, progreso, Inicio, runner/resultado/revisión de Ensayos) gana gating Premium.

---

## C. Scope

**Dentro** (Capa 2): `EntitlementProvider` + `useEntitlement`; host global del paywall + primitivas (`PremiumPaywall`, `PremiumBadge`, `PremiumLockedScreen`, `EntitlementUnavailable`); gating de presentación en Estudio (Unidades, menú de materia, modo Recursos, 3 rutas de deep-link) y Ensayos (lista + pre-start); upsell opcional del Tutor IA; fix de regresión de Inicio provocada por el enforcement de Capa 1; helpers puros de decisión; 6 gates nuevos + 2 gates existentes ampliados.

**Fuera**: cualquier cambio de backend / contratos / Prisma; Billing y ciclo de vida de suscripción (Capa 3); rediseño visual del Tutor / de las tarjetas; endpoints nuevos; Práctica libre, Competir, Perfil, cosméticos, runner/resultado/revisión de Ensayos (verificados intactos, ver §K).

---

## D. Commits consolidados (C2.0 – C2.4)

| Inc. | Commit | Mensaje | Contenido |
|---|---|---|---|
| C2.0 | `70825a9` | `feat(premium): add mobile entitlement provider` | `lib/entitlement/{types,entitlement-provider,premium-error,pricing}.ts`, `lib/api/entitlement.ts`, montaje en `_layout.tsx`. `nextEntitlementState` puro. `verify:entitlement-mobile-gate`. |
| C2.0 (audit) | `d0d3d60` | `test(premium): prove entitlement provider concurrency invariants` | Gate-only: secciones H (simulación de ownership del cleanup de request obsoleta) + I (estabilidad de `runFetch`). Sin cambio de producto. |
| C2.1 | `74d9e87` | `feat(premium): add paywall host and premium primitives` | `PaywallProvider`/`usePaywall`, `<PremiumPaywall>` sobre `Dialog`, `<PremiumBadge>`, `<PremiumLockedScreen>`. `verify:premium-paywall-gate`. Ninguna pantalla llama `open()` aún. |
| C2.2 | `154f01c` | `feat(premium): gate premium study content on mobile` | Unidades (fetch de children condicional al tier + U3+ locked), tile Recursos, `recursos.tsx`, `resource-catalog.ts` (discriminante `premiumRequired`), deep-links. `verify:study-premium-gating-gate`. |
| C2.2 (follow-up) | `8e6e0ca` | `fix(premium): handle premium-required progress write and stale resource-catalog load` | `SubmitResponseOutcome.code` + `isPremiumRequiredOutcome`; `ejercicio.tsx` mapea el 403 de escritura tras downgrade → `<PremiumLockedScreen>`; `recursos.tsx` `loadGenRef` anti-stale. |
| C2.2 (regresión Inicio) | `1bfa586` | `fix(premium): keep Home available for FREE after Layer 1 enforcement` | `pickContinueTarget({ freeUnitsOnly })` filtra por `isFreeUnitPosition`; 403 en children = no-fatal; `index.tsx` pasa el tier confirmado. |
| C2.3 | `3620875` | `feat(premium): gate new exam attempts on mobile` | `ensayos/index.tsx` badge + tile atenuada (tap → pre-start, nunca paywall); `ensayos/[examId]/index.tsx` sólo el 403 de `startExamAttempt` abre el paywall. `verify:exam-premium-gating-gate`. |
| C2.4 | `24348dc` | `feat(premium): add tutor ai quota upsell` | `lib/entitlement/ai-limit-upsell.ts` (predicado puro), `components/ai/ai-limit-upsell.tsx` (fuera del scan legacy), wiring en las 2 pantallas del Tutor. `verify:ai-premium-gating-gate`. |

`git diff --stat 7bf735f..24348dc` — **34 files, +2438 −139**. `apps/backend` intacto. Cada incremento fue staged archivo por archivo — **nunca `git add .`**, **sin push**.

---

## E. Resumen de arquitectura

### E.1 Fuente de verdad

`GET /me/entitlement` → `{ tier: 'FREE' | 'PREMIUM' }` (contrato estricto, sin pricing). Es la **única** llamada de entitlement del móvil. Ningún `403 PREMIUM_REQUIRED` de una API de dominio se reinterpreta como cambio de tier; cada superficie llama explícitamente a `isPremiumRequiredError(result)` en su rama de error y decide su propio `origin` de paywall.

### E.2 Modelo de estado (`lib/entitlement/types.ts`)

```
EntitlementState = { status: 'loading' } | { status: 'ready'; tier } | { status: 'error' }
```

- `isFree` / `isPremium` son `true` **únicamente** bajo `status === 'ready'`.
- `nextEntitlementState(prev, result)` — transición pura:
  - éxito → `{ ready, tier }`
  - fallo **con** tier confirmado previo → conserva ese estado (stale interno, nunca degrada)
  - fallo **sin** tier previo → `{ error }` (técnico, jamás FREE)
- El tier **nunca** se persiste (ni SecureStore ni AsyncStorage).
- Un `401` no llega a este modelo: lo intercepta el unauthorized handler global de `lib/api/client.ts`.

### E.3 Concurrencia (`EntitlementProvider`)

`generationRef` (se incrementa en cada cambio de sesión, invalida lo en vuelo), `inFlightRef` + `inFlightGenRef` (dedup por generación), `accountIdRef`, `lastConfirmedTierRef`. Guard antes de cada `setState`: `if (gen !== generationRef.current || account !== accountIdRef.current) return`. `.finally` owner-scoped por generación. `runFetch` deps `[auth.status, auth.accountId]` (nunca `state`), `setState((prev) => nextEntitlementState(prev, result))` funcional. Invariantes A (ownership del cleanup) y B (`runFetch` estable, sin bucle de hidratación) probados en el gate (secciones H/I).

### E.4 Paywall (host global)

`PaywallProvider` renderiza `<PremiumPaywall>` **una sola vez**; las superficies llaman `usePaywall().open(origin)`. Cierra y limpia `origin` en logout / cambio de `accountId`. `<PremiumPaywall>` está construido sobre el `Dialog` genérico existente — **sin route, sin bottom sheet, sin modal propio**. Encabezado por `origin`, lista de beneficios compartida sin "sin límites", precio desde `PREMIUM_PRICE_DISPLAY` (`'$6.990 CLP / mes'`, marcado `TEMPORARY PRE-BILLING DISPLAY ONLY`, único string, único consumidor). "Disponible próximamente" = `<Text>` no interactivo; "Ahora no" (`secondaryAction`) = única acción, cierra el diálogo. **Sin `primaryAction`, sin compra, sin simulación de compra, sin mutación de suscripción, sin override interno expuesto.**

`PaywallOrigin` = exactamente `'unit' | 'resources' | 'exams' | 'ai_quota'`.

### E.5 Primitivas

| Primitiva | Uso | Regla visual |
|---|---|---|
| `<PremiumBadge>` | Unidades U3+, tile Recursos, cards de Ensayo (FREE) | Componente propio (no toca `Chip`). `lock` + tokens `state.warning`. Sin `opacity`. |
| `<PremiumLockedScreen>` | Modo Recursos (FREE), deep-links a contenido Premium | `onBack` **explícito y obligatorio** — nunca infiere la ruta desde `origin`. "Ver Premium" → `open(origin)`. |
| `<EntitlementUnavailable>` | Error inicial de entitlement en Unidades / Recursos | Reintento **técnico** neutro (`onRetry` llama sólo a `refresh()`). Copy congelado: `No pudimos verificar tu acceso` / `Inténtalo de nuevo para continuar.` / `Reintentar`. **No es un lock comercial.** |
| Atenuación de tile | Cards bloqueadas (Unidades, Ensayos) | Sólo el tile/motivo decorativo se tiñe con `state.warning`; el **título va a contraste pleno**; sin opacity de card, sin blur, sin overlay. Tono calibrado en QA Samsung. |
| `<AiLimitUpsell>` | Pantallas del Tutor IA (FREE + bloqueado por cuota) | Ver §I. |

---

## F. Matriz de comportamiento Free vs Premium

| Superficie | FREE | PREMIUM | Entitlement `loading`/`error` |
|---|---|---|---|
| **Estudio — Unidades U1/U2** | Accesible, **exactamente igual que antes** (contenido, progreso, práctica) | Accesible | `LoadingState` local; error → `<EntitlementUnavailable>` (retry técnico), nunca lock |
| **Estudio — Unidades U3+** | Visibles, card con `<PremiumBadge>`, tile atenuada, tap → `open('unit')`. **Los children de U3+ nunca se piden** (`filter` por `isFreeUnitPosition`) | Accesibles, cards normales | ídem — sin lock comercial |
| **Estudio — Recursos (modo catálogo independiente)** | Tile con `<PremiumBadge>` → `open('resources')`; la pantalla corta a `<PremiumLockedScreen>` **sin ensamblar el catálogo** | Accesible (catálogo completo) | Navega normal; la pantalla destino gestiona su propio loading/error |
| **Estudio — Recursos dentro de U1/U2** | Accesibles vía Unidades (no via el modo catálogo) | Accesibles por ambas vías | — |
| **Estudio — deep-links** (`unidad/[unitId]`, `topic/[topicId]/{recurso,ejercicio}`) | `403 PREMIUM_REQUIRED` → `<PremiumLockedScreen origin="unit">` con `onBack` propio (fallback de router seguro), **antes** del 404→vacío | Contenido normal | Carga normal; el 403 sólo aparece si el backend lo devuelve |
| **Estudio — escritura de progreso sobre U3+** | Bloqueada server-side (C1.4). Si PREMIUM abrió el ejercicio y luego bajó a FREE, la respuesta nueva → `403 PREMIUM_REQUIRED` → `<PremiumLockedScreen>`; el outbox marca la operación `FAILED` (4xx, no se reintenta); un fallo de red conserva la semántica offline (`PENDING`) | Permitida | — |
| **Práctica libre** | 100% FREE, sin ningún cambio (gate lo prueba: no importa entitlement/paywall/premium) | Idéntica | — |
| **Ensayos — lista** | `GET /exams` visible; cada card con `<PremiumBadge>` + tile atenuada; **tap sigue navegando al pre-start** (nunca abre el paywall desde la lista) | Cards normales | Cards normales, sin estado comercial |
| **Ensayos — crear intento nuevo** | `startExamAttempt` → el backend decide (resume-first, C1.2): `200` si hay ACTIVE reanudable, `403 PREMIUM_REQUIRED` si no. **Sólo** `isPremiumRequiredError` abre `open('exams')`. Sin bloqueo preventivo `if (isFree)` | `200` intento nuevo | Sin bloqueo; el backend resuelve al actuar |
| **Ensayos — intento ACTIVE tras downgrade** | Reanudable: cache válida → "Continuar ensayo" (`handleResume`, sin paywall); cache perdida → "Comenzar" → `startExamAttempt` → `200` con el mismo ACTIVE → runner. **No hay paywall en ninguno de los dos caminos** | — | — |
| **Ensayos — resultado / revisión** | Accesibles tras downgrade (intento creado legítimamente en PREMIUM). Sin badge, sin paywall | Accesibles | — |
| **Tutor IA — modelo / herramientas** | Mismo modelo, misma inteligencia, mismas herramientas | Idéntico | — |
| **Tutor IA — bajo cuota** | Tutor normal, sin upsell | Normal | Normal |
| **Tutor IA — cuota agotada** (`!availability.canSend`, derivado del servidor: cupo diario **o** límite de turnos) | Estado bloqueado existente + `<AiLimitUpsell>` con CTA `Amplía tu Tutor IA` → `open('ai_quota')` (**sólo** al pulsar) | Estado bloqueado existente, **sin** upsell (PREMIUM tiene sus propios límites V1) | Estado bloqueado existente, **sin** upsell (nunca se infiere FREE) |
| **Inicio** | 100% usable. "Continuar estudiando" refleja el progreso **accesible** (U1/U2); un `403` de una unidad Premium es **no-fatal** (esa unidad no aporta recursos). Sin paywall, sin badge, sin lock | ídem, considerando también U3+ | Recorre todas las unidades + defensa 403; nunca se bloquea por el entitlement |
| **Competir / Ranking / Desafíos** | 100% FREE, sin ninguna referencia a entitlement/paywall/premium | Idéntico | — |
| **Perfil / progreso base / cosméticos** | 100% FREE | Idéntico | — |

---

## G. Ciclo de vida del entitlement

1. **Arranque en frío**: `(tabs)` no se bloquea. Cada superficie que necesita el tier muestra su carga local hasta que el entitlement resuelve.
2. **`loading`**: sin locks comerciales, sin paywall, sin upsell. La UI existente (LoadingState local) se mantiene.
3. **Error inicial** (sin tier confirmado previo): `<EntitlementUnavailable>` (reintento técnico neutro; `onRetry` → `refresh()`; el `load()` de contenido se dispara solo cuando el estado vuelve a `ready`). **Nunca** un lock/paywall/upsell.
4. **`ready`**: `isFree`/`isPremium` disponibles. Las superficies cargan/gatean según el **tier confirmado**, no según `status:'ready'` a secas.
5. **Refresh fallido con tier previo confirmado**: conserva ese tier (stale interno). No se revoca acceso por un blip de red.
6. **Refresco al volver a foreground** (`AppState → 'active'`): `runFetch` — dedup por generación, sin bucle.
7. **Logout / cambio de cuenta**: `generationRef++` invalida lo en vuelo; el estado vuelve a `loading`; `lastConfirmedTierRef` se limpia; el paywall se cierra y su `origin` se resetea.
8. **`401`**: unauthorized handler global (reset de sesión) — no se maneja en el provider.

### G.1 `FREE → PREMIUM` (sin logout)

- El `EntitlementProvider` refresca (foreground o `refresh()`), `state` pasa a `ready/PREMIUM`.
- **Estudio**: `unidades.tsx` / `recursos.tsx` tienen `load` con deps `[subjectId, confirmedTier]` → recargan; las cards U3+ se desbloquean, el modo Recursos deja de cortar a `<PremiumLockedScreen>`.
- **Ensayos**: `isFree` pasa a `false` → los badges y la atenuación desaparecen (re-render, sin refetch de `GET /exams`).
- **Tutor IA**: `shouldShowAiLimitUpsell` pasa a `false` → el upsell desaparece; que el Tutor vuelva a ser usable lo decide la disponibilidad del servidor (los contadores de uso **se conservan** en el cambio de plan — el móvil **no** asume que subir de plan resetea la cuota).
- **Inicio**: `load` con dep `[confirmedTier]` → refresco silencioso que ahora considera U3+.

### G.2 `PREMIUM → FREE`

- **Estudio**: render gateado por `state.tier === confirmedTier` → las cards Premium desaparecen de inmediato (loading breve hasta que la recarga FREE completa). Una carga async obsoleta (petición de otra materia/tier en vuelo) **no puede** sobrescribir el estado actual (`loadGenRef` / `if (gen !== ….current) return` tras cada await).
- **Escritura nueva sobre `PREMIUM_UNIT`**: bloqueada server-side; el móvil la enruta a `<PremiumLockedScreen>` sin tratarla como éxito.
- **Lecturas de progreso académico**: siguen abiertas; ningún dato se borra.
- **Ensayo ACTIVE**: sigue reanudable/finalizable (excepción congelada, §H).
- **Resultado / revisión** de un intento ya creado: siguen accesibles.
- **Tutor IA**: sólo produce upsell si el estado derivado del servidor dice que la cuenta FREE está actualmente bloqueada.

---

## H. Excepción de Ensayo ACTIVE (congelada)

El backend (C1.2) es **resume-first**: `POST /exams/:examId/attempts` con una cuenta FREE devuelve `200` con el intento ACTIVE existente si lo hay, o `403 PREMIUM_REQUIRED` si no hay ninguno que reanudar. El móvil **no duplica ni debilita** esta autoridad:

- **Con cache local válida** → `handleResume` navega directo al runner. Sin consultar entitlement, sin paywall.
- **Sin cache** (o cache inválida) → "Comenzar ensayo" → `startExamAttempt` → el backend reanuda el mismo ACTIVE (`200`) → `rememberActiveAttempt` + runner. **Sin paywall.**
- **Sin ACTIVE** (FREE genuino) → `startExamAttempt` → `403 PREMIUM_REQUIRED` → `open('exams')`.

Nunca hay un bloqueo preventivo `if (isFree) { open('exams'); return; }` antes del `POST` — rompería el caso *FREE + ACTIVE en el servidor + cache local ausente*, que el backend soporta a propósito.

---

## I. Comportamiento de cuota del Tutor IA

- El servidor sigue siendo la única autoridad. Las pantallas del Tutor ya derivan un estado de bloqueo con `resolveSendAvailability` (cupo diario agotado **o** límite de turnos de la conversación) — `!availability.canSend`.
- Un `409` crudo **no** es autoridad de cuota: la pantalla sólo lo trata como bloqueo real cuando coincide con `!availability.canSend`; un `409` no relacionado conserva su comportamiento de error existente.
- `lib/entitlement/ai-limit-upsell.ts` — predicado **puro**: `shouldShowAiLimitUpsell(state, blocked)` = `blocked && state.status === 'ready' && state.tier === 'FREE'`.
- `components/ai/ai-limit-upsell.tsx` — componente dedicado **fuera** de la superficie escaneada por `verify:ai-mobile-gate` (`allAiSources`). Vive en `components/ai/` en vez del `components/premium/` sugerido porque el string de import en las pantallas escaneadas llevaría la subcadena `premium` y rompería el gate legacy. Copy modesto (`¿Necesitas seguir estudiando con el Tutor?` / `Premium amplía tus consultas disponibles.`), CTA exacto `Amplía tu Tutor IA`, `usePaywall().open('ai_quota')` **sólo** desde el `onPress`. Sin lógica de cuota, sin requests, sin números de plan, sin "sin límites", sin Billing.
- **PREMIUM** que alcanza su propio límite finito V1 → estado bloqueado existente, **nunca** upsell.
- Los contadores de uso del Tutor se conservan en los cambios de tier — el móvil no asume que subir de plan resetea la cuota.

---

## J. Fix de regresión de Inicio (parte de la Capa 2)

El enforcement de la Capa 1 (C1.3: `GET /education/topics/:premiumUnitId/children` → `403` para FREE) rompió "Continuar estudiando" en Inicio, porque `pickContinueTarget()` recorría **todas** las unidades canónicas y trataba cualquier error de children como fatal → `{ ok: false }` → tarjeta "No pudimos cargar tu progreso de estudio." persistente.

Fix (`1bfa586`): `pickContinueTarget({ freeUnitsOnly })` filtra unidades con la regla compartida `isFreeUnitPosition(index)` (nunca códigos hardcodeados) y no pide children de unidades Premium; un `403 PREMIUM_REQUIRED` en children es **no-fatal** (esa unidad no aporta recursos accesibles — cubre además una carrera de entitlement); cualquier otro error sigue siendo fatal. `index.tsx` lee el tier confirmado (`useEntitlement`) y pasa `{ freeUnitsOnly: confirmedTier === 'FREE' }`; `load` con dep `[confirmedTier]`. **Inicio nunca se gatea ni se bloquea por el entitlement** — un tier no resuelto recorre todo y la defensa del 403 lo mantiene funcional. Inicio consume el entitlement **sólo** para optimizar el recorrido de continuación; no es una superficie Premium.

---

## K. Auditoría de consumidores Premium

Enumeración completa de la superficie móvil (`app/`, `lib/`, `components/`):

| Símbolo | Consumidores (código real) | Veredicto |
|---|---|---|
| `useEntitlement` | `estudio/[subjectId]/{index,unidades,recursos}.tsx`, `estudio/ensayos/index.tsx`, `app/(tabs)/index.tsx` (Inicio), `components/ai/ai-limit-upsell.tsx` | Todos intencionales (C2.2 / C2.3 / regresión Inicio / C2.4). El provider (`lib/entitlement/entitlement-provider.tsx`) lo define. |
| `usePaywall` | `estudio/[subjectId]/{index,unidades}.tsx`, `estudio/ensayos/[examId]/index.tsx`, `components/ai/ai-limit-upsell.tsx`, `components/premium/premium-locked-screen.tsx` | Todos intencionales. `lib/entitlement/paywall-context.tsx` lo define. |
| `PremiumBadge` | `estudio/[subjectId]/{index,unidades}.tsx`, `estudio/ensayos/index.tsx` | C2.2 / C2.3. |
| `PremiumLockedScreen` | `estudio/[subjectId]/recursos.tsx`, `estudio/[subjectId]/unidad/[unitId].tsx`, `estudio/topic/[topicId]/{recurso,ejercicio}.tsx` | C2.2. (`premium-error.ts` y `resource-catalog.ts` sólo lo mencionan en prosa de docstring.) |
| `AiLimitUpsell` / `shouldShowAiLimitUpsell` | `ia/index.tsx`, `ia/conversation/[conversationId].tsx` | C2.4. `lib/entitlement/ai-limit-upsell.ts` (predicado) + `components/ai/ai-limit-upsell.tsx` (componente). |
| `isPremiumRequiredError` | `estudio/[subjectId]/unidad/[unitId].tsx`, `estudio/ensayos/[examId]/index.tsx`, `estudio/topic/[topicId]/{recurso,ejercicio}.tsx`, `lib/study/resource-catalog.ts`, `lib/progress/pick-continue-topic.ts` | C2.2 / C2.3 / regresión Inicio. `lib/entitlement/premium-error.ts` lo define. |
| `isPremiumRequiredOutcome` | `estudio/topic/[topicId]/ejercicio.tsx` | C2.2 follow-up (escritura de progreso tras downgrade). Definido en `premium-error.ts`. |

**Ningún consumidor inesperado.** Los allowlists de los gates (`verify:premium-paywall-gate` §J, `verify:study-premium-gating-gate`, `verify:exam-premium-gating-gate`, `verify:ai-premium-gating-gate`) reflejan exactamente esta lista.

### K.1 Sin fuga de Premium en sistemas FREE

Verificado por grep + gates dedicados — **cero** referencias a entitlement/paywall/premium en:

- Práctica libre (`estudio/[subjectId]/practica-libre.tsx`) — `verify:study-premium-gating-gate` §F.
- Competir / Ranking / Desafíos (`app/(tabs)/competir/**`, `lib/api/challenges.ts`).
- Perfil (`app/(tabs)/perfil/**`), cosméticos (`lib/api/cosmetics.ts`).
- Lecturas de progresión base (`lib/api/progression.ts`).
- Runner / resultado / revisión de Ensayos (`estudio/ensayos/[examId]/{attempt,result,review}/[attemptId].tsx`) — `verify:exam-premium-gating-gate` §D + `verify:premium-paywall-gate` §J.
- Inicio — consume entitlement **sólo** para el recorrido de continuación; no renderiza paywall/badge/lock (`verify:continue-target-batch-gate` §15).

---

## L. Gates ejecutados

Todos **verdes** en `24348dc`. Ninguno fue debilitado para obtener verde.

### L.1 Gates Premium nuevos (Capa 2)

| Gate | Cubre |
|---|---|
| `verify:entitlement-mobile-gate` | `GET /me/entitlement` + schema estricto; `isPremiumRequiredError`; `nextEntitlementState` (transiciones puras); `EntitlementTier` derivado del contrato; `pricing.ts` (constante única, no importada por `lib/api/*`); estructura del provider; montaje en `_layout`; **H** simulación behavioral de ownership del cleanup; **I** pin de deps de `runFetch`/effects/`useMemo`. |
| `verify:premium-paywall-gate` | `PaywallProvider`/`usePaywall`; `<PremiumPaywall>` sobre `Dialog` (sin route/sheet); "Disponible próximamente" no interactivo; "Ahora no" única acción; sin compra/Billing/override; precio desde la constante; sin "sin límites"; `<PremiumBadge>` propio (no toca `Chip`), sin opacity; `<PremiumLockedScreen>` `onBack` explícito, route-agnostic; sin assets. **§J** consumidores: Estudio (C2.2) + Ensayos (C2.3) + Tutor IA vía frontera `AiLimitUpsell` (C2.4); pantallas del Tutor sin tocar primitivas directamente; runner/resultado/revisión de Ensayos sin primitivas; superficie IA sin subcadenas de plan. |
| `verify:study-premium-gating-gate` | FREE nunca pide children de U3+ (filtro `isFreeUnitPosition`); U1/U2 sin cambios; sin códigos/nombres/`index === 2` hardcodeados; loading/error nunca muestran lock; retry state-driven (`refresh()`); la carga responde a `[subjectId, confirmedTier]`; `loadGenRef` anti-stale; `PREMIUM → FREE` bloquea de inmediato; Recursos corta sin ensamblar catálogo; `resource-catalog.ts` discrimina `premiumRequired`; deep-links mapean el 403 → `<PremiumLockedScreen origin="unit">` con `onBack` propio; **E2** escritura de progreso 403 tras downgrade (behavioral + outbox 4xx→FAILED, network→PENDING); **E3** carga de catálogo obsoleta descartada por generación (harness); Práctica libre sin tocar; `premium-card-style.ts` diferido. |
| `verify:exam-premium-gating-gate` | Lista: badge sólo para `isFree`, tap navega al pre-start, la lista nunca abre el paywall, loading/error sin lock, sin opacity de card, `GET /exams` no re-pedido por cambio de tier. Pre-start: `handleResume` intacto sin gate; `handleStart` siempre llama `startExamAttempt`; sólo `isPremiumRequiredError` abre `open('exams')`; sin bloqueo preventivo `if (isFree)`; cache de intentos sin cambios. **Invariante ACTIVE (behavioral)**: `200` ACTIVE → runner sin paywall; `403 PREMIUM_REQUIRED` → paywall sin runner; `403` sin code / `409` → ErrorState. Runner/resultado/revisión sin gating nuevo. |
| `verify:ai-premium-gating-gate` | Predicado puro `shouldShowAiLimitUpsell` (tabla de verdad de 6 casos: FREE+blocked→sí; PREMIUM/loading/error→no; `!blocked`→no). Componente: `usePaywall`, CTA exacto, `open('ai_quota')` una vez y sólo en `onPress`, sin "sin límites"/Billing/números de plan, tokens del tema. Wiring: hub + conversación montan `<AiLimitUpsell blocked={<estado servidor>}>`, sin `usePaywall`/`useEntitlement`/`open(...)` en las pantallas, sin subcadenas prohibidas por el gate legacy, sin apertura automática. `verify:ai-mobile-gate.ts` byte-idéntico. |

### L.2 Gates existentes ampliados

| Gate | Cambio |
|---|---|
| `verify:continue-target-batch-gate` | **§15** (regresión Inicio): FREE salta unidades Premium (`freeUnitsOnly` + `isFreeUnitPosition`); `403 PREMIUM_REQUIRED` en children no-fatal; error no-Premium sigue fatal; PREMIUM recorre todo; asserts estáticos en `index.tsx`. Los 14 escenarios previos siguen verdes. |
| `verify:exam-mobile-flow-gate` | Sin editar. §14 (árbol de trabajo limpio para archivos de Study) verde post-commit. |

### L.3 Gates de regresión (verdes, sin editar)

`verify:ai-mobile-gate` (byte-idéntico, congelado antes de Premium), `verify:study-navigation-gate`, `verify:unidades-batch-gate`, `verify:recursos-catalog-gate`, `verify:free-practice-gate`, `verify:offline-outbox-gate`, `verify:quick-question-gate`, `verify:challenges-gate`, `verify:cosmetics-gate`, `verify:advanced-profile-mobile-gate`, `verify:competitive-profile-gate`, `verify:league-participation-gate`, `verify:leaderboard-gate`, `verify:api-client-gate`, `verify:unit-motif-gate`.

### L.4 Herramientas

`pnpm -C apps/mobile typecheck` — limpio. `pnpm -C apps/mobile lint` — limpio. `git diff --check` — limpio (sólo advertencias LF→CRLF esperadas en Windows).

---

## M. Evidencia de QA en dispositivo

**Samsung físico `R5CW71R7MTP`** (nunca emulador). Cada incremento se validó al aprobarse; el override interno de tier (`POST /_internal/entitlement/set-tier-override`, in-memory, sólo dev local) se usó para conmutar FREE ↔ PREMIUM sin Billing.

| Incremento | QA registrada |
|---|---|
| C2.2 | FREE: U1/U2 normales; U3+ locked con `<PremiumBadge>`; modo Recursos locked; recursos de U1/U2 accesibles vía Unidades. Regresión de Inicio detectada aquí ("No pudimos cargar tu progreso de estudio.") y corregida en `1bfa586`, re-verificada. |
| C2.3 | FREE: lista de Ensayos visible con badges; tap → pre-start; "Comenzar" → paywall `exams`, sin error genérico. PREMIUM: cards normales; "Comenzar" crea intento; runner funciona. PREMIUM → FREE con ACTIVE + cache: "Continuar" funciona, sin paywall. PREMIUM → FREE con ACTIVE sin cache: "Comenzar" reanuda el mismo intento, sin paywall. Completado: resultado/revisión accesibles tras downgrade. Consistencia light/dark del badge/atenuación. |
| C2.4 | FREE bajo cuota → Tutor normal, sin upsell. FREE límite diario alcanzado → estado bloqueado + `Amplía tu Tutor IA`. FREE límite de conversación → mismo upsell. CTA → paywall `ai_quota`; cerrar → queda en el Tutor. PREMIUM bajo cuota → normal. PREMIUM su propio límite → bloqueado sin upsell. El caso *entitlement `loading`/`error` → sin upsell falso* **no se probó en dispositivo**: queda cubierto de forma behavioral por `verify:ai-premium-gating-gate` (tabla de verdad de `shouldShowAiLimitUpsell`: `loading`/`error` → nunca upsell). |

### M.1 Evidencia de la Capa 2 en el cierre (C2.5)

C2.5 **no** ejecutó una pasada de QA física propia. Consolida:

1. La **QA incremental en Samsung `R5CW71R7MTP` ya aprobada** para C2.2, C2.3 y C2.4 (tabla anterior) — incluidos los escenarios profundos de downgrade / intento ACTIVE / camino de escritura, validados en su momento y **no** recreados aquí.
2. La **corrida global de gates** en `24348dc` (§L): todos los gates Premium + los gates de regresión directamente afectados + `typecheck` + `lint` + `git diff --check`, todos verdes, ninguno debilitado.

El cierre de C2.5 es **documentación + auditoría**; no añade comportamiento ni requiere verificación de dispositivo adicional.

---

## N. Trabajo diferido (NO implementado en Capa 2)

Registrado explícitamente como pendiente para la **Capa 3 — Billing**:

- Integración con Google Play Billing.
- Ciclo de vida real de suscripción (`AccountSubscription` / `SubscriptionSummary`, separado de `AccountEntitlement`: authorization ≠ billing).
- Precio localizado derivado de la metadata de la store (reemplaza `PREMIUM_PRICE_DISPLAY`).
- Compra / restaurar compra.
- Perfil → Ajustes → Suscripción (gestión / cancelación).
- UI de renovación / expiración. **Cancelar auto-renovación ≠ downgrade inmediato** — el entitlement sigue PREMIUM hasta `currentPeriodEnd`.
- Validación final de la asignación (allowance) propuesta del Tutor Premium contra unit economics.
- Retirar el alias `@deprecated` del override IA y el `EntitlementInternalAdminController` cuando exista Billing.

Otros diferidos menores:

- `premium-card-style.ts` (helper visual compartido de atenuación de card) — diferido desde C2.2; hoy la atenuación es inline en `unidades.tsx` y `ensayos/index.tsx` con los mismos tokens. No se refactorizó `unidades.tsx` (QA-approved) por relación riesgo/beneficio.
- El path del componente del upsell del Tutor (`components/ai/` en vez del `components/premium/` sugerido) — decisión deliberada por el scan del gate legacy; documentada en §I.

---

## O. No-goals (confirmados)

Sin Billing · sin ciclo de suscripción · sin UI de suscripción en Perfil · sin cambios de modelo/proveedor/inteligencia del Tutor · sin nuevas herramientas del Tutor · sin rediseño del streaming · sin rediseño visual del Tutor ni de las tarjetas · sin cambios en `Card` global · sin assets nuevos · sin backend / contratos / endpoints / Prisma / migraciones · sin compra ni simulación de compra · sin paywall automático · sin override interno expuesto en la UI de producto.

**Específico de C2.5**: sin cambios de producto adicionales en Estudio / Ensayos / Tutor IA / Inicio durante C2.5 — el cierre fue exclusivamente documentación + auditoría (el único artefacto de C2.5 es este reporte, commit `969dd2e`). Los cambios de producto de la Capa 2 son los de C2.0–C2.4 documentados en §D.

---

## P. Convención de tag

Igual criterio que los cierres previos (`PREMIUM-V1-LAYER-1-*`, `COMPETIR-V1-*`, `STUDY-V1-*`, `TUTOR-IA-V1-*`): **sin tag** por ser una sub-capa. Un tag de Premium V1 correspondería sólo al cierre global de las tres capas.

Commit sugerido para este cierre: `docs(premium): close layer 2 mobile entitlement ux`. Sin push. Sin Railway.

---

## Q. Estado final

**PREMIUM V1 — LAYER 2 / MOBILE ENTITLEMENT UX — CLOSED**

La app móvil presenta correctamente el modelo Premium V1 forzado por la Capa 1: Estudio, Ensayos y Tutor IA muestran el estado Premium apropiado para cuentas FREE, sin filtrar gating a ningún sistema FREE, sin inferir FREE bajo incertidumbre, y sin duplicar ninguna autoridad del backend. El paywall es informativo (no hay compra en Capa 2).

**NO** declara: Premium V1 completo · Billing · suscripciones reales · precio de store · Candidate APK de lanzamiento. Lo pendiente es la **Capa 3 — Google Play Billing + `AccountSubscription` + gestión/cancelación**.
