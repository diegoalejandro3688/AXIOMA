# PREMIUM V1 — LAYER 1 / ENTITLEMENT BACKEND — CLOSURE REPORT

## Estado

**PREMIUM V1 — LAYER 1 / ENTITLEMENT BACKEND — CLOSED**

Cierre **solo documentación**. No product code · no gates nuevos · no fixes incidentales · no push · no Railway · no emulator.

Este cierre cubre **exclusivamente la Capa 1** de Premium V1 (fuente de verdad de authorization + enforcement server-side). **NO** declara: Premium V1 completo · mobile gating implementado · Billing implementado · suscripciones listas · Candidate APK ready.

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre (antes de este commit) | `13a1120` `feat(premium): gate premium progress writes, preserve existing data` |
| Base | `1fe8397` `docs(ui): close tutor and visual review v1` (cierre anterior) |
| Fecha | 2026-09-02 |

Product spec y arquitectura de Capa 1 fueron aprobadas por separado (product spec APPROVED; arquitectura v2 APPROVED con enmiendas). Este documento consolida la **implementación** de esa Capa 1.

---

## B. Commits consolidados

| Inc. | Commit | Mensaje | Contenido |
|---|---|---|---|
| C1.0 | `d81447a` | `feat(premium): add shared entitlement contract` | `packages/contracts/src/premium.ts` — predicado de posición, schema de entitlement, code de error. Sin runtime consumidor. |
| C1.1 | `2f85a0d` | `feat(premium): add account entitlement service and endpoint` | `apps/backend/src/entitlement/` (service + `GET /me/entitlement` + override interno no-prod). `AiEntitlementService` → adaptador delgado. |
| C1.2 | `9c2a65c` | `feat(premium): gate new exam attempts behind premium` | `ExamService.startAttempt` — crear un intento nuevo exige PREMIUM; reanudar un ACTIVE vigente no. Guardrail de transacción (sentinel + throw post-commit). |
| C1.3 | `78f1bf2` | `feat(premium): gate premium unit content, prove no non-canonical leak` | `PremiumContentPolicy` (clasificador estructural de 4 estados) + gate en `topics/:id/{children,resource,questions}`. |
| C1.4 | `13a1120` | `feat(premium): gate premium progress writes, preserve existing data` | `ProgressService.submitResponse` — gate en la escritura nueva de progreso sobre `PREMIUM_UNIT`. |

`git diff --stat 1fe8397..13a1120` — 26 files, +1670 −67 (11 archivos de `apps/backend/src`, 8 gates nuevos/editados, `packages/contracts/src/premium.ts` + `index.ts`).

**Nunca `git add .`** — cada incremento fue staged archivo por archivo. **No push.**

---

## C. Decisiones congeladas

### 1. `AccountEntitlement = FREE | PREMIUM` — única frontera de authorization

`EntitlementService.getEntitlement(accountId): Promise<{ tier: 'FREE' | 'PREMIUM' }>` es la **única** fuente de verdad de authorization de todo el backend. Estudio, Ensayos, Progreso e IA la consumen de forma idéntica; ninguno conoce el concepto de plan/precio/suscripción en sí. `premiumTierSchema` (`z.enum(['FREE','PREMIUM'])`) vive en `@axioma/contracts`.

V1: `getEntitlement` resuelve **toda cuenta productiva como `FREE`**. `PREMIUM` solo se alcanza vía `testOnlyTierOverride` — mapa en memoria, poblado únicamente por `POST /_internal/entitlement/set-tier-override` (`InternalOpsGuard` + rechazo explícito en `NODE_ENV === 'production'`), reiniciado en cada arranque del proceso. Nunca persistencia; es un interruptor de prueba para los gates.

### 2. `GET /me/entitlement` — estrictamente `{ tier }`

`@Controller('me/entitlement')` `@Get()`, bajo `AuthGuard`, opera sobre `request.accountId`. Responde `accountEntitlementResponseSchema.parse({ tier })` — schema `.strict()`: **cualquier** campo adicional (precio, estado de suscripción, fechas) es un error de contrato. `GET /auth/me` **no se tocó** (sigue `{ accountId, status }`).

### 3. Billing / Subscription — completamente separado, diferido a Capa 3

`AccountEntitlement` (authorization) y `AccountSubscription` / `SubscriptionSummary` (billing: `autoRenew`, `currentPeriodEnd`, token de store, estado comercial) son **conceptos separados y congelados como tales**. En Capa 1 **no existe** ningún modelo Prisma, tabla, migración, endpoint ni contrato de facturación. Ningún endpoint de contenido conoce ni conocerá `autoRenew` / `currentPeriodEnd`; solo leen `tier`.

### 4. Cancelar auto-renew en Capa 3 NO implicará downgrade inmediato

Cuando exista `AccountSubscription`, `EntitlementService.getEntitlement` derivará el tier de la **vigencia del periodo**:

```
tier = (subscription && subscription.currentPeriodEnd > now) ? 'PREMIUM' : 'FREE'
```

`autoRenew === false` (usuario canceló) **no degrada**: la cuenta sigue `PREMIUM` hasta la **expiración** (`currentPeriodEnd`). El downgrade ocurre por expiry, nunca por cancelación. `EntitlementService` (`entitlement.service.ts`) será el **único archivo** que cambie cuando llegue esa fuente de verdad — el docstring de la clase ya lo declara.

### 5. IA — 3/50 consultas y 6/15 turnos, intactos

`AiEntitlementService` pasó a ser un **adaptador delgado** sobre `EntitlementService`: obtiene el `tier` de la fuente transversal y aplica el mapa `ENTITLEMENTS` **byte-idéntico** — `FREE: { maxTurns: 6, dailyRequestLimit: 3 }`, `PREMIUM: { maxTurns: 15, dailyRequestLimit: 50 }`. `AiConversationService` no cambió una línea. `setTestOnlyTierOverride` se conservó como alias `@deprecated` que delega (cero churn en `AiInternalAdminController` y `verify-ai-quota-gate`). `50/día` sigue aprobado conceptualmente y pendiente de validar contra coste real de API antes del release — no cambiado aquí.

### 6. U1/U2 y todo su contenido son Free

Regla por **posición** (`isFreeUnitPosition(zeroBasedIndex) = Number.isInteger(i) && i >= 0 && i < FREE_UNITS_PER_SUBJECT`, con `FREE_UNITS_PER_SUBJECT = 2`), nunca por código de unidad. Las 2 primeras unidades canónicas de cada materia (en el orden canónico real) son `FREE_UNIT`. **Invariante FREE UNIT → FREE CONTENT:** `topics/:id/children`, `topics/:id/resource`, `topics/:id/questions` y la escritura de progreso sobre cualquier tema bajo esas unidades permanecen libres.

### 7. U3+ y su contenido requieren Premium

Toda unidad canónica en posición ≥ 2 clasifica `PREMIUM_UNIT`. Para una cuenta `FREE`:
- `GET /education/topics/:id/children` → `403 PREMIUM_REQUIRED`
- `GET /education/topics/:id/resource` → `403`
- `GET /education/topics/:id/questions` → `403`
- `POST /progress/topics/:id/responses` (escritura nueva) → `403`

### 8. Práctica libre permanece Free

`POST /education/subjects/:id/practice-questions/{sample, :qvId/answer}` **nunca** se gatea. `verify:free-practice-api-gate` incluye una aserción explícita: la orquestación de práctica libre **nunca** consulta `EntitlementService.getEntitlement` ni `PremiumContentPolicy.classifyTopic`.

### 9. Lista de unidades permanece visible

`GET /education/subjects` y `GET /education/subjects/:subjectId/topics` (la lista de unidades) **no se gatean**. El cliente necesita la lista completa de unidades para pintar candados en Capa 2. El predicado compartido `isFreeUnitPosition` permite que el cliente compute la posición de forma idéntica al backend.

### 10. Ensayos permanecen visibles; crear un attempt requiere Premium

`GET /exams` y `GET /exams/:examId` **no se gatean** — FREE ve la lista de ensayos. El gate duro está **solo** en `POST /exams/:examId/attempts` cuando se va a **crear** un intento nuevo: `403 PREMIUM_REQUIRED` para `FREE`.

### 11. Un ACTIVE exam attempt puede terminarse tras downgrade

`ExamService.startAttempt` resuelve/reanuda un `ACTIVE` vigente **antes** del check de Premium (dentro de la `$transaction`, tras la rama resume-or-expire). Una cuenta que perdió Premium con un ensayo en curso cae en `return { kind: 'ATTEMPT', attempt: existing }` y **continúa su intento**; solo se le impide **iniciar uno nuevo**.

**Guardrail de transacción:** el `403` **nunca** se lanza dentro de la `$transaction` — eso haría rollback del `markExpired` de un intento vencido. La transacción devuelve un sentinel (`StartAttemptOutcome: ATTEMPT | PREMIUM_REQUIRED`) y el `ForbiddenException` se lanza **después del commit**, de modo que la transición a `EXPIRED` de un intento vencido queda persistida aunque la respuesta final sea `403`.

### 12. Progress reads permanecen accesibles

`GET /progress/me/summary`, `GET /progress/topics` (batch) y `GET /progress/topics/:topicId` **nunca** devuelven `403`, ni siquiera sobre temas premium. `getTopicProgress` / `getTopicsProgressBatch` / `getAcademicSummary` **no invocan** `assertPremiumProgressWriteAllowed`.

### 13. Solo escrituras nuevas sobre contenido Premium requieren Premium

`ProgressService.submitResponse` — el único call-site de `assertPremiumProgressWriteAllowed` está colocado:
- **después** del replay por `operationId` (idempotencia de transporte retorna antes),
- **después** de la idempotencia de negocio (`resolveAgainstExisting` — misma pregunta/misma alternativa → `200` sin escritura; alternativa distinta → `409` conflicto),
- **antes** de `responseRepo.create` (la única escritura nueva).

Consecuencia: replay idempotente y idempotencia de negocio **siguen funcionando tras un downgrade** (verificado: `200`, nunca `403`, sin fila nueva). Re-upgrade reanuda la escritura.

### 14. El progreso previo nunca se borra al perder Premium

El enforcement gatea **acceso/escritura**, jamás ejecuta borrado ni modificación. `student_response`, `curriculum_topic_progress`, XP, LP, títulos, cosméticos, intentos de ensayo pasados → intactos al downgrade. Verificado byte-a-byte (`answer_option_id`, `is_correct`, `operation_id` sin cambios tras `set-tier-override → FREE`). Al recuperar Premium, todo el progreso preservado reaparece y la escritura se reanuda.

### 15. `PREMIUM_REQUIRED` — `{ code, message }`, sin `origin`

`PREMIUM_REQUIRED_CODE = 'PREMIUM_REQUIRED'` (`@axioma/contracts`). El backend lanza `ForbiddenException({ code: PREMIUM_REQUIRED_CODE, message })`. El filtro global normaliza a `{ error: { code: 'PREMIUM_REQUIRED', message, requestId, timestamp } }` (formato ADR-0007). **Sin `origin`** — el backend no transporta ningún hint de UX.

### 16. El `origin` del paywall es responsabilidad de Capa 2

La superficie móvil que abre `PremiumPaywall` decide el `origin` (`unit` / `resources` / `exams` / `ai_quota`) según qué pantalla/acción disparó la llamada que devolvió `403 + code === 'PREMIUM_REQUIRED'`. Capa 1 no participa.

### 17. Estrategia `NON_CANONICAL` + reconciliación de datos

`PremiumContentPolicy.classifyTopic(topicId)` devuelve 4 estados:
- `UNKNOWN_TOPIC` — el id no corresponde a ningún tema. La policy **no decide acceso**; el `404` lo produce la validación de existencia previa (`getTopicOrThrow` / la validación de `submitResponse`). **Guardrail 1:** entitlement solo puede producir `403` sobre un tema **existente** clasificado `PREMIUM_UNIT`.
- `FREE_UNIT` / `PREMIUM_UNIT` — el tema cuelga de (o es) una unidad canónica en posición `< 2` / `≥ 2`.
- `NON_CANONICAL` — la unidad raíz del tema (`parent_id ?? id`, árbol de 2 niveles) no está en el catálogo canónico de la materia (raíces legacy del seed, contenedor técnico `ensayos`, drift). **Se permite el acceso** (decisión v2). **Guardrail 2:** `EntitlementService` solo se consulta para `PREMIUM_UNIT`; `FREE_UNIT` / `NON_CANONICAL` / `UNKNOWN_TOPIC` no hacen lookup de tier.

`classifyTopic` usa exactamente `topicRepo.findById` + `topicRepo.findCanonicalUnitRootsBySubjectId` (mismo filtro de legacy y mismo `ORDER BY "order" ASC` que la pantalla de Unidades) + `isFreeUnitPosition` (de `@axioma/contracts`). Nunca por nombre visible ni código hardcodeado.

**Reconciliación de datos (READ-ONLY, ejecutada tras C1.3, sin modificar ninguna DB) — TEST-FIXTURE ARTIFACT, non-blocking:**

- **`axioma_dev` (catálogo productivo local) es exacto:** **17** unidades canónicas · **10 `FREE_UNIT`** · **7 `PREMIUM_UNIT`**, coincidencia unidad-por-unidad con la tabla de producto congelada (M1: NUMEROS/ALGEBRA_FUNCIONES free, GEOMETRIA/PROBABILIDAD_ESTADISTICA premium; M2 idéntico; Lenguaje: LOCALIZAR/INTERPRETAR free, EVALUAR premium; Ciencias: BIOLOGIA/FISICA free, QUIMICA premium; Historia: MUNDO_AMERICA_CHILE/FORMACION_CIUDADANA free, SISTEMA_ECONOMICO premium).
- **El output `10 / 9 / 211` de `verify:premium-content-access-gate §C` contó `curriculum_topic` con contenido publicado (`learning_resource_version` o `question_version` PUBLISHED) en `axioma_gates_dev`, NO unidades.** El `console.log` de esa sección usa la etiqueta "posición-FREE/PREMIUM" de forma imprecisa; el conteo real es de temas-con-contenido, agrupados por la posición canónica de su unidad raíz.
- El ruido proviene de fixtures acumulados en `axioma_gates_dev`: `verify-education-gate` crea ~13 "unidades M1" fantasma (`GATE.EDU.UNIT.*`, todas `order=950`), más `verify-*-immutability-gate` / `verify-academic-summary-gate` / coverage / perfil / las 3 materias retiradas de `verify-premium-content-access-gate`. El catálogo productivo real **no está** en `axioma_gates_dev` (M2/Lenguaje/Ciencias/Historia tienen 0 unidades canónicas ahí).
- **Cero ruta alternativa desde `NON_CANONICAL` hacia contenido Premium.** Verificado en ambas DBs: temas cuyo `parent_id` **ES** una unidad canónica premium y que además clasifican `NON_CANONICAL` = **0**. Todos los descendants `NON_CANONICAL` (12, en `axioma_gates_dev`) tienen materia padre `RETIRED` (invisible a `GET /education/subjects`). Toda raíz `NON_CANONICAL` es standalone (`parent_id IS NULL`, `root_id = id`), sin ruta a ninguna unidad. En `axioma_dev` los `NON_CANONICAL` con contenido son 9, todos roots: las 4 raíces legacy documentadas (`C1.BIOLOGIA.CELULA`, `H1.CHILE.SIGLO20.ISI`, `L1.LECTURA.INFERENCIA`, `M1.NUMEROS.PORCENTAJES`) + los 5 roots del contenedor técnico `ensayos` (preguntas de ensayo, gateadas aparte por C1.2). El árbol de 2 niveles + `parent_id` único + `curriculum_topic_id` único por versión garantizan que cada tema clasifica exactamente una vez.
- **Invariantes P1/P2/P3 de `verify:premium-content-access-gate` pasaron correctamente** — son reglas estructurales (`idx < 2`, partición 3-vías exhaustiva y disjunta de todo tema con contenido publicado, `NON_CANONICAL` siempre resuelve a raíz real) que se cumplen con o sin la contaminación de `axioma_gates_dev`.
- **Decisión congelada:** NO filtrar los invariantes futuros por prefijos de nombre de materia-fixture solo para limpiar los conteos. Los invariantes son estructurales y deben permanecer así.

### 18. Deuda no bloqueante de ordenación

`curriculum_topic` **no tiene constraint de unicidad en `order` por materia** (solo `code` es único). Hoy las 17 unidades canónicas reales tienen `order` distinto dentro de cada materia, por lo que la frontera "primeras 2 free" es **determinista**. Si un import futuro creara dos unidades canónicas con `order` igual en la misma materia, la frontera dependería del desempate de Postgres (inestable). `unidades.tsx` (mobile) ya numera por esta misma ordenación.

**No se cambia en Capa 1** — ni migración, ni constraint, ni ordenación con desempate. Candidato a follow-up separado (evaluar `@@unique([subjectId, order])` para roots o `ORDER BY "order", "code"`).

---

## D. Superficies — estado final

| Superficie | FREE | PREMIUM | Enforcement | Gate |
|---|---|---|---|---|
| `GET /me/entitlement` | `{ tier: 'FREE' }` | `{ tier: 'PREMIUM' }` | AuthGuard | `verify:entitlement-foundation-gate` |
| Tutor IA — cuota/turnos | 3/día, 6/conv | 50/día, 15/conv | server (ya existía; adaptador) | `verify:ai-quota-gate` |
| `GET /education/subjects` · `/subjects/:id/topics` | ✅ | ✅ | — | `verify:premium-content-access-gate` |
| `topics/:id/{children,resource,questions}` — unidad free (idx < 2) | ✅ | ✅ | — | idem |
| `topics/:id/{children,resource,questions}` — unidad premium (idx ≥ 2) | 🔒 `403` | ✅ | server + `PremiumContentPolicy` | idem |
| `topics/:id/*` — `NON_CANONICAL` / `UNKNOWN_TOPIC` | ✅ / `404` | ✅ / `404` | — (sin lookup de tier) | idem |
| Práctica libre (`practice-questions/*`) | ✅ | ✅ | — | `verify:free-practice-api-gate` |
| `GET /exams` · `GET /exams/:id` | ✅ visible | ✅ | — | `verify:premium-exams-gate` |
| `POST /exams/:id/attempts` — crear nuevo | 🔒 `403` | ✅ | server (post-commit) | idem |
| `POST /exams/:id/attempts` — reanudar ACTIVE vigente | ✅ | ✅ | — | idem |
| `GET /progress/{me/summary,topics,topics/:id}` | ✅ | ✅ | — | `verify:premium-progress-gate` |
| `POST /progress/topics/:id/responses` — replay / idempotencia de negocio | ✅ | ✅ | — | idem |
| `POST /progress/topics/:id/responses` — escritura nueva, unidad premium | 🔒 `403` | ✅ | server + `PremiumContentPolicy` | idem |
| Competir · Quick Question · Perfil · progreso previo | ✅ | ✅ (idéntico) | — (nunca Premium) | — |

---

## E. Arquitectura resultante

- **`apps/backend/src/entitlement/`** (nuevo módulo transversal) — `EntitlementService` (exportado), `EntitlementController` (`GET /me/entitlement`), `EntitlementInternalAdminController` (`POST /_internal/entitlement/set-tier-override`). Importa **solo** infraestructura (`AuthModule`, `ConfigModule`, `InternalOpsModule`) → ciclo de módulos imposible.
- **`apps/backend/src/education/premium-content-policy.service.ts`** (nuevo) — `PremiumContentPolicy`, estructural (sin noción de tier), exportado por `EducationModule`.
- **Consumidores de `EntitlementModule`:** `AiModule`, `EducationModule`, `ExamsModule`, `ProgressModule` (unidireccional). `EntitlementService` es singleton único, compartido.
- **`AiEntitlementService`** — adaptador delgado; el mapa `ENTITLEMENTS` (6/3, 15/50) intacto.
- **Contrato compartido** — `packages/contracts/src/premium.ts`: `FREE_UNITS_PER_SUBJECT`, `isFreeUnitPosition`, `premiumTierSchema`, `accountEntitlementResponseSchema.strict()`, `PREMIUM_REQUIRED_CODE`. Sin ningún símbolo de precio/moneda/store/`origin`.

---

## F. Gates — registro con resultado real

### Gates Premium nuevos (5)

| Gate | Tipo | Resultado | Cubre |
|---|---|---|---|
| `verify:premium-contract-gate` | tsx puro | **PASS** (33 checks) | predicado de posición + tabla de verdad (incl. `-1 → false`), code de error, schema `.strict()` solo `{ tier }`, enum de tier, ausencia de pricing/`origin` en el código de Capa 1 |
| `verify:entitlement-foundation-gate` | tsx puro | **PASS** (40 checks) | `EntitlementService` (default FREE, override in-memory por cuenta, aislamiento entre instancias), adaptador `AiEntitlementService` (FREE→{6,3} / PREMIUM→{15,50}, alias delega, sin mapa propio), controllers (`AuthGuard`, `request.accountId`, schema estricto, `InternalOpsGuard` + `rejectInProduction`), wiring |
| `verify:premium-exams-gate` | run-gate + DB | **PASS** (27 checks) | FREE+ACTIVE vigente→200 mismo attempt · FREE sin ACTIVE→403 · PREMIUM sin ACTIVE→crea · PREMIUM+ACTIVE expirado→marca EXPIRED+crea · FREE+ACTIVE expirado→marca EXPIRED, commit, luego 403 (DB confirma EXPIRED) · `GET /exams` 200 para FREE · scan estático: throw fuera de `$transaction` |
| `verify:premium-content-access-gate` | run-gate + DB | **PASS** | fixture determinista (4 unidades: 2 free + 2 premium) → matriz FREE/PREMIUM × {children,resource,questions} · NON_CANONICAL sin 403 · tema inexistente → 404 (nunca 403) · `subjects/:id/topics` + practice sin gate · invariantes de BD P1/P2/P3 contra el catálogo real |
| `verify:premium-progress-gate` | run-gate + DB | **PASS** (9 secciones) | matriz de escritura FREE/PREMIUM · lecturas siempre abiertas (nunca 403) · fila conservada tras downgrade (byte-a-byte) · replay idempotente tras downgrade (200, sin fila nueva) · re-upgrade reanuda · idempotencia de negocio tras downgrade (200 misma alternativa / 409 distinta, nunca 403, sin escritura) · scan estático del call-site |

### Regresiones ejecutadas

| Gate | Resultado | Nota |
|---|---|---|
| `verify:ai-quota-gate` | **PASS** | verde **sin editar** — la ruta PREMIUM vía override interno de IA sigue dando 15 turnos / 50 consultas (F3, F6). El alias `AiEntitlementService.setTestOnlyTierOverride` delega correctamente. |
| `verify:ai-status-gate` | **PASS** | verde sin editar |
| `verify:exam-foundation-gate` | **PASS** | **editado (guardrail 3)**: `newSession` marca la cuenta de prueba PREMIUM vía el override interno + limpieza en `finally` — necesario para ejercitar el ciclo completo de intento; el enforcement en sí lo cubre `verify:premium-exams-gate`. Sin reducción de cobertura. |
| `verify:education-gate` | **PASS** | **editado (guardrail 3)**: sesión de prueba → PREMIUM vía override + limpieza. Crea y lee contenido de unidades. |
| `verify:free-practice-api-gate` | **PASS** | **editado (guardrail 3)**: el `EducationService` falso gana los 2 nuevos colaboradores + aserción "práctica libre NUNCA consulta entitlement/policy". |
| `verify:progress-gate` | **PASS** | sin editar — su tema fixture (`M1.NUMEROS.PORCENTAJES`) clasifica `NON_CANONICAL` → sin gate |
| `verify:progress-topics-batch-gate` | **PASS** | sin editar — solo lecturas |
| `verify:academic-summary-gate` | **PASS** | sin editar — su fixture propio de 1 unidad clasifica `FREE_UNIT` |
| `verify:gamification-xp-grant-gate` | **PASS** | sin editar — `M1.NUMEROS.PORCENTAJES` → `NON_CANONICAL` |
| `verify:content-coverage-matrix-gate` | **PASS** (101 checks) | sin editar |
| `verify:premium-contract-gate` (regresión inter-incremento) | **PASS** | sin cambios entre C1.1–C1.4 |
| backend `typecheck` / `lint` / `build` (nest) | **PASS** | tras cada incremento |
| mobile `typecheck` | **PASS** | consume `@axioma/contracts` (cambio aditivo) |
| `git diff --check` | **PASS** | solo warnings CRLF preexistentes |

### `verify:gamification-integration-gate` — NO PASA — TEST-FIXTURE ARTIFACT / NON-BLOCKING

**Este gate NO debe registrarse como PASS.**

- **Fallo pre-existente**, no causado por C1.4. Reproducido revirtiendo temporalmente C1.4 (`git stash push` de `progress.service.ts` + `progress.module.ts` + `package.json`, `nest build`, re-corrida) → **mismo 7-failure cascade**, misma causa raíz.
- **Causa raíz:** en `axioma_gates_dev`, el tema `M1.NUMEROS.PORCENTAJES` acumuló **12 `question_version` publicadas** de corridas previas de gates, mientras la fixture del gate asume **2** (responde 2 preguntas y espera `topicStatus === 'COMPLETED'`). Con 12 preguntas el tema nunca completa → falla `topicStatus COMPLETED` y toda la cascada de eventos/`validated_gamification_activity` que depende de la transición a COMPLETED.
- **El camino Premium es correcto:** el `POST /progress/topics/:id/responses` sobre `M1.NUMEROS.PORCENTAJES` devuelve **`201`** (el tema clasifica `NON_CANONICAL` → `assertPremiumProgressWriteAllowed` retorna sin consultar el tier). **Sin `403`.**
- **Clasificación:** TEST-FIXTURE ARTIFACT de `axioma_gates_dev` (misma categoría que la reconciliación de datos de C1.3). **NON-BLOCKING** para el cierre de Capa 1. **No se toca** — el guardrail de "convertir a PREMIUM las sesiones de gates que fallen" aplica solo a fallos causados por sesión FREE; este no lo es.
- Follow-up sugerido (fuera de Capa 1): sanear `M1.NUMEROS.PORCENTAJES` en `axioma_gates_dev` o hacer que la fixture cuente las preguntas publicadas reales en vez de asumir 2.

### `verify:premium-exams-gate` — flake temporal

Una corrida encadenada (inmediatamente después de otros gates, misma ventana de rate-limit) falló las aserciones de la fase "FREE + ACTIVE expirado" — el ensayo corto dura 2 s y el gate hace `sleep(2600)`, un margen que se estrecha bajo carga del servidor. **Re-run limpio (espaciado): PASS completo.** Es una tensión de timing preexistente del propio gate, **no un defecto de producto** — C1.4 no toca `exams/`.

---

## G. NO declarado

Este cierre **NO** declara nada de lo siguiente:

- ❌ Premium V1 completo
- ❌ Mobile gating implementado
- ❌ Billing implementado
- ❌ Suscripciones listas
- ❌ Candidate APK ready
- ❌ Play Store ready / production ready
- ❌ Contenido V1 cerrado (ya estaba cerrado por su propio arco; no lo toca esto)

El `tier` real sigue siendo `FREE` para **toda cuenta productiva**. `PREMIUM` solo por override interno no productivo.

---

## H. Pendiente

### Layer 2 — Mobile gating

- `EntitlementProvider` (React Context) + `useEntitlement()` en `apps/mobile/app/_layout.tsx`.
- `PremiumPaywall` sobre el primitivo `Dialog` (no screen dedicada, no bottom sheet).
- `PremiumBadge` — wrapper `[lock] + Chip variant="warning"` sobre el token `color.state.warning`.
- Atenuación de cards Premium **sin aplicar `opacity` a toda la card**; copy **sin "sin límites"**.
- Estados de bloqueo deep-link-safe en 6 superficies; mapeo `403 + code === 'PREMIUM_REQUIRED'` → paywall, con el `origin` decidido por la superficie.
- Una **única constante temporal** de display de precio (`$6.990 CLP/mes`), a reemplazar por metadata real de Google Play en Capa 3.

### Layer 3 — Billing

- `AccountSubscription` / `SubscriptionSummary` (modelo Prisma + migración).
- Google Play Billing (Android) + verificación server-side de `purchaseToken` + RTDN/webhooks + restore purchase.
- `EntitlementService.getEntitlement` pasa a derivar el `tier` de `AccountSubscription.currentPeriodEnd > now` (§C.4).
- Pantalla "Gestionar suscripción" (management / cancellation UI) en Perfil.
- Precio real desde store metadata.
- Retirar el alias `@deprecated` `AiEntitlementService.setTestOnlyTierOverride` y `EntitlementInternalAdminController`.

---

## I. Convención de tags

Convención observada en el repo:
- **CON tag:** `block-N-*-complete`, `lef-block-N-*-complete`, `lef-phase-2-complete`, `phase-0-*`, `profile-closure-complete`, `zetrynd-v1-visual-review-complete` — hitos de **bloque / fase / pasada completa**.
- **SIN tag:** `COMPETIR-V1-CLOSURE-REPORT.md`, `COSMETICS-V1`, `DESAFIOS-V1`, `STUDY-V1-*` (4 reportes), `TUTOR-IA-V1`, `STUDY-CONTENT-MOBILE-REACHABILITY`, `TESTER-DISTRIBUTION-1C` — cierres de **sub-feature / sub-scope**.

Este cierre es de una **sub-capa de una sub-feature** (Layer 1 de Premium V1). Encaja inequívocamente en la categoría **sin tag**. **No se crea tag.** (Un tag `premium-v1-complete` correspondería únicamente al cierre de las 3 capas juntas, si el PO lo decide entonces.)

---

## J. FINAL VERDICT

**PREMIUM V1 — LAYER 1 / ENTITLEMENT BACKEND — CLOSED.**

Fuente de verdad de authorization (`EntitlementService`) + `GET /me/entitlement` + enforcement server-side `403 PREMIUM_REQUIRED` en los 4 dominios (IA ya existía; Ensayos, contenido de unidades, escritura de progreso) + 5 gates Premium nuevos + refactor de `AiEntitlementService` a adaptador (6/15 + 3/50 intactos). Progreso previo preservado, lecturas abiertas, replay/idempotencia resilientes al downgrade, ACTIVE exam attempts terminables.

Sin tag (sub-capa). Sin push. Pendiente: Layer 2 (mobile gating) y Layer 3 (Billing).
