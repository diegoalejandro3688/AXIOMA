# Block III Closure Report — Gamificación Avanzada

**Fecha de cierre**: 2026-08-05
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: III de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-III-DEFINITION.md`, `docs/adr/0019-reward-delivery-mechanism.md`, `docs/adr/0018-public-profile-foundation.md`, `docs/adr/BLOCK-II-CLOSURE-REPORT.md`
**Estado final**: **APPROVED**

## 1. Objetivo

Definido formalmente en `BLOCK-III-DEFINITION.md` (§2): dar al estudiante reconocimiento visible y duradero de su esfuerzo — logros desbloqueados, títulos, insignias y desafíos superados — sin que ninguna recompensa dependa de otro estudiante, de dinero real, ni de azar. Toda recompensa deriva de actividad académica ya validada por GAMIFICATION (Bloque I) o de participación en un desafío con reglas explícitas — nunca de una compra ni de un sorteo. Explícitamente fuera de alcance: competencia entre estudiantes (Bloque IV) y una vista consolidada de perfil (Bloque V).

## 2. Incrementos realizados

Cinco incrementos, cada uno con su propio gate en PASS, entregados por **entrega directa** (logro/nivel/desafío otorga el ítem) sobre un único mecanismo de entrega compartido:

| Incremento | Contenido | Commits |
|---|---|---|
| **1. Entrega de recompensas** | `reward_bundle`/`reward_bundle_item`/`reward_grant`/`reward_grant_component`, `RewardEvaluationWorker.deliverBundleComponents` — mecanismo genérico único reutilizado por logros, niveles, desafíos y cosméticos. Convención de clave de idempotencia por fuente (§4.4), política de snapshot (§4.5). | `37fbfcd`, `4866112` |
| **2. Logros** | `achievement_definition`/`version`/`progress`/`unlock`, evaluados sobre señales ya producidas por GAMIFICATION (XP, nivel, racha). Progreso/desbloqueo referencian siempre `achievement_version_id`. | `4e18b74`, `d8dec2b` |
| **3. Títulos** | `title_definition`/`account_title`/`equipped_title`, otorgados como recompensa, equipables sobre `public_profile` (Bloque II). Propiedad y equipamiento como capas separadas con invariante de sincronización explícita. | `a87a374`, `e9bd752` |
| **4. Desafíos** | `challenge_definition`/`account_challenge` (diario/semanal), tope diario transaccional, señal de racha vía contrato de dominio, reclamación explícita con protección de concurrencia (advisory lock), superficie móvil en el tab Competir. | `d476b63` (4.a), `8dacc71` (4.b), `83ae57b` (4.c), `bcbb107` (4.d) |
| **5. Cosméticos** | `cosmetic_item`/`inventory_item`/`equipped_cosmetic`, modelo de slots normalizado (`AVATAR`/`AVATAR_FRAME`/`PROFILE_BANNER`/`BADGE`), equipamiento atómico por slot, superficie móvil en Perfil. | `bcd5659` (5.a), `b186f6a` (5.b), `1ae25be` (5.c) |

**ADR propio**: únicamente el Incremento 1 + worker de evaluación requirió uno (**ADR-0019**, aprobado) — formaliza el esquema de entrega, la máquina de estados de `reward_grant`/`reward_grant_component`, y las garantías de aislamiento/reintento del worker. Los Incrementos 2–5 se apoyan íntegramente en ese mecanismo sin introducir una decisión arquitectónica nueva (confirmado incremento a incremento en `BLOCK-III-DEFINITION.md` §6) — mismo criterio que Progresión Visible en el Bloque II.

## 3. Decision Gates y estado

Los 78 Decision Gates de este bloque (`BLOCK-III-DEFINITION.md` §5, organizados por incremento y sub-incremento) están **todos en PASS**. Detalle completo — descripción de cada gate y qué verifica exactamente — en ese documento; no se duplica aquí. Resumen por área:

| Área | Gates | Estado |
|---|---|---|
| Entrega de recompensas + worker de evaluación (ADR-0019) | Ver ADR-0019 §Validación | PASS |
| Logros (fundación + progreso/desbloqueo) | Gates propios de 2.a/2.b | PASS |
| Títulos (fundación + equipamiento) | Gates propios de 3.a/3.b | PASS |
| Desafíos (fundación, progreso, reclamación, móvil) | Gates 21–58 (parcial), 37/38/41/43/44 | PASS |
| Cosméticos (fundación, equipamiento, móvil) | Gates 59–78 | PASS |
| Coordinación con `public_profile` | Gates 29–30 | PASS |
| Frontera de dominio del worker | Gates 26–28 | PASS |

Ningún gate quedó en "requiere corrección" al cierre.

## 4. Gate consolidado

`verify:block-iii-gate` (nuevo, `scripts/verify-block-iii-gate.mjs`) — orquestador, mismo criterio que `verify:block-ii-gate`: invoca el gate consolidado del Bloque II completo (que a su vez invoca Bloque I + M1) como un solo paso, y agrega los nueve gates propios de este bloque sin HTTP (en proceso, contra Prisma/pg directamente) más los tres gates HTTP (equipamiento de títulos, reclamación de desafíos, equipamiento de cosméticos), cada uno con su propia instancia de backend en un puerto nuevo — mismo motivo que todos los bloques anteriores (rate limiting de `/auth/session` por proceso).

```
Gate consolidado Bloque II (M1 + Bloque I + Progresión Visible + Public Profile)  PASS
Incremento 1 -- Entrega de recompensas: fundación                                 PASS
Incremento 1 -- Entrega de recompensas: worker de evaluación                      PASS
Incremento 1 -- Entrega de recompensas: XP_BONUS y convergencia                   PASS
Incremento 2 -- Logros: fundación                                                 PASS
Incremento 2 -- Logros: progreso y desbloqueo                                     PASS
Incremento 3 -- Títulos: fundación                                                PASS
Incremento 4 -- Desafíos: fundación                                               PASS
Incremento 4 -- Desafíos: progreso                                                PASS
Incremento 5 -- Cosméticos: fundación                                             PASS
Incremento 3 -- Títulos: equipamiento                                             PASS
Incremento 4 -- Desafíos: reclamación                                             PASS
Incremento 5 -- Cosméticos: equipamiento                                          PASS

Gate consolidado Bloque III: PASS
```

`verify:learning-experience-foundation-gate` actualizado para invocar `verify-block-iii-gate.mjs` en vez de `verify-block-ii-gate.mjs` — mismo criterio de alias fino ya usado en el Bloque II, actualizado ahora que este es el bloque más reciente cerrado.

Ejecución real registrada el 2026-08-05: `typecheck`/`lint`/`build` del repo completo, migraciones, seed, y los 12 pasos de arriba — cada gate HTTP contra una instancia de backend recién iniciada (nunca reutilizada entre gates), mismo criterio de aislamiento por proceso que todos los bloques anteriores.

## 5. Incidencias reales encontradas durante la validación (causa raíz y resolución)

Documentadas con transparencia, ninguna oculta. Las de Incrementos 4/5 ya están detalladas en `BLOCK-III-DEFINITION.md` (sección "Evidencia de validación" de cada sub-incremento); resumidas aquí para el cierre:

1. **`AccountChallengeRepository.createIdempotent` inseguro dentro de una transacción compartida (4.b)** — el patrón "crear y capturar P2002" usado en otros repositorios envenena una transacción de Postgres si el error ocurre a mitad de camino (`25P02` en consultas posteriores). Corregido cambiando a "verificar existencia antes de crear" — seguro porque el advisory lock ya serializa el acceso.
2. **Concurrencia real en el flujo de reclamación (4.c)** — el endpoint HTTP de `claim` no tenía el advisory lock por cuenta que ADR-0019 asume para el worker, permitiendo que dos reclamaciones concurrentes vieran ambas un componente `PENDING` y la segunda fallara con 500 al chocar contra el trigger de inmutabilidad. Corregido con un advisory lock nuevo (namespace 20, distinto del namespace 19 de ADR-0019), por `account_challenge.id`.
3. **`verify-challenge-progress-gate.ts` (4.b) dependía de la hora de ejecución, no del día calendario (encontrado al regresionar 5.b)** — `windowStart` se anclaba a `ahora − 1h` en vez de a la medianoche UTC de hoy, causando falsos negativos al correr el gate después del mediodía UTC. Corregido anclando al inicio del día calendario UTC.
4. **`UserService` con arity de constructor desactualizada en dos gates (encontrado al regresionar 5.b)** — al añadir `CosmeticEquipmentService` como cuarto parámetro requerido, `verify-title-equipment-gate.ts` y `verify-public-profile-gate.ts` seguían instanciándolo con 3 argumentos — invisible a `tsc` porque `scripts/` no está en el `include` de `tsconfig.json` del backend. Corregido en ambos.
5. **Frontera de dominio violada antes de gatear (5.b)** — se inyectó inicialmente `InventoryItemRepository` directamente en `UserService` para listar cosméticos poseídos, violando la regla ya establecida de nunca inyectar un repositorio ajeno a través de una frontera de dominio. Detectado y corregido antes de gatear: la lógica se movió a `CosmeticEquipmentService.getOwnedByAccountId`.
6. **Botón "Comenzar" de Onboarding con color hardcodeado (encontrado en la verificación visual real en Android)** — `apps/mobile/app/onboarding.tsx` quedó fuera del alcance de la migración a tokens de ADR-0015 desde su origen (M1); su botón usaba `backgroundColor: '#111'`/`color: '#fff'` fijos, indistinguibles de "tema oscuro" sin importar el esquema real activo. Corregido usando `t.color.accent.default`/`t.color.text.onAccent` — mismo par ya validado en el resto de la app — limitado a ese único botón, sin tocar el sistema global de theming ni otros componentes con el mismo patrón heredado (ej. `perfil.tsx`, no reportado).
7. **Contención de rate-limiting al encadenar gates HTTP consecutivos contra el mismo proceso** — mismo patrón ya conocido desde M1/Bloque I/Bloque II (`ThrottlerModule`, 100 req/60s por proceso). Confirmado de nuevo como saturación de throttling, no regresión; resuelto reiniciando el backend entre gates (automatizado ahora en `verify-block-iii-gate.mjs`, una instancia de backend por gate HTTP).

Ningún incidente de Incrementos 1–3 (Entrega de recompensas, Logros, Títulos) se registró en esta sesión — sus gates corrieron limpios en la ejecución consolidada final; el detalle de su propia validación original vive en ADR-0019 y en los commits `37fbfcd`–`e9bd752`.

## 6. Notas de diseño corregidas durante la implementación

Documentadas en el propio `BLOCK-III-DEFINITION.md` §4, no se duplican aquí en detalle:

- **§4.10**: modelo de equipamiento normalizado en slots (`equipped_title`/`equipped_cosmetic`), no columnas sueltas en `public_profile` — decisión tomada tras analizar probabilidad real de expansión de slots.
- **§4.12–4.14**: tope diario transaccional real (no cualitativo), señal de racha vía contrato de dominio explícito (nunca `currentStreak >= N` de presentación), asignación automática con materialización perezosa de `account_challenge`.
- **§4.15**: unificación de `CosmeticSlot`/`item_type` (títulos fuera del enum, insignias como `COSMETIC` tipo `BADGE`), `STREAK_PROTECTION` diferido explícitamente.
- **§4.20**: contradicción real de dependencia circular de módulos (NestJS) resuelta separando la ruta HTTP del módulo que declara el controller — sin precedente nuevo, mismo patrón que `PublicProfileController`.

## 7. Artefactos temporales

Búsqueda de `TODO`/`FIXME`/`XXX`/`debugger` sobre los archivos nuevos o modificados de este bloque (backend `gamification`/`user`, mobile `competir.tsx`/`perfil.tsx`/`onboarding.tsx`/`lib/challenges`/`lib/cosmetics`): **cero resultados**. `console.log` presente únicamente dentro de `scripts/verify-*-gate.ts`/`.mjs` (mecanismo de reporte por diseño de todo gate del repositorio) — ninguna ocurrencia en código de aplicación fuera de ese mecanismo. Sin migraciones huérfanas: las seis migraciones nuevas de este bloque (`reward_*`, `achievement_*`, `title_*`, `challenge_*`, `cosmetic_foundation`, `cosmetic_equipment`) corresponden a modelos reales del producto. Datos de verificación manual (cuentas, `cosmetic_item`/`inventory_item`/`public_profile` de prueba insertados directamente en Postgres durante la verificación real de 5.c y de este fix de Onboarding) fueron eliminados de la base de datos de desarrollo al finalizar cada verificación — sin residuos.

## 8. Evidencia de validación

```
typecheck (repo completo)                    PASS
lint (repo completo)                         PASS
build (contracts + backend)                  PASS
verify:block-ii-gate (M1 + Bloque I + II)     PASS
verify:reward-foundation-gate                 PASS
verify:reward-evaluation-worker-gate          PASS
verify:reward-delivery-xp-bonus-gate          PASS
verify:achievement-foundation-gate            PASS
verify:achievement-progress-unlock-gate       PASS
verify:title-foundation-gate                  PASS
verify:challenge-foundation-gate              PASS
verify:challenge-progress-gate                PASS
verify:cosmetic-foundation-gate               PASS
verify:title-equipment-gate                   PASS
verify:challenge-claim-gate                   PASS
verify:cosmetic-equipment-gate                PASS
verify:block-iii-gate (consolidado, nuevo)    PASS
verify:learning-experience-foundation-gate    PASS (alias actualizado a Bloque III)

Mobile:
tsc --noEmit (apps/mobile)                    PASS
eslint (apps/mobile)                          PASS
verify:challenges-gate                        PASS
verify:cosmetics-gate                         PASS
verify:offline-outbox-gate                    PASS (regresión, sin relación directa con este bloque)

Verificación visual real (no solo gates automatizados):
expo start --web + backend real, Desafíos y Cosméticos, flujo completo end-to-end contra Postgres real  PASS
Verificación visual real en Android (Expo Go), Desafíos y Cosméticos, tema claro/oscuro                  PASS (Product Owner, 2026-08-05)
```

Cada gate HTTP se corrió contra una instancia de backend recién iniciada (nunca reutilizada entre gates). No se considera suficiente la existencia del código fuente como demostración de cumplimiento — toda afirmación de este reporte está respaldada por una ejecución real registrada arriba, incluida la ejecución completa de `verify:block-iii-gate` el 2026-08-05 con resultado `PASS` en sus 12 pasos.

## 9. Lecciones aprendidas

- **Un único mecanismo de entrega genérico (ADR-0019), reutilizado sin caminos paralelos, escaló limpio a cuatro fuentes distintas** (nivel, logro, desafío, cosmético) sin que ningún incremento posterior necesitara su propio ADR — la inversión de diseño en el Incremento 1 pagó dividendos en los cuatro siguientes.
- **Los advisory locks de una función NO cubren automáticamente a otra que toca las mismas filas** — el lock de ADR-0019 (namespace 19, por cuenta, dentro del worker) no protegía el endpoint HTTP de reclamación (4.c), que tocaba los mismos `reward_grant_component`. Cada camino de escritura concurrente necesita su propio análisis de bloqueo, no se hereda implícitamente de otro camino que toca la misma tabla.
- **Un patrón de repositorio seguro "standalone" puede ser inseguro dentro de una transacción compartida** (`createIdempotent` de 4.b) — "crear y capturar el error de duplicado" funciona aislado, pero envenena una transacción Postgres si el error ocurre a mitad de camino; "verificar antes de crear" es el patrón correcto bajo un lock que ya serializa el acceso.
- **`scripts/` fuera del `include` de `tsconfig.json` es un punto ciego real, no teórico** — dos gates con una arity de constructor desactualizada pasaron inadvertidos hasta que se ejecutaron, porque `tsc --noEmit` nunca los tipó. Vale la pena considerar incluir `scripts/` en el chequeo de tipos de un futuro bloque, aunque eso queda fuera del alcance de este cierre.
- **La verificación visual real en un dispositivo encuentra defectos que ningún gate automatizado puede** — el botón de Onboarding llevaba el mismo color hardcodeado desde M1 (cuatro bloques atrás) sin que ningún gate de tipos, lint, o lógica pura lo detectara, porque técnicamente compilaba y funcionaba: el defecto era puramente visual/perceptual, exactamente la categoría de bug que solo aparece al mirar la pantalla real.
- **Una decisión de diseño deliberada (`accent.default` fijo entre temas, documentada) y un defecto real (`#111` hardcodeado, no documentado como intencional) pueden producir síntomas superficialmente parecidos** — ambos "no cambian entre temas" — pero solo uno es un bug. La distinción no está en el síntoma sino en si el código consulta el sistema de tokens y ese token fue diseñado para ser invariante, o si simplemente nunca fue migrado.

## 10. Estado final

**APPROVED.** Bloque III — Gamificación Avanzada queda implementado, validado y cerrado. El estudiante puede ganar y ver logros, títulos, insignias y desafíos superados, equiparlos sobre su identidad pública, y reclamar recompensas de desafíos completados — todo por entrega directa, sin economía comprable, sin azar, sin depender de otro estudiante. Los cinco incrementos (Entrega de recompensas, Logros, Títulos, Desafíos, Cosméticos) están completos con su superficie backend y móvil, gateados individualmente y en conjunto (`verify:block-iii-gate`), y verificados visualmente en un dispositivo Android real en ambos temas. Ningún componente de bloques posteriores (rankings, competencia entre estudiantes, Perfil Avanzado consolidado) fue anticipado.

Siguiente paso del roadmap: **Bloque IV — Competir**, a definir formalmente cuando el Product Owner lo autorice.

---

**Bloque III — Gamificación Avanzada: implementado, validado y cerrado (2026-08-05).**
