# Block II Closure Report — Progresión Visible y Public Profile Foundation

**Fecha de cierre**: 2026-08-03
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: II de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-II-DEFINITION.md`, `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/BLOCK-I-CLOSURE-REPORT.md`
**Estado final**: **APPROVED**

## 1. Objetivo

Definido formalmente en `BLOCK-II-DEFINITION.md` (§2): permitir que el estudiante vea, por primera vez, el efecto motivacional de su actividad académica validada — nivel, racha e historial de XP — sin alterar la evaluación académica real, y dejar preparada la identidad pública mínima (`public_profile`) de la que dependerán el Bloque III (Gamificación Avanzada) y el Bloque IV (Competir), sin exponer todavía ninguna información a otros estudiantes. Explícitamente fuera de alcance: rankings, historial competitivo, títulos/insignias equipados, cosméticos, estadísticas públicas y cualquier vista de Perfil Avanzado.

## 2. Incrementos realizados

Dos incrementos, cada uno con su propio gate en PASS:

| Incremento | Contenido | ADR |
|---|---|---|
| **Progresión visible** | `LevelDefinition` (escalera de niveles, sembrada), niveles/racha/historial de XP expuestos vía `GET /gamification/me/level`, `/streak`, `/xp-history` (paginado). Racha e historial **derivados en tiempo de lectura** desde `xp_ledger_entry` — sin `account_streak`/`streak_day` persistidos (ver §6, decisión tomada durante la implementación). | Ninguno propio — no introduce dominio nuevo ni decisión arquitectónica (Master Context §11.9); construye sobre ADR-0016 ya aprobado. |
| **Public Profile Foundation** | `PublicProfile`/`ProfileUsernameHistory`, creación perezosa e idempotente (`ensurePublicProfile`), política de username (forma canónica única, nombres reservados, frecuencia y ventana de reserva reales), estados independientes `visibilityStatus`/`lifecycleStatus`, coordinación con `PrivacyService` (retiro inmediato al solicitar cierre, anonimización al completarse, reactivación al recuperar). | **ADR-0018**, aprobado con precisiones del Product Owner e implementado. |

Prerrequisito resuelto **antes** de iniciar la implementación, no durante: la auditoría de dependencias del roadmap (previa a este bloque) encontró que `leaderboard_entry` (Bloque IV) y `equipped_title`/`equipped_cosmetic` (Bloque III) dependen de `public_profile`, que el orden original no construía hasta el Bloque V. Se resolvió extrayendo Public Profile Foundation como incremento propio de este bloque (ver `BLOCK-II-DEFINITION.md` §4) — a diferencia del Bloque I, aquí el prerrequisito se detectó y resolvió **antes** de escribir código, no a mitad de camino.

## 3. Decision Gates y estado

### Incremento 1 — Progresión visible

| # | Gate | Estado | Evidencia |
|---|---|---|---|
| 1 | Consistencia nivel/XP | PASS | `verify-gamification-progression-gate.ts` §1 — nivel/XP-dentro-de-nivel/próximo-nivel/`progressRatio` verificados contra un caso calculado a mano (240 XP → nivel 2, 140/150) |
| 2 | No-autoridad académica | PASS | §2 del mismo gate — verificación estática: ningún archivo del incremento referencia entidades académicas de PROGRESS |
| 3 | Racha no punitiva | PASS | §3/§3b — perder una racha no altera `xp_balance.lifetimeXp` ni ninguna otra tabla (por construcción: el cálculo es una lectura pura, no escribe nada) |
| 4 | Idempotencia de lectura de racha | PASS | §3 — dos lecturas consecutivas devuelven exactamente el mismo resultado |
| 5 | Frontera de día calendario | PASS (con corrección de diseño, ver §6.2) | §5 — dos otorgamientos el mismo día UTC cuentan como un solo día; verificado con instantes exactamente en el borde de medianoche UTC |
| 6 | Reconstructibilidad del historial | PASS | §6 — historial paginado (cursor por `recordedAt`) cubre exactamente las filas reales del ledger, sin huecos ni duplicados, suma de XP coincidente |

### Incremento 2 — Public Profile Foundation (ADR-0018)

| # | Gate | Estado | Evidencia |
|---|---|---|---|
| 1 | Unicidad de username bajo concurrencia | PASS | `verify-public-profile-gate.ts` §1c |
| 2 | Ningún campo prohibido alcanzable | PASS | §2 — claves de la respuesta comparadas exactamente contra la lista blanca de Data Model §6.5 |
| 3 | Creación idempotente, nace PRIVATE/ACTIVE | PASS | §1 |
| 4 | Reversibilidad de visibilidad en ambas direcciones | PASS | §3 |
| 5 | Frecuencia, ventana de reserva y nombres reservados | PASS (con corrección de diseño, ver §6.1) | §4 |
| 6 | Retiro/anonimización coordinados, sin acceso directo desde PRIVACY | PASS | §5, §5c, §6 (verificación estática) |
| 7 | Ocultar visibilidad no toca lifecycle ni GAMIFICATION | PASS | §3b |
| 8 | Reactivación restaura ACTIVE/PRIVATE, nunca VISIBLE | PASS | §5b |

Ningún gate quedó en `requiere corrección` al cierre. Los dos "PASS (con corrección de diseño)" están documentados en detalle en §6 (Incidencias) — ninguno fue un defecto oculto: ambos se corrigieron durante la propia validación de este bloque, antes de declarar PASS.

## 4. Gate consolidado

`verify:block-ii-gate` (nuevo, `scripts/verify-block-ii-gate.mjs`) — orquestador, mismo criterio que `verify:block-i-gate`: invoca el gate consolidado del Bloque I completo (que a su vez invoca el de M1) como un solo paso, y agrega los dos gates propios de este bloque, cada uno con su propia instancia de backend.

```
Gate consolidado Bloque I (M1 + GAMIFICATION schema/integración/otorgamiento)  PASS
GAMIFICATION Progresión Visible                                               PASS
USER Public Profile Foundation                                                PASS

Gate consolidado Bloque II: PASS
```

`verify:learning-experience-foundation-gate` (nuevo) — hoy equivalente al gate consolidado del Bloque II (es el bloque más reciente de la fase); documentado explícitamente como un alias que deberá extenderse cuando se cierren más bloques, no una duplicación permanente.

## 5. Incidencias reales encontradas durante la validación (causa raíz y resolución)

Documentadas con transparencia, ninguna oculta:

1. **Falso positivo en la verificación estática de frontera de dominio (Gate 2, Incremento 1)** — los propios comentarios de `progression.service.ts`/`streak-calculator.ts` mencionaban literalmente los símbolos prohibidos (`StudentResponse`, `CurriculumTopicProgress`) al *explicar* la regla que los prohíbe. Causa raíz: el chequeo busca el texto del símbolo en todo el archivo, sin distinguir código de comentario — igual que el chequeo equivalente del Bloque I. Resuelto reformulando los comentarios sin nombrar los símbolos literalmente; el chequeo en sí no se relajó.
2. **Selección de versión de programa XP no determinista al usar fechas retroactivas (Incremento 1)** — `XpGrantService.grantForActivity` resuelve la versión del programa "más reciente cuyo `effectiveFrom` sea `<= at`" entre *todas* las versiones históricas de `xp-core` (compartido entre gates). Al crear actividades de prueba con `occurredAt` de varios días atrás (necesario para probar rachas), una versión con `effectiveFrom` más reciente pero sin la regla del gate podía ganar esa selección, dejando la actividad sin regla activa (`NO_ACTIVE_RULE`) aunque la regla correcta sí existiera en otra versión. No es un defecto de `XpGrantService` — es el comportamiento correcto y ya validado del Bloque I. Resuelto registrando la misma regla del gate en dos versiones (una con `effectiveFrom` reciente, otra antigua), cubriendo ambos casos sin depender de cuál gane la selección.
3. **Longitud de username excedida en fixtures de prueba (Incremento 2)** — los primeros fixtures del gate usaban `Date.now()` completo (13 dígitos) como sufijo de unicidad, superando el límite de 20 caracteres del propio username (ADR-0018 §2) y provocando `400 VALIDATION_ERROR` en creaciones que debían ser válidas. Corregido usando un sufijo corto (últimos 6 dígitos) en los fixtures del gate — no afecta la política de longitud del producto, que es la correcta y se mantuvo sin cambios.
4. **Sesión HTTP revocada al solicitar el cierre de cuenta rompía dos verificaciones del gate (Incremento 2)** — el gate intentaba probar el bloqueo de `lifecycleStatus != ACTIVE` llamando a los endpoints HTTP con la sesión de la cuenta que acababa de solicitar su propio cierre. `AuthService.requestAccountDeletion` revoca *todas* las sesiones de la cuenta de inmediato (comportamiento correcto, ya validado por ADR-0005) — la llamada nunca llegaba a la lógica de `public_profile`, fallaba antes con 401. No es un defecto: es el guard de seguridad correcto actuando primero. Resuelto probando esa verificación puntual instanciando `UserService` directamente en el gate (mismo patrón que otros gates usan para probar invariantes internos sin pasar por HTTP), en vez de forzar una sesión que el propio diseño de seguridad ya invalidó correctamente.
5. **Ventana de reserva de username documentada como deuda diferida, mejor implementarla de verdad** — no fue un defecto sino una decisión de diseño revisada durante la propia validación: al escribir el caso de prueba del Decision Gate 5 quedó claro que el mecanismo real (consultar `profile_username_history`) era más simple de construir que de fingir como pendiente. Se implementó (`PublicProfileRepository.findRecentRelease` + `UserService.isWithinReservationWindow`) en vez de dejarla diferida; ADR-0018 y `BLOCK-II-DEFINITION.md` quedaron actualizados para reflejar el mecanismo real, no el originalmente supuesto.
6. **Contención de rate-limiting al encadenar varios gates contra el mismo proceso de backend** — mismo patrón ya conocido desde M1/Bloque I (`ThrottlerModule`, límite por proceso): correr `progression-gate`, `public-profile-gate` y `privacy-gate` seguidos contra un único servidor produjo fallos en cascada (`429`, `accountId: undefined`) que no eran regresiones reales. Resuelto reiniciando el backend entre gates — exactamente el patrón ya documentado en `Architecture Review 1.0` que este cierre reafirma, no descubre.

## 6. Notas de diseño corregidas durante la implementación

### 6.1 Ventana de reserva de username — de "deuda diferida" a implementada

La versión inicial de ADR-0018 asumía que la liberación de un username tras 30 días requeriría un job de limpieza fuera de alcance. Resultó innecesario: `ProfileUsernameHistory` ya registra cada reemplazo (`previousUsernameNormalized`), así que basta con consultar "¿hay un reemplazo de este username en los últimos 30 días?" en el momento de reclamar/cambiar uno — sin job, sin estado adicional. Implementado y verificado (Decision Gate 5).

### 6.2 Racha y nivel: sin tablas nuevas de Data Model §16.12–16.14

`BLOCK-II-DEFINITION.md` (escrito antes de implementar) asumía construir `account_streak`/`streak_day`/`streak_definition` y `account_level_history`. La implementación real deriva ambos en tiempo de lectura desde `xp_ledger_entry`/`xp_balance` — cero proyecciones nuevas que reconciliar. Ver nota histórica §11 de `BLOCK-II-DEFINITION.md` para el detalle completo y su justificación.

## 7. Artefactos temporales

Búsqueda de `TODO`/`FIXME`/`XXX`/`debugger` sobre todos los archivos nuevos o modificados de este bloque: **cero resultados**. Búsqueda de `console.log`: presente únicamente dentro de `scripts/verify-*-gate.ts`/`.mjs` (el mecanismo de reporte por diseño de todo gate del repositorio, vía el helper `check()`/`logStep()` — mismo patrón que `verify-gamification-xp-grant-gate.ts` y el resto de gates preexistentes) y una línea de resumen final en `prisma/seed.ts` (mismo patrón ya usado por ese script antes de este bloque). Ninguna ocurrencia en código de aplicación (`src/`) fuera de esos mecanismos de reporte — sin instrumentación de depuración accidental pendiente de retirar. Sin migraciones de prueba huérfanas: las dos migraciones nuevas (`gamification_level_definition`, `public_profile_foundation`) corresponden a modelos reales del producto, no a fixtures.

## 8. Evidencia de validación

```
typecheck (repo completo)                    PASS
lint (repo completo)                         PASS
build (contracts + backend)                  PASS
verify:block-i-gate (M1 + Bloque I)           PASS
verify:gamification-progression-gate          PASS
verify:public-profile-gate                    PASS
verify:block-ii-gate (consolidado)            PASS
verify:learning-experience-foundation-gate    PASS
```

Cada gate HTTP se corrió contra una instancia de backend recién iniciada (nunca reutilizada entre gates), mismo criterio de aislamiento por proceso que M1 y el Bloque I. No se considera suficiente la existencia del código fuente como demostración de cumplimiento — toda afirmación de este reporte está respaldada por una ejecución real registrada arriba.

## 9. Lecciones aprendidas

- **Auditar dependencias del roadmap ANTES de implementar, no durante, sigue pagando dividendos.** El prerrequisito de `public_profile` (que en el Bloque I costó detener la implementación a mitad de camino por el Outbox, ADR-0017) esta vez se encontró y resolvió en la fase de definición, sin ninguna pausa de implementación. El costo de auditar primero es real, pero menor que el de descubrir un prerrequisito con código ya escrito.
- **"Deuda diferida" debería ser una conclusión de último recurso, no la primera.** La ventana de reserva de username se documentó como diferida por instinto de alcance mínimo, pero al llegar al caso de prueba real resultó más barata de construir que de justificar como pendiente. Vale la pena escribir el Decision Gate ANTES de decidir diferir algo — a veces revela que la deuda no era necesaria.
- **Derivar en vez de persistir sigue siendo la opción más simple cuando es viable.** Igual que el Bloque I omitió `currentLevelXp`/`seasonXp`, este bloque omitió tablas enteras de racha/historial de nivel apoyándose en que ya existía una fuente de verdad (`xp_ledger_entry`) capaz de responder la pregunta sin nuevo estado. Cada vez que esto es posible, elimina una categoría entera de Decision Gates (reconstructibilidad de una proyección que nunca se materializó).
- **Los guards de seguridad ya validados a veces bloquean el propio arnés de pruebas antes que la lógica de negocio bajo prueba** — no es una señal de alarma, es una señal de que el guard funciona; hay que diseñar el gate para probar la invariante correcta (a nivel de servicio) en vez de forzar un camino HTTP que el propio diseño ya invalida correctamente.
- **Compartir un proceso de backend entre gates sigue siendo una fuente de falsos negativos** — ya documentado desde M1, reafirmado aquí. El gate consolidado nuevo (`verify:block-ii-gate`) automatiza el aislamiento por proceso precisamente para que nadie tenga que redescubrir esto manualmente otra vez.

## 10. Estado final

**APPROVED.** Bloque II — Progresión Visible y Public Profile Foundation queda implementado, validado y cerrado. El estudiante puede ver su nivel, racha e historial de XP de forma privada, y existe una primitiva de identidad pública lista (pero oculta por defecto) para que el Bloque III (Gamificación Avanzada) y el Bloque IV (Competir) la consuman sin volver a resolver su prerrequisito estructural. Ningún componente de bloques posteriores (equipamiento, cosméticos, rankings, historial competitivo, Perfil Avanzado) fue anticipado.

Siguiente paso del roadmap: **Bloque III — Gamificación Avanzada**, a definir formalmente cuando el Product Owner lo autorice.

---

**Bloque II — Progresión Visible y Public Profile Foundation: implementado, validado y cerrado (2026-08-03).**

## 11. Enmienda (2026-08-04) — fragilidad temporal del fixture de `verify:gamification-progression-gate` (Gate 5)

**No reabre el bloque, no cambia su estado final.** Documentada aquí porque el gate afectado pertenece a este cierre, no al Bloque III donde se descubrió.

Durante la regresión del sub-incremento 1.b del Bloque III, `verify:gamification-progression-gate` empezó a fallar de forma reproducible en su Decision Gate 5 ("frontera de día calendario UTC"). **Causa raíz, confirmada, no es un defecto de `progression.service.ts`, `streak-calculator.ts` ni `XpGrantService`** (los tres permanecen exactamente como se cerraron en este bloque, verificado con `git diff` antes y después del hallazgo):

El fixture de ese gate anclaba su escenario de prueba a la medianoche UTC **real** del día en que se ejecutaba, registrando la regla de XP en dos versiones de `xp-core` (una "reciente", `effectiveFrom = ahora − 1h`; una "antigua", `effectiveFrom = ahora − 60 días`). Mientras la sesión de trabajo avanzaba a lo largo del mismo día, "medianoche de hoy" quedaba cada vez más lejos de "ahora", entrando en una franja horaria que ninguna de las dos versiones cubría con margen — y que una versión residual de `verify-gamification-xp-grant-gate.ts` (mismo `programKey` `'xp-core'`, porque `XpGrantService.PROGRAM_KEY` está fijo y no admite aislamiento por gate) sí podía ocupar, sin tener la regla de este gate. Resultado: `NO_ACTIVE_RULE` para las actividades de la frontera, sin que ninguna lógica de producto hubiera cambiado.

**Corrección aplicada, exclusivamente en el fixture** (`scripts/verify-gamification-progression-gate.ts`, Gate 5): el escenario ahora usa un pivote fijo (`ahora − 10 días`) en vez de la medianoche real, cubierto sin ambigüedad por la versión "antigua" ya existente, fuera del alcance de cualquier contaminación de sesión. Como `currentStreak` exige por diseño que el último día activo sea hoy/ayer real (regla de `streak-calculator.ts`, no tocada), la aserción de ese caso pasó a observarse vía `longestStreak` — mismo mecanismo de agrupación por día UTC y de cruce de frontera bajo prueba, sin depender del reloj de pared. Ninguna aserción de los otros Decision Gates cambió.

**Evidencia de la corrección**: `verify:gamification-progression-gate` corrido dos veces seguidas en procesos de backend limpios e independientes tras el ajuste — PASS completo ambas veces. `verify:block-ii-gate` (Bloque I + M1 + este bloque) y `verify:learning-experience-foundation-gate` (alias de fase) también re-ejecutados completos tras el ajuste — PASS.

**Clasificación**: fragilidad temporal preexistente del fixture de este bloque, expuesta por el paso del tiempo dentro de una sesión de trabajo larga — no un defecto de producto, no una regresión introducida por el Bloque III.
