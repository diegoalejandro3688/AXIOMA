# Bloque IV — Definición Formal: Competir

**Fecha**: 2026-08-05
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: IV de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-III-CLOSURE-REPORT.md`, `docs/adr/BLOCK-III-DEFINITION.md`, `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0020-ranking-materializacion.md`, `docs/adr/0021-perfil-competitivo-cross-cuenta.md`, `docs/PHASE-2-KICKOFF-INVENTORY.md`
**Estado**: Definición revisada (4ª pasada, 2026-08-06). Incremento 1 ("Fundación de temporadas y ligas") **implementado y gateado** (§9). Incremento 2 ("Ranking") **implementado, gateado y CERRADO** (§10, ADR-0020 APPROVED) — checkpoint commiteado sin tag (`26c28f1`). La limitación ambiental de `findPendingGrant` (Bloque I) documentada al cierre de Incremento 2 (§10, nota final) fue diagnosticada y corregida en un commit independiente (`0b52122`, starvation real confirmada y resuelta) — ver también `449d654`/`15fcd30` (hallazgo relacionado de Bloque III, clasificado como rate limiting real, no defecto de producto). Incremento 3 ("Perfil competitivo de otro usuario") **implementado, gateado y CERRADO** (§11, ADR-0021 APPROVED) -- sub-incrementos 3.a/3.b/3.c completos, checkpoints commiteados sin tag (`4eb676b`, `f7909da`, `7decfaa`). Incremento 4 ("Pregunta rápida"): **auditoría documental completa (§12), decisiones confirmadas por el Product Owner (§12.8), diseño detallado y desglose incremental listos (§13)** -- entidades propias `quick_question_session`/`quick_question_attempt` (no el framework genérico del Data Model), 10 Decision Gates refinados, tres sub-incrementos propuestos (4.a fundación, 4.b motor de sesión, 4.c endpoints). Pendiente de confirmación final antes de comenzar 4.a. Pendiente: Incremento 5 (superficie móvil).

**Nota de nomenclatura**: este documento y su futuro cierre usan el prefijo `LEF-` (`LEF-BLOCK-IV-DEFINITION.md`, `LEF-BLOCK-IV-CLOSURE-REPORT.md`) porque `docs/adr/BLOCK-IV-CLOSURE-REPORT.md` y `BLOCK-V-CLOSURE-REPORT.md` **ya existen**, pertenecientes a un roadmap distinto y anterior (Fase 1 — Vertical Slice M1, "Bloque IV/V de V"). Los Bloques I–III de esta fase (Learning Experience Foundation) no colisionaban con esos nombres y no se renombran retroactivamente — decisión explícita del Product Owner (2026-08-05): prefijo nuevo hacia adelante, historia cerrada intacta.

---

## 1. Definición formal del bloque

Competir reúne progresión personal (Bloque III, ya cerrado), Pregunta rápida y competencia asincrónica — Master Context §4.10: *"Competir reúne progresión personal, desafíos y competencia asincrónica."* Este bloque cierra los dos componentes que Bloque III dejó explícitamente fuera: **Liga** (tabla de posiciones, temporadas simples, ascenso/descenso) y **Pregunta rápida** (experiencia individual asincrónica fuera del flujo de Estudio).

**Flujo aprobado, alcance V1** (Master Context §3.12):

```
actividad educativa validada (ya existente)  →  league_point_ledger_entry (nuevo, independiente de xp_ledger_entry)
                                              →  leaderboard_entry (proyección materializada, reconstruible)
```

La competencia de V1 es **asincrónica** — nunca depende de usuarios conectados simultáneamente (Data Model DM-OQ047: Versus en tiempo real queda aplazado, "solo con evidencia de escala o calidad").

El bloque se compone de **cinco incrementos** (propuestos en §8, pendientes de confirmación):

1. **Fundación de temporadas y ligas** — `game_season`/`league_definition`/`league_group`/`season_league_participation`/`league_point_ledger_entry`. Sin ranking, sin endpoints, sin móvil.
2. **Ranking** — `leaderboard_definition`/`leaderboard_entry`, materialización, desempate determinista.
3. **Perfil competitivo de otro usuario** — primer endpoint público de la app que expone datos de una cuenta distinta a la que hace la solicitud, con lista blanca estricta.
4. **Pregunta rápida** — selección individual/asincrónica de una pregunta ya existente en EDUCATION, fuera del flujo estructurado de Estudio.
5. **Superficie móvil** — reemplaza los tres shells "Próximamente" del tab Competir (Liga, ranking, Pregunta rápida).

## 2. Objetivo

Dar al estudiante una experiencia competitiva asincrónica y sin presión constante — una liga con posiciones, progreso de periodo y recompensas, y una forma rápida de poner a prueba su conocimiento — sin introducir emparejamiento en tiempo real, sin exponer información académica privada de ningún estudiante a otro, y sin que el ranking se convierta en el destino principal de la pantalla (Master Context §4.10: *"El ranking forma parte de Liga y no deberá convertirse en un destino principal independiente"*).

Este bloque **no** introduce Versus en tiempo real, temporadas/eventos complejos, clubes o equipos, ranking de amigos, ni un Perfil Avanzado consolidado (Bloque V) — solo la capacidad de competir de forma asincrónica y ver un ranking mínimo y seguro.

## 3. Alcance y exclusiones

**Dentro de alcance (V1, Master Context §3.12/§4.10)**:
- Liga con tabla de posiciones, posición del estudiante, progreso del periodo, reglas, zonas de ascenso/descenso, recompensas, tiempo restante, historial mínimo.
- Temporadas como **ciclos simples** necesarios para operar ligas — sin estructura compleja de eventos.
- Ranking asincrónico, con desempate determinista, transparente y estable durante cada temporada.
- Pregunta rápida — individual/asincrónica, sin búsqueda de oponente.
- Perfil competitivo de otro usuario — vista pública mínima desde la tabla de posiciones.
- Reglas iguales para Free y Premium (Master Context §3.12) — el estado Premium no se muestra públicamente salvo cosmético equipado voluntariamente (ya cubierto por Bloque III).
- Retorno educativo obligatorio tras cualquier experiencia competitiva (revisar error, practicar habilidad, pedir explicación, abrir contenido relacionado, iniciar sesión de Estudio).

**Explícitamente fuera de alcance de este bloque**:
- Versus / competencia en tiempo real (DM-OQ047, aplazado).
- Sistema de señales de integridad / anti-fraude (`gamification_integrity_signal`/`gamification_enforcement_action`, Data Model §16.39–16.40) — **diferido explícitamente**, decisión del Product Owner (2026-08-05): V1 de Liga/Ranking se apoya únicamente en las salvaguardas ya existentes (topes diarios de XP y de desafíos, ya construidos en Bloques I/III). Mismo criterio que `STREAK_PROTECTION` en Bloque III — deuda documentada, no construida.
- Clubes, equipos, ranking de amigos, eventos temporales (fuera del MVP según `appmap.txt`, coincide en espíritu).
- Perfil Avanzado consolidado (Bloque V) — el "perfil competitivo de otro usuario" de este bloque es una vista mínima acoplada al ranking, no una pantalla de perfil general.
- Tipos de pregunta avanzados o respuestas abiertas para Pregunta rápida (DM-OQ048, aplazado) — reutiliza el banco de preguntas ya existente en EDUCATION, sin ampliarlo.
- Notificaciones push/email sobre resultados de liga (fuera de alcance salvo que ya exista un mecanismo genérico reutilizable — a confirmar en el incremento correspondiente si aplica).

## 4. Contradicciones y vacíos documentales

### 4.1 Colisión de nombres de archivo — resuelta

Ver nota de nomenclatura al inicio de este documento. `LEF-` como prefijo hacia adelante; nada retroactivo.

### 4.2 "Juego" vs. "Competir" — ya resuelta, no se reabre

El PRD (§A.1) reafirma "Juego" como nombre canónico de navegación, contradiciendo a Master Context (línea 1871, retira "Juego" explícitamente) y al código ya construido (usa "Competir" en todas las rutas/tabs desde ADR-0009). Documentado en `PHASE-2-KICKOFF-INVENTORY.md` §0.2. **No se reabre aquí** — el código existente y Master Context ya ganaron en la práctica; este bloque continúa usando "Competir" en todo nombre nuevo (módulos, rutas, eventos), consistente con ADR-0009. La corrección del PRD queda como tarea documental aparte, no bloqueante.

### 4.3 Consolidación de `public_profile` visibility — ya resuelta en ADR-0018, confirmada aquí

Data Model §6.5 especificaba originalmente **tres** campos de visibilidad independientes en `public_profile`: `visibility_status` (disponibilidad general), `leaderboard_visibility` (participación visible en rankings) y `competition_visibility` (visibilidad durante funciones competitivas). ADR-0018 (Bloque II, ya cerrado) los consolidó deliberadamente en **uno solo** (`visibilityStatus`, enum `PRIVATE|VISIBLE`) más un eje de ciclo de vida separado (`lifecycleStatus`), y fijó explícitamente: *"Mientras `visibility_status = PRIVATE`: ... no puede ser referenciado por `leaderboard_entry`"* (ADR-0018 línea 53).

**Confirmado para este bloque**: no se introduce `leaderboard_visibility` ni `competition_visibility` como campos separados. Un único `visibilityStatus = VISIBLE` habilita tanto la aparición en `leaderboard_entry` como la visibilidad durante el flujo competitivo — no hay un estado intermedio "visible en ranking pero no en competencia" o viceversa. Si el Product Owner necesita esa granularidad más adelante, es un cambio de esquema explícito, no algo que este bloque deba anticipar.

### 4.4 Métrica de clasificación de liga — decisión del Product Owner (2026-08-05)

Data Model recomienda (DM-OQ, "aplazables después de V1" — pero la pregunta de la métrica en sí es de V1): *"Actividad educativa elegible con límites antiabuso; no dominio académico bruto"*. Dos caminos posibles: reutilizar `xp_ledger_entry` directamente, o construir `league_point_ledger_entry` como fuente de verdad independiente (más fiel a la entidad ya nombrada en Data Model §16.22, con su propio `idempotency_key`/`rule_version`).

**Decisión fijada, precisión del Product Owner (2026-08-05)**: `league_point_ledger_entry` es una **fuente de verdad independiente** de `xp_ledger_entry` — nunca una vista derivada ni un sustituto del XP. El XP sigue siendo la moneda **permanente** del progreso individual (niveles, logros, recompensas de Bloque III) — este bloque no lo toca, no lo consume, no lo reinicia. Los League Points representan la **economía competitiva**: pueden reiniciarse por temporada, balancearse de forma independiente, y soportar ascensos/descensos sin afectar en ningún grado el progreso académico histórico del estudiante.

Ambos ledgers pueden **originarse en los mismos hechos académicos** (los mismos eventos de actividad educativa validada que hoy disparan `XpGrantService`), pero cumplen responsabilidades distintas y **deben permanecer desacoplados**: cada uno con su propia regla de otorgamiento, su propio tope, su propia idempotencia, y su propio ciclo de vida (XP nunca expira; League Points se reinician al cerrar una temporada). Ningún camino de escritura debe tocar ambas tablas como si fueran una sola transacción de dominio compartido — son dos proyecciones independientes del mismo hecho, no una autoridad y su copia. El diseño exacto de qué evento dispara un otorgamiento de puntos de liga (mismo disparador que XP, con su propia regla de conversión) se fija en el Incremento 1, no aquí — evitando adivinar antes de diseñar contra el código vigente de `XpGrantService`.

### 4.5 Vacío real: política de asignación a grupo/tier al ingresar a una liga por primera vez

`league_group.assignment_policy_version` existe en Data Model (§16.21: *"La asignación deberá evitar manipulación y no deberá agrupar utilizando dificultades académicas privadas"*), pero ningún documento fija la regla inicial concreta (¿todos entran al tier más bajo? ¿se agrupa por nivel/XP ya alcanzado?). **Pendiente de decisión del Product Owner en el Incremento 1** — no se asume aquí.

### 4.6 Vacío real: primer endpoint público cross-cuenta de la aplicación

Hasta este bloque, todo endpoint de `public_profile`/GAMIFICATION opera exclusivamente sobre `request.accountId` ("me"). "Perfil competitivo de otro usuario" (Master Context §4.10) es la **primera** superficie que expone datos de una cuenta distinta a la que hace la solicitud. Esto no es una simple extensión de un endpoint existente — es un patrón nuevo (lista blanca de campos servida sin autenticación de identidad del sujeto, solo del solicitante) que se diseñará en detalle en el Incremento 3, con su propio Decision Gate de "ningún campo fuera de la lista blanca es alcanzable" (mismo criterio ya usado en `verify-public-profile-gate.ts` Gate 2, pero ahora cruzando cuentas).

## 5. Decision Gates

Se definirán en detalle al cerrar el diseño de cada incremento (mismo criterio que Bloque III: no se redactan gates finos antes de que el incremento tenga una propuesta de diseño confirmada). Gates ya fijos a nivel de bloque, por estar determinados en esta definición:

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Sin `leaderboard_visibility`/`competition_visibility` como campos nuevos | Verificación estática: el schema de `public_profile` no gana columnas nuevas de visibilidad — sigue usando únicamente `visibilityStatus` (§4.3). |
| 2 | `league_point_ledger_entry` es independiente, no una vista de `xp_ledger_entry` | Verificación estática + funcional: existe como tabla propia con su propio `idempotencyKey`; revertir/ajustar puntos de liga nunca escribe en `xp_ledger_entry` y viceversa. |
| 3 | Sin señales de integridad nuevas en V1 | Verificación estática: ningún archivo de este bloque referencia `gamification_integrity_signal`/`gamification_enforcement_action` (§4.3 exclusiones). |
| 4 | Perfil competitivo de otro usuario respeta la lista blanca | La respuesta del endpoint cross-cuenta expone únicamente: nombre visible, avatar, título equipado, nivel, logros públicos, posición competitiva — nunca datos personales, actividad detallada, ni información de contacto/suscripción (Master Context §4.10). |
| 5 | Perfil `PRIVATE`/`RETIRED` no aparece para otro usuario | Un `public_profile` con `visibilityStatus = PRIVATE` o `lifecycleStatus != ACTIVE` es inalcanzable desde el endpoint de perfil competitivo de otro usuario, con el mismo código de error ya usado (404, no 403 — mismo criterio que 3.b/5.b, nunca filtra existencia). |

## 6. ADR

**Requiere ADR nuevo** — a diferencia de Incrementos 2–5 de Bloque III (que se apoyaron en ADR-0019 sin decisión arquitectónica nueva), este bloque introduce al menos dos elementos que sí lo son:

1. **Proyección materializada con recálculo periódico** (`leaderboard_entry`) — patrón nuevo, distinto de "derivar en tiempo de lectura" (racha/nivel, Bloque II) y distinto de "entrega directa e inmutable" (recompensas, Bloque III). Necesita su propia decisión de: qué dispara el recálculo (worker programado vs. bajo demanda), qué garantías de consistencia ofrece entre `calculated_at`/`snapshot_version`, y cómo se reconstruye desde los ledgers si hace falta.
2. **Primer endpoint público cross-cuenta** (§4.6) — necesita su propia decisión de autorización/lista blanca, distinta de todo lo construido hasta ahora (siempre "me").

El ADR se redactará al confirmar el diseño del Incremento 1 (temporadas/ligas) y el Incremento 2 (ranking), antes de tocar el esquema — mismo criterio que ADR-0019 se redactó junto con el Incremento 1 de Bloque III.

## 7. Pendientes

Evidencia de validación, gates finos por incremento, y confirmación de ADR: se añaden a medida que cada incremento se diseña e implementa — no se fabrican aquí antes de tener código real que validar.

## 8. Sub-incrementos propuestos (pendiente de confirmación del Product Owner)

| # | Sub-incremento | Contenido | Depende de |
|---|---|---|---|
| **1** | Fundación de temporadas y ligas | `game_season`, `league_definition`, `league_group`, `season_league_participation`, `league_point_ledger_entry`. Mecanismo de otorgamiento de puntos de liga (independiente de XP, §4.4). Política de asignación inicial a grupo (§4.5). Sin ranking, sin endpoints, sin móvil. | Bloque I (XP/eventos), Bloque III cerrado |
| **2** | Ranking | `leaderboard_definition`, `leaderboard_entry`, materialización/recálculo, desempate determinista. Requiere ADR (§6). | Incremento 1 |
| **3** | Perfil competitivo de otro usuario | Endpoint público cross-cuenta con lista blanca estricta (§4.6). Requiere ADR (§6). | Bloque II (`public_profile`), Bloque III (títulos/cosméticos equipados) |
| **4** | Pregunta rápida | Selección individual/asincrónica de una pregunta ya existente en EDUCATION, flujo de resultado + XP + continuación, fuera de la estructura de Estudio. | Bloque I (EDUCATION/PROGRESS ya existentes) |
| **5** | Superficie móvil | Reemplaza los tres shells "Próximamente" en `competir.tsx` (Liga, ranking, Pregunta rápida) con las capacidades reales de 1–4. | Incrementos 1–4 |

**Confirmado por el Product Owner (2026-08-05)**: orden y desglose de §8 aprobados sin cambios.

## 9. Diseño detallado — Incremento 1: Fundación de temporadas y ligas

Diseño resuelto contra el código vigente (`XpGrantService`, `AccountChallengeDailyProgress`, `ChallengeService.claim`, `TransactionRunnerService`, `GamificationService.ingestPending`) — no contra una lectura literal aislada del Data Model. Ningún elemento de este diseño introduce un mecanismo nuevo: todos reutilizan un patrón ya aprobado en Bloques I–III, aplicado a tablas nuevas (ver §9.9, determinación de ADR).

### 9.1 Diferencia formal entre tier/liga y grupo

Tres capas, no dos — mismo problema estructural que "definición de desafío" vs. "instancia por cuenta" en Bloque III, con una capa intermedia adicional porque una liga es competencia **grupal**, no individual:

- **`league_definition`** = la **plantilla de tier** (ej. "Bronce", "Plata", "Oro") — global, inmutable por fila (mismo criterio que `ChallengeDefinition`/`TitleDefinition`: una regla nueva es una fila nueva, nunca se edita una vigente). Fija `tierOrder`, reglas de ascenso/descenso, tamaño máximo de grupo, `rewardBundleId`.
- **`league_group`** = una **instancia real y acotada** de un tier, para una temporada concreta — el conjunto de estudiantes que compiten entre sí. Es la unidad donde existirá el ranking (Incremento 2).
- **`season_league_participation`** = el vínculo cuenta↔grupo para una temporada — aquí viven `leaguePoints`, `currentRank` (proyectado, Incremento 2), `participationStatus`, `finalRank`.

Analogía exacta con lo ya construido: `league_definition` es a `league_group` lo que `ChallengeDefinition` es a `AccountChallenge` — salvo que un `AccountChallenge` es 1:1 por cuenta, y un `league_group` es 1:N (compartido por todos sus participantes). Esa diferencia (instancia compartida vs. instancia por cuenta) es la única razón real de la capa adicional.

### 9.2 Política de asignación inicial

**Decisión propuesta**: todo estudiante que participa por primera vez entra siempre al tier más bajo (`tierOrder` mínimo) — nunca se asigna por XP, nivel, ni ninguna otra señal. Cumple literalmente Data Model §16.21 (*"no deberá agrupar utilizando dificultades académicas privadas"*) de la forma más simple posible, sin necesidad de decidir si XP cuenta o no como señal permitida.

`league_group.assignmentPolicyVersion` (ya nombrado en Data Model) registra qué regla decidió la asignación — versión `"v1-lowest-tier"` para esta primera regla. Sirve para que una futura política (ej. asignar por XP acumulado) no reinterprete retroactivamente participaciones ya creadas bajo la regla anterior — mismo espíritu que `ruleVersion` en `xp_ledger_entry`.

**Temporadas siguientes, estudiante con historial previo**: entra al tier resultante de su última participación finalizada (`league_definition_id` de esa fila), *salvo* que exista una decisión de ascenso/descenso ya aplicada — esa decisión la escribe el Incremento 2 (ranking), no este. Si un estudiante nunca participó, aplica la regla de "tier más bajo" de arriba.

### 9.3 Tamaño y ciclo de vida de los grupos

`league_definition.participantGroupSize` fija el cupo máximo. `league_group` se materializa **perezosamente** (mismo criterio que `account_challenge`, §4.14 de Bloque III) — no se pre-crean grupos para una temporada completa; se crea el primero que falte cuando un estudiante necesita unirse y ningún grupo abierto de su tier tiene cupo.

**Precisión obligatoria del Product Owner (2026-08-05) — capacidad bajo concurrencia real**: "buscar grupo abierto con cupo, o crear uno nuevo, e inscribir la participación" es una única transacción protegida por un **advisory lock bloqueante** (`pg_advisory_xact_lock`, namespace nuevo `21`, clave por `(gameSeasonId, leagueDefinitionId)`) — mismo mecanismo exacto que `ChallengeService.claim` (namespace `20`), no uno nuevo. Esto serializa a todos los estudiantes que compiten por el último cupo de un tier/temporada, evitando que dos altas concurrentes lean "1 cupo libre" y ambas lo ocupen. Como defensa adicional a nivel de base de datos (en caso de que algún camino de código futuro omita el lock), un trigger (`enforce_league_group_capacity`) rechaza cualquier `INSERT` en `season_league_participation` que deje a un `league_group` por encima de `participantGroupSize`.

**Unicidad de participación**: `@@unique([accountId, gameSeasonId])` en `season_league_participation` — una cuenta no puede tener dos participaciones activas en la misma temporada (ni en el mismo tier, ni en dos tiers a la vez). La inscripción es **idempotente**: si ya existe una participación de la cuenta para esa temporada, se devuelve esa fila tal cual (mismo criterio "check-antes-de-crear" ya usado en `AccountChallengeRepository.createIdempotent`, corregido en Bloque III 4.b) — nunca se intenta crear una segunda ni se lanza error ante una carrera de doble solicitud.

Ciclo de vida (`LeagueGroupStatus`, transición forward-only por trigger, mismo patrón que `enforce_account_challenge_status_transition`):

```
OPEN  → FULL   (cupo alcanzado, pero sigue acumulando puntos hasta el cierre de temporada)
OPEN  → LOCKED  (la temporada termina antes de llenarse)
FULL  → LOCKED  (cierre de temporada)
LOCKED → FINALIZED  (Incremento 2 calculó rangos/ascensos — fuera del alcance de este incremento)
```

Unirse a un grupo `OPEN`/`FULL` después de `LOCKED` es imposible por diseño (ningún camino de código busca grupos `LOCKED` como candidatos).

### 9.4 Fuente autoritativa de League Points

**`ValidatedGamificationActivity`** (ya existente, ya deduplicada en `GamificationService.ingestPending`) es la única fuente — **no** se registra un segundo consumidor de outbox. Igual que `XpGrantService` lee esa tabla sin volver a validar el evento crudo, un nuevo `LeaguePointGrantService` hace lo mismo, en un flujo estructuralmente idéntico pero **sin ninguna transacción compartida** con XP:

- Nueva relación en `ValidatedGamificationActivity`: `leaguePointLedgerEntries LeaguePointLedgerEntry[]` (paralela a la ya existente `ledgerEntries` de XP, nunca la misma).
- `LeaguePointGrantScheduler` (`@Cron(EVERY_MINUTE)`, independiente de `XpGrantScheduler` — un fallo aquí nunca bloquea ni retrasa el otorgamiento de XP) invoca `LeaguePointGrantService.grantPending()`.
- `findPendingLeagueGrant` — mismo criterio que `findPendingGrant` de XP, pero filtrando por ausencia de fila en `leaguePointLedgerEntries` (no en `ledgerEntries`).

**Diferencia deliberada frente a XP**: el otorgamiento de XP es incondicional (toda actividad válida genera XP). El de League Points es **condicional**: solo se otorgan si la cuenta tiene una `season_league_participation` con `participationStatus = ACTIVE` cuyo periodo cubra `activity.occurredAt` — un estudiante que nunca entró a Competir no acumula puntos de liga por estudiar, aunque sí gane XP. Si no hay participación activa, el otorgamiento se omite (no es un error, es "no aplica" — no se escribe ninguna fila, ni siquiera de intento fallido).

**Precisión obligatoria del Product Owner (2026-08-05) — sin LP retroactivos**: una actividad solo puede otorgar LP si `activity.occurredAt` ocurrió **dentro de la temporada** (`>= season.startsAt`, `< season.endsAt`) **y después del inicio de la participación activa** (`>= participation.joinedAt`). Actividad académica anterior a que el estudiante se incorporara a Competir en esa temporada **nunca** genera LP retroactivos, aunque esa misma actividad ya haya generado XP en su momento. La ventana efectiva de elegibilidad es `[participation.joinedAt, season.endsAt)` — nunca se reabre hacia el pasado.

**Monto de LP — decisión exclusiva del servidor**: el monto nunca lo envía el cliente, y nunca es una copia o conversión directa del `xpAmount` ya otorgado para esa misma actividad — proviene de una regla de puntos de liga propia e identificable (`LeaguePointRule`, nueva entidad, mismo patrón de selección "versión vigente en `activity.occurredAt`" que `XpRule`), con su propio `basePoints`/`dailyCap`/`effectiveFrom`. XP y League Points pueden originarse en el mismo hecho, pero cada uno consulta su propia tabla de reglas — ninguno deriva su monto del otro.

### 9.5 Idempotencia del ledger

**Precisión obligatoria del Product Owner (2026-08-05) — la clave de idempotencia vincula actividad Y participación**, a diferencia de XP (donde `grant:${activity.id}` basta porque el XP no depende de ninguna participación):

- `idempotencyKey` = `` `league-grant:${participationId}:${validatedActivityId}` `` — única por par (participación, actividad). Esto es necesario porque, a diferencia de XP, la MISMA actividad podría en teoría procesarse contra una participación distinta si el diseño evolucionara (ej. una actividad reprocesada tras un cambio de temporada) — la clave nunca debe depender solo de la actividad.
- El ledger conserva **ambas referencias como columnas propias** (no solo codificadas en la clave): `seasonLeagueParticipationId` y `validatedActivityId`, más `leaguePointRuleId`/`ruleVersion` (la política/regla aplicada, para poder auditar exactamente qué regla decidió el monto, igual que `ruleVersion` en `xp_ledger_entry`).
- Reversos: `` `league-reverse:${originalEntryId}` ``.
- Mismos dos triggers de integridad que ya existen para `xp_ledger_entry` (`enforce_xp_ledger_entry_immutable`, `enforce_xp_ledger_entry_reversal_integrity`), replicados para `league_point_ledger_entry` con los nombres análogos.
- Mismo mecanismo de concurrencia: `TransactionRunnerService.run(fn, { isolationLevel: Serializable })` + reintento acotado ante `P2034` (`runSerializable`, calcado). Nunca se abre una transacción que toque `xp_ledger_entry` y `league_point_ledger_entry` a la vez.
- Tope diario propio (`LeaguePointRule.dailyCap`) — verificado con el mismo patrón de suma-dentro-de-SERIALIZABLE que XP, no con un contador separado (la naturaleza del dato es la misma: "cuánto ya se otorgó hoy", sumable retroactivamente — a diferencia del contador de contribuciones de desafíos, que cuenta eventos discretos, no montos).

**Precisión obligatoria del Product Owner (2026-08-05) — exclusión transaccional entre otorgamiento y cierre de temporada**: la MISMA transacción SERIALIZABLE que otorga LP debe releer, dentro de sí misma, que `season.status = ACTIVE`, `participation.participationStatus = ACTIVE` y `group.status IN (OPEN, FULL)` inmediatamente antes de escribir el ledger e incrementar el acumulado — nunca basta con que esas condiciones fueran ciertas cuando ocurrió la actividad. Si al confirmar cualquiera de esas tres condiciones ya cambió (una transacción de cierre de temporada, ejecutándose de forma concurrente, ganó la carrera), el otorgamiento se descarta como "no aplica", igual que la ausencia de participación — nunca se confirma un movimiento después de que temporada, grupo o participación dejaron de estar activos. Bajo aislamiento SERIALIZABLE de Postgres, si ambas transacciones (cierre y otorgamiento) tocan la misma fila de `participation`/`season`, una de las dos aborta con conflicto de serialización y se reintenta con el mismo mecanismo acotado ya usado (`runSerializable`) — la re-lectura post-reintento es la que decide correctamente, nunca una condición evaluada una sola vez al principio.

### 9.6 Transición entre temporadas

`game_season.status`: `SCHEDULED → ACTIVE → FINALIZED → ARCHIVED` (forward-only, mismo trigger). **Invariante**: como máximo una temporada `ACTIVE` a la vez — un índice único parcial a nivel de Postgres (`CREATE UNIQUE INDEX ... WHERE status = 'ACTIVE'`, técnica nueva en este repositorio pero no una decisión arquitectónica: es un constraint de esquema, no un mecanismo de coordinación entre dominios).

Un nuevo `SeasonTransitionScheduler` (cron menos frecuente que `EVERY_MINUTE` — propuesta: cada hora, ya que las fronteras de temporada son de escala de días/semanas, no de minutos) compara `now` contra `startsAt`/`endsAt` y aplica la transición.

**Al cerrar una temporada** (`ACTIVE → FINALIZED`), en una sola transacción por temporada:
1. Todo `league_group` de esa temporada en `OPEN`/`FULL` → `LOCKED` (deja de aceptar uniones y acumulación de puntos).
2. Toda `season_league_participation` con `participationStatus = ACTIVE` → `SEASON_ENDED` (estado terminal de este incremento — **no** calcula `finalRank` ni decide ascenso/descenso; eso es explícitamente responsabilidad del Incremento 2, que consumirá las filas `SEASON_ENDED`/`LOCKED` para calcular rangos y transicionarlas a un estado de resultado, ej. `PROMOTED`/`DEMOTED`/`RETAINED`).
3. Ninguna fila de `league_point_ledger_entry` se modifica ni se borra — ver §9.8.

**Temporada siguiente**: no se crean participaciones en bloque para toda la base de usuarios. Igual que `account_challenge`, una `season_league_participation` nueva se materializa perezosamente cuando el estudiante vuelve a tener actividad elegible durante una temporada `ACTIVE`, aplicando §9.2 para decidir el tier de entrada.

### 9.7 Aislamiento respecto de XP y PROGRESS

- **Nunca una transacción compartida**: `LeaguePointGrantService` y `XpGrantService` cada uno abre su propia transacción vía `TransactionRunnerService`; ninguno espera ni depende del resultado del otro dentro de la misma unidad atómica.
- **Sin FK cruzada entre ledgers**: `LeaguePointLedgerEntry.validatedActivityId` apunta a `ValidatedGamificationActivity`, igual que `XpLedgerEntry.validatedActivityId` — el origen compartido es la actividad validada, nunca una tabla de XP referenciando a la de liga o viceversa.
- **Frontera GAMIFICATION→PROGRESS intacta**: el flujo de League Points nunca lee `StudentResponse`/`CurriculumTopicProgress` — solo `ValidatedGamificationActivity`, ya dentro del dominio GAMIFICATION. Mismo chequeo estático de símbolos prohibidos que ya usan los gates de Bloque I/III se extiende a los archivos nuevos.
- **Módulo**: todo nuevo repositorio/servicio se registra en `GamificationModule` (no un módulo nuevo) — Liga es un concern de GAMIFICATION, mismo criterio que Títulos/Desafíos/Cosméticos.

### 9.8 Qué datos históricos se conservan al cerrar una temporada

**Nada se borra.** "Reiniciarse por temporada" (instrucción del Product Owner, §4.4) significa que la temporada *siguiente* empieza una `season_league_participation` **nueva**, con `leaguePoints` en cero para esa fila — nunca que se destruya o resetee en el lugar el historial de la temporada anterior:

- `game_season`, `league_group`, `season_league_participation` (con `finalRank`/`leaguePoints` ya congelados) permanecen para siempre — permiten responder "contra quién competiste la temporada pasada" sin reconstrucción.
- `league_point_ledger_entry` es permanente e inmutable, igual que `xp_ledger_entry` — nunca se elimina ni se decrementa in-place; un ajuste es una fila de reverso, no una edición.
- **Anonimización de cuenta**: mismo criterio ya establecido para XP — `PublicProfileRepository.anonymize()` no toca `league_point_ledger_entry`/`season_league_participation` (son historial de GAMIFICATION indexado por `accountId`, no presentación pública). Lo que sí deja de mostrarse públicamente al anonimizar es responsabilidad de Incremento 2/3 (capa de presentación del ranking/perfil competitivo), no de este incremento.

### 9.9 Gates de concurrencia añadidos (obligatorios, Product Owner 2026-08-05)

Además de los gates funcionales que se detallarán al implementar, este incremento exige verificación real de concurrencia (no solo lógica secuencial):

| Gate | Qué verifica |
|---|---|
| **Capacidad de grupo bajo concurrencia real** | N inscripciones concurrentes a un tier/temporada con `participantGroupSize = K` nunca terminan con más de K participaciones en un mismo `league_group` — la inscripción K+1 crea (o encuentra) un grupo distinto. Ejecutado con `Promise.all` sobre solicitudes reales, no simulado en serie. |
| **Inscripción idempotente bajo carrera** | Dos solicitudes de inscripción concurrentes de la MISMA cuenta a la MISMA temporada terminan con exactamente una `season_league_participation` — ninguna duplicada, ningún error 500, ambas responden con la misma participación. |
| **Carrera otorgamiento-vs-cierre de temporada** | Un otorgamiento de LP disparado concurrentemente con el cierre de esa misma temporada nunca confirma un movimiento si el cierre gana la carrera — cero filas de `league_point_ledger_entry` escritas después de que `participation`/`season`/`group` pasaron a estado no-activo, verificado leyendo el estado real de la base tras ambas operaciones. |

### 9.10 Determinación de ADR — sin ADR nuevo para este incremento

Cada mecanismo usado aquí ya fue aprobado y validado en Bloques I–III, aplicado a tablas nuevas, sin alterar su forma:

| Mecanismo | Ya aprobado en |
|---|---|
| Transacción SERIALIZABLE + reintento acotado ante conflicto | `XpGrantService.runSerializable` (Bloque I) |
| Materialización perezosa de la instancia por cuenta | `account_challenge` (Bloque III, §4.14) |
| Transición de estado forward-only por trigger | `enforce_account_challenge_status_transition` (Bloque III) |
| Ledger inmutable con `idempotencyKey` único + reverso como fila nueva | `xp_ledger_entry` (Bloque I) |
| `TransactionRunnerService` como único punto de apertura de transacciones multi-repositorio | Convención ya vigente desde M1 |
| Advisory lock namespace nuevo y distinto (`21`, para la inscripción/creación de grupo bajo concurrencia) | Mismo mecanismo que namespaces `19`/`20`, solo un número nuevo |

No hay una decisión de arquitectura nueva (ni bounded context nuevo, ni modelo de consistencia nuevo, ni patrón de autorización nuevo) — a diferencia de Incremento 2 (proyección materializada con recálculo periódico) e Incremento 3 (primer endpoint público cross-cuenta), que sí lo requieren y ya quedaron señalados en §6. **Confirmo que el ADR sigue reservado para esos dos incrementos, no para este.**

### Evidencia de validación — Incremento 1 ("Fundación de temporadas y ligas", 2026-08-05)

Implementado contra el diseño de §9, incluyendo las cuatro precisiones obligatorias y los tres gates de concurrencia exigidos por el Product Owner: `game_season`/`league_definition`/`league_group`/`season_league_participation`/`league_point_rule`/`league_point_ledger_entry` (migración `20260805204859_league_season_foundation`, con 6 triggers nuevos y 1 índice único parcial), `LeagueEnrollmentService` (advisory lock namespace 21), `LeaguePointGrantService` (ledger independiente de XP), `SeasonTransitionService`/`SeasonTransitionScheduler` (cron cada hora).

**Gate nuevo, `verify:league-season-foundation-gate`** — 18 secciones, todas con verificación real contra Postgres (sin mocks): invariante de una sola temporada `ACTIVE` (índice único parcial), transiciones forward-only de los tres ciclos de vida (temporada/grupo/participación), inscripción idempotente, **capacidad de grupo bajo concurrencia real** (`Promise.all` de 5 inscripciones simultáneas a un tier con cupo 3 — nunca más de 3 por grupo, se crean 2 grupos), **inscripción idempotente bajo carrera real** (3 solicitudes concurrentes de la misma cuenta -> una sola fila), otorgamiento condicional de LP (sin participación -> `NOT_PARTICIPATING`), **sin retroactividad** (actividad anterior a `joinedAt` -> `OUT_OF_WINDOW`), monto exclusivo del servidor (verificado numéricamente distinto de un XP hipotético para la misma actividad), idempotencia vinculando participación+actividad, inmutabilidad/no-DELETE/integridad de reverso del ledger, aislamiento estructural respecto de XP (sin fila cruzada, sin símbolos prohibidos en ninguno de los dos sentidos), y **la carrera otorgamiento-vs-cierre de temporada**, que en esta ejecución disparó un conflicto SERIALIZABLE real (`P2034`, capturado y reintentado por `runSerializable`, log real: *"Conflicto serializable en otorgamiento de League Points (intento 1/3)"*) — resuelto correctamente sin dejar un movimiento a medias. **PASS**, 53 verificaciones, cero fallos.

**Corrección real encontrada al escribir el propio gate** (no un defecto del código de producción, sino del fixture): las inserciones directas de historial de fixture hacia un `league_group` con `capacity = 3` chocaban contra el trigger `enforce_league_group_capacity` al insertar 5 filas de historial — corregido dando a ese grupo de fixture una capacidad de 5 (el trigger, correctamente, no distingue entre una inscripción real y una inserción de fixture). Confirma que el trigger de capacidad funciona exactamente como se diseñó: rechaza CUALQUIER inserción por encima del cupo, sin excepción.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:league-season-foundation-gate` (nuevo) | **PASS** |
| `tsc --noEmit` (backend) | PASS, sin errores |
| `eslint src` (backend) | PASS, sin advertencias |
| `node scripts/verify-block-iii-gate.mjs` (consolidado Bloque I+II+III, regresión) | **PASS** (los 13 pasos, salida real confirmada: sin regresión introducida por Bloque IV Incremento 1) |

**Confirmado explícitamente fuera de Incremento 1**: sin ranking (`currentRank`/`finalRank` permanecen `NULL`), sin endpoints HTTP, sin superficie móvil, sin `gamification_integrity_signal`/`enforcement_action`.

## 10. Incremento 2 — Ranking: propuesta de diseño (auditoría completa, sin implementar todavía)

Autorización del Product Owner (2026-08-05): **únicamente auditoría y diseño** de este incremento. No se toca el esquema, no se implementa el endpoint cross-cuenta (Incremento 3) ni superficie móvil (Incremento 5) hasta nueva confirmación.

**Nota de superación parcial (2026-08-05)**: tras revisar esta propuesta, el Product Owner corrigió dos decisiones de fondo e hizo obligatoria la formalización de tres puntos que aquí quedaban abiertos. **`docs/adr/0020-ranking-materializacion.md` es ahora el documento autoritativo** para este incremento — en particular, **§10.11 de abajo queda corregido y reemplazado** por ADR-0020 §1/§2 (la identidad autoritativa del cálculo es `season_league_participation`, nunca `public_profile`; la visibilidad de perfil no debe alterar el cálculo competitivo bajo ninguna circunstancia — se conserva §10.11 tal cual se escribió originalmente, sin editarla, únicamente para que quede registro auditable de la corrección real que introdujo el Product Owner, mismo criterio de transparencia ya usado en otras enmiendas de este proyecto). §10.5 (desempate) y §10.8 (cierre de grupo) quedan formalizados en detalle por ADR-0020 §3/§4/§5 — las secciones de abajo siguen siendo válidas en su decisión de fondo, ADR-0020 las precisa.

### 10.1 Auditoría documental — fuentes revisadas

- **Data Model §16.23 "Ranking"**: `leaderboard_definition` (`leaderboardKey`, `leaderboardType`, `rankingMetric`, `scopeRule`, `visibilityRule`, `tieBreakRule`, `updateFrequency`, `status`) y `leaderboard_entry`, declarada explícitamente **"proyección materializada"** (`leaderboardDefinitionId`, `seasonId`, `groupId`, `publicProfileId`, `rankPosition`, `metricValue`, `tieBreakValue`, `calculatedAt`, `snapshotVersion`). Cierra con: *"El ranking deberá poder reconstruirse desde sus libros mayores y reglas."*
- **Data Model §16.24 "Empates"**: exige desempate **determinista, público en sus principios, independiente de Premium, incapaz de usar información académica privada, estable durante la finalización**. Factores aprobables (exactamente tres, ninguno más): *"Momento de alcanzar el puntaje", "Cantidad de actividades válidas", "Desempeño en una competencia específica"*. Prohibidos explícitamente: gasto, antigüedad de suscripción, información personal, cantidad de invitaciones, comportamientos no explicados.
- **Data Model §16.25 "Privacidad de rankings"**: el ranking usa **exclusivamente** `public_profile_id`. Lista blanca: username, avatar, título equipado, nivel o puntos aplicables, posición, liga. Lista negra explícita: nombre privado, correo, edad exacta, ubicación, materias débiles, puntajes diagnósticos, objetivos, historial de respuestas, estado Premium, configuración de accesibilidad.
- **Data Model §16.41 "Finalización de temporada"**: el pipeline de cierre es una secuencia fija — bloquear entradas → procesar pendientes → resolver incidencias → **materializar ranking final** → **aplicar desempates** → **determinar ascensos/descensos** → entregar recompensas → **conservar instantánea** → abrir siguiente temporada. Entidad `season_finalization_run` registra el resultado.
- **Data Model §16.42 "Instantáneas históricas"**: `leaderboard_snapshot` (`leaderboardDefinitionId`, `seasonId`, `snapshotType` [periódica o final], `snapshotAt`, `ruleVersion`, `participantCount`, `contentHash`, `status`). *"Las instantáneas finales deberán ser inmutables. Una corrección posterior generará una versión sustitutiva con motivo registrado."* — mismo principio "reverso, nunca edición" ya usado en los ledgers.
- **Master Context §4.10 "Liga"**: *"El ranking forma parte de Liga y no deberá convertirse en un destino principal independiente."*
- **Master Context §5.20 (CUJ-16)**: *"El cliente no recalcula posiciones como autoridad"*, *"Un ranking temporalmente desactualizado deberá indicarlo"*, *"La interfaz comunica la posición y la vigencia de los datos"* — tolerancia a staleness explícitamente autorizada, con obligación de comunicarla.
- **Master Context §5.21 (CUJ-17, cierre de temporada)**: *"La finalización de una temporada nunca modificará dominio ni eliminará progreso académico."*
- **Master Context §7.20 "Ligas y rankings"**: GAMIFICATION es propietario. *"Cada cálculo deberá conocer: temporada; grupo; regla; periodo; datos incluidos; momento de cálculo; versión; estado de cierre."* *"La interfaz podrá mostrar una instantánea, pero el cliente no podrá declarar la posición final."*
- **PRD GAME-017/GAME-020/GAME-022, PROFILE-006/007/008**: ascenso/descenso por XP competitivo válido de temporada; identidad pública limitada (mismo criterio que Data Model §16.25); sin comparaciones sobre inteligencia; el estudiante controla su visibilidad, con la opción más privada como predeterminada ante duda.
- **ADR-0018**: `visibilityStatus = PRIVATE` → *"no puede ser referenciado por `leaderboard_entry`"*. `lifecycleStatus = RETIRED` → excluido de *"toda superficie pública"*. **Vacío confirmado**: ADR-0018 nunca definió qué pasa con una fila `leaderboard_entry` YA EXISTENTE cuando el perfil referenciado pasa a `PRIVATE`/`RETIRED` después de haber sido creada — lo deja explícitamente para este incremento (§9.8 de este documento).
- **§6 de este documento (ya fijado)**: Incremento 2 **requiere ADR nuevo** por dos motivos ya señalados: (1) proyección materializada con recálculo periódico, patrón nuevo distinto de "derivar en lectura" (Bloque II) y de "entrega directa inmutable" (Bloque III); (2) nada de perfil cross-cuenta (eso es Incremento 3, dependiente de este).

**Vacíos confirmados por la auditoría, sin resolver en ningún documento fuente** (debo decidirlos aquí, no asumirlos en silencio):
1. Qué dispara el recálculo (worker programado vs. bajo demanda) — ninguna fuente lo fija.
2. Qué pasa con una `leaderboard_entry` existente cuando el perfil deja de ser elegible (`PRIVATE`/`RETIRED`) — ADR-0018 lo deja abierto explícitamente.
3. Convención de paginación (cursor vs. offset) para listar rankings — el Data Model solo define cursores para sincronización offline (§21.17), sin regla general para APIs de lista.
4. Forma concreta de `promotionRule`/`demotionRule` (dejadas como grammar abierta, sin interpretar, en Incremento 1) — Data Model no fija números; PRD (OQ-011) da una hipótesis V1 no vinculante ("primeras 10 posiciones ascienden, últimas 5 descienden, de ~40").

### 10.2 Evaluación de las cuatro alternativas

| # | Alternativa | Evaluación |
|---|---|---|
| 1 | **Cálculo directo desde `league_point_ledger_entry`** (sin proyección) | Descartada como única fuente. Contradice literalmente el Data Model, que declara `leaderboard_entry` **"proyección materializada"** — no es una opción de diseño, es la entidad ya nombrada. Además, ordenar por `SUM(point_amount)` en cada lectura escala mal si se pide con frecuencia, y no puede exponer `calculatedAt`/`snapshotVersion` (exigidos por Master Context §7.20) sin materializar algo. Sí se conserva como **mecanismo de reconstrucción** (ver §10.4) — la fórmula de cálculo, no el camino de lectura. |
| 2 | **Proyección materializada recalculada periódicamente** (preferencia inicial del Product Owner) | Correcta y necesaria como base — coincide exactamente con la entidad `leaderboard_entry` del Data Model. Permite lecturas rápidas indexadas por `rankPosition`, reconstruible en cualquier momento desde el ledger. **Incompleta por sí sola**: no cubre el requisito explícito de instantáneas inmutables en el cierre de temporada (§16.41/§16.42, `leaderboard_snapshot`), que es una entidad HERMANA distinta en el propio Data Model, con su propio ciclo de vida (inmutable, corrección = versión sustitutiva). |
| 3 | **Snapshots periódicos únicamente** (sin proyección continua) | Descartada como única fuente. Coincide con `leaderboard_snapshot`, pero por sí sola no sirve para mostrar una tabla de posiciones consultable en cualquier momento dentro de una temporada activa — Master Context exige que Liga muestre "tabla de posiciones" y "posición del estudiante" de forma continua, no solo en cortes periódicos. Se conserva como **mecanismo de archivo** (ver §10.6), no como fuente de lectura en vivo. |
| 4 | **Modelo híbrido — RECOMENDADO** | Extiende la preferencia inicial del Product Owner (alternativa 2) con lo mínimo necesario para cumplir lo que el propio Data Model ya especifica como dos entidades distintas: `leaderboard_entry` (proyección viva, recalculada periódicamente, para lectura durante la temporada activa) **+** `leaderboard_snapshot` (instantánea inmutable, tomada exactamente al cerrar cada grupo/temporada, para el registro histórico y la decisión de ascenso/descenso). No es una desviación del diagrama del Product Owner — es su extensión mínima necesaria para el pipeline de cierre (§16.41, CUJ-17), que el diagrama original no contemplaba. |

**Diagrama actualizado** (extiende el propuesto por el Product Owner):

```
league_point_ledger_entry          season_league_participation
        \\                              /
         \\  fuentes de verdad         /
          v                          v
              leaderboard_entry
        (proyección materializada, reconstruible,
         recalculada periódicamente -- SOLO grupos OPEN/FULL
         de la temporada ACTIVE)
                    |
                    | al cerrar el grupo (LOCKED), último cálculo
                    v
              leaderboard_snapshot
        (instantánea INMUTABLE, snapshotType=FINAL,
         dispara la decisión de ascenso/descenso)
                    |
                    v
              ranking API (Incremento 3 -- no se implementa aún)
```

### 10.3 Fuente autoritativa

`league_point_ledger_entry` (Incremento 1) es la única fuente del monto. `season_league_participation`/`league_group` son la fuente de "quién compite con quién" (scope). `leaderboard_entry` nunca se escribe directamente: siempre es el resultado de agregar `SUM(pointAmount)` por `seasonLeagueParticipationId` (OTORGAMIENTO + REVERSO, que ya vienen con signo) y ordenar según el criterio de desempate de §10.5. Cero información nueva se introduce en este incremento — solo se deriva de lo que Incremento 1 ya persiste.

### 10.4 Ámbito del ranking (grupo, tier o temporada)

**Decisión: por GRUPO** (`leaderboard_entry.groupId` = `league_group.id`), no por tier completo ni por temporada completa. Razón: la unidad real de competencia ya fijada en Incremento 1 es el `league_group` (conjunto acotado, con cupo, donde ocurre el ascenso/descenso) — un tier puede tener decenas de grupos paralelos sin relación competitiva entre sí. Ranking agregado por tier completo o global (Data Model `leaderboard_type: "Liga, temporada, global"`) queda **fuera de alcance de V1**, con `leaderboard_definition.scopeRule` como grammar abierta (String) para no cerrar la puerta a una extensión futura sin migración de esquema — mismo criterio que `eligibilityRule`/`completionRule` en Bloque III (columna presente desde el nacimiento del modelo, interpretación mínima en V1).

### 10.5 Desempate determinista

Orden de evaluación, todos verificables sin información privada:

1. `metricValue` (suma de `pointAmount`) **DESC** — el ranking mismo, no un desempate.
2. Empate real → **"Momento de alcanzar el puntaje"**: `occurredAt` del `league_point_ledger_entry` que llevó a esa cuenta a su total actual, **ASC** (quien lo alcanzó primero, mejor posición) — determinista, público en sus principios, no usa información académica.
3. Empate persistente → **"Cantidad de actividades válidas"**: `COUNT(*)` de entradas `OTORGAMIENTO` de esa participación, **DESC** (más actividades sostenidas, mejor posición que un único golpe de puntaje).
4. **"Desempeño en una competencia específica"** (tercer factor aprobado por Data Model) — **diferido explícitamente**: V1 no tiene todavía una "competencia específica" con puntaje propio (Pregunta rápida, Incremento 4, es individual/asincrónica, sin mecanismo de puntaje competitivo comparable) — documentado como deuda diferida, mismo criterio que `STREAK_PROTECTION` en Bloque III, no un vacío oculto.
5. Desempate final de última instancia (si TODO lo anterior empata exactamente) → `accountId` en orden lexicográfico — no es uno de los tres factores aprobados por Data Model, pero tampoco está en la lista de prohibidos (no es gasto, antigüedad, información personal, invitaciones ni comportamiento no explicado); es una garantía técnica de unicidad absoluta de `rankPosition`, transparente y sin significado valorativo.

`leaderboard_definition.tieBreakRule` almacena esta cadena como grammar versionada (string abierto, ej. `"v1-time-then-activity-count"`), igual criterio que el resto de reglas abiertas del bloque.

### 10.6 Reconstrucción y reconciliación

- **Reconstrucción** = el mismo cálculo de siempre, no un camino de emergencia separado: borrar y regenerar `leaderboard_entry` de un grupo agregando desde `league_point_ledger_entry` es exactamente lo que el recálculo periódico normal hace en cada pasada (mismo principio que `XpGrantService.reconcileBalance`, que recalcula desde el ledger sin un mecanismo paralelo).
- `leaderboard_entry` es una **proyección/caché**, no un hecho histórico — a diferencia de los ledgers (inmutables por diseño), se actualiza **in place** (`UPSERT` por `(leaderboardDefinitionId, groupId, publicProfileId)`), incrementando `snapshotVersion` en cada pasada exitosa. No se conserva cada pasada intermedia como historial — para eso existe `leaderboard_snapshot` (§10.8), reservado a instantáneas que sí vale la pena conservar.
- Recálculo por grupo = una transacción atómica: todas las filas de ESE grupo se reemplazan juntas, con el mismo `snapshotVersion`/`calculatedAt` — coherencia garantizada DENTRO de un grupo, sin necesidad de coordinación ENTRE grupos (cada uno es una unidad de competencia aislada, mismo criterio de aislamiento de fallo que `RewardEvaluationWorker`).
- Reconciliación ante sospecha de corrupción: un comando administrativo interno (sin exponer a clientes) puede forzar un recálculo inmediato de un grupo o de todos los grupos activos, usando la MISMA función de cálculo — nunca un camino de reparación distinto que pudiera divergir del cálculo normal.

### 10.7 Disparador del recálculo (worker vs. bajo demanda) — decisión de ADR

**Decisión: worker programado exclusivamente, sin recálculo bajo demanda del cliente** — evita que un cliente fuerce carga arbitraria en el servidor, y es coherente con "el cliente no recalcula posiciones como autoridad" (CUJ-16).

- `LeaderboardCalculationScheduler` (`@Cron`), cadencia propuesta **cada 15 minutos** (configurable) — deliberadamente más espaciada que el otorgamiento de puntos (`EVERY_MINUTE`), porque el propio corpus ya autoriza y exige comunicar staleness ("Un ranking temporalmente desactualizado deberá indicarlo") en vez de exigir tiempo real.
- Alcance por ciclo: todo `league_group` con `status IN (OPEN, FULL)` de la temporada `ACTIVE` — un grupo `LOCKED`/`FINALIZED` no se recalcula más por este scheduler (su último estado se congela y se archiva, ver §10.8).
- Consistencia: `snapshotVersion`/`calculatedAt` son consistentes DENTRO de un grupo (misma transacción), pero pueden diferir ENTRE grupos (cálculo independiente, sin sincronización global necesaria).

### 10.8 Comportamiento al cerrar/finalizar un grupo

Extiende (no reemplaza) el cierre de temporada ya construido en Incremento 1 (`SeasonTransitionService`), en el mismo paso donde un `league_group` pasa a `LOCKED`, siguiendo el pipeline fijo de Data Model §16.41:

1. Último recálculo de `leaderboard_entry` para ese grupo (con los datos ya congelados, ya que el grupo dejó de acumular puntos al pasar a `LOCKED` en Incremento 1).
2. Se aplican los desempates de §10.5 sobre ese resultado final.
3. Se decide `PROMOTED`/`DEMOTED`/`RETAINED` por `season_league_participation` según `rankPosition` final contra las zonas fijadas en `LeagueDefinition.promotionRule`/`demotionRule` — **grammar V1 concreta a fijar en el ADR**, no dejada abierta indefinidamente (a diferencia de Incremento 1, que las dejó sin interpretar): propuesta inicial "top N% asciende, bottom N% desciende, resto retiene", con N configurable por `LeagueDefinition`, inspirado en la hipótesis no vinculante de PRD OQ-011 pero sin comprometerse a sus cifras exactas (esas se validan en beta, igual que el PRD ya anticipa).
4. Se escribe un `leaderboard_snapshot` (`snapshotType = FINAL`, inmutable desde ese instante) — `contentHash` calculado sobre una serialización canónica ordenada por `rankPosition` (para que el mismo contenido siempre produzca el mismo hash, sin depender de orden de iteración), `participantCount`, `ruleVersion` (referencia a la versión de `tieBreakRule`/reglas aplicadas). Una corrección posterior nunca edita esta fila — genera una nueva versión sustitutiva con motivo registrado (§16.42, literal).
5. Transición de `season_league_participation.participationStatus`: `SEASON_ENDED → PROMOTED|DEMOTED|RETAINED` (extiende el enum ya creado en Incremento 1, que deliberadamente se detuvo en `SEASON_ENDED` a la espera de este incremento).

### 10.9 Paginación estable

Sin convención específica en el Data Model (solo existe para sincronización offline, no aplicable a listas de API). **Decisión: cursor, no offset** — mismo criterio ya usado en `XpLedgerEntryRepository.findByAccountIdPaginated` (evita desalineación si el contenido cambia entre páginas, y aquí SÍ cambia: `leaderboard_entry` se recalcula cada 15 minutos mientras un cliente pagina).

- Cursor propuesto: `(rankPosition ASC, id ASC)` — orden compuesto, mismo motivo que el cursor de `xp_ledger_entry` (evita omitir filas con `rankPosition` empatado antes de aplicar desempate, aunque en la práctica `rankPosition` ya es único post-desempate).
- `leaderboard_entry` se actualiza **in place** (§10.6) — no se versionan snapshots de cada pasada intermedia, así que una sesión de scroll larga podría, en el peor caso, cruzar un recálculo a mitad de camino y ver una página con datos ligeramente más nuevos que la anterior. Esta imprecisión ya está autorizada explícitamente por el corpus (CUJ-16: staleness tolerada y comunicada) — no se construye un mecanismo de fotografías versionadas por sesión de paginación, que sería una complejidad no exigida por ningún documento fuente. Cada página SIEMPRE devuelve `calculatedAt`/`snapshotVersion` de las filas servidas, para que el cliente cumpla el paso 7 de CUJ-16 ("la interfaz comunica la posición y la vigencia de los datos").

### 10.10 Posición propia aunque quede fuera de la página

Ninguna fuente exige explícitamente una "fila pegajaza", pero es de bajo costo y evita una mala experiencia obvia. **Decisión**: `leaderboard_entry` debe ser recuperable individualmente por `(groupId, publicProfileId)` sin depender de paginación — consulta O(1) por clave, no un escaneo de página. La presentación de esto (bloque "mi posición" separado de la página solicitada) es diseño del endpoint de **Incremento 3**, no de este incremento — aquí solo se garantiza que la CAPACIDAD de recuperación directa exista.

### 10.11 Privacidad y exclusión de perfiles no visibles/no activos — ⚠️ CORREGIDA por ADR-0020 §1/§2, ver nota arriba

**Esta sección quedó INCORRECTA tras la revisión del Product Owner y se conserva sin editar únicamente como registro auditable.** La decisión vigente es la opuesta a la de abajo: la visibilidad del perfil **nunca** excluye ni altera el cálculo — ver `docs/adr/0020-ranking-materializacion.md` §1/§2.

- El cálculo periódico **excluye desde el origen** cualquier `season_league_participation` cuyo `public_profile` no sea `visibilityStatus = VISIBLE` **y** `lifecycleStatus = ACTIVE` — nunca se calcula su `rankPosition`, nunca se crea su fila (mismo criterio ya fijado por ADR-0018: "no puede ser referenciado por `leaderboard_entry`").
- Ser `PRIVATE` no afecta la acumulación de `league_point_ledger_entry` (eso ya lo decide Incremento 1, sin relación con visibilidad) — solo afecta si aparece en el ranking.
- **Resuelve el vacío confirmado de ADR-0018** (qué pasa con una fila YA EXISTENTE cuando el perfil deja de ser elegible): **doble mecanismo**, no solo el ciclo de 15 minutos —
  1. **Eliminación inmediata y síncrona**: cuando `UserService` cambia `visibilityStatus` a `PRIVATE` (o `lifecycle_status` deja de ser `ACTIVE`), la MISMA transacción elimina cualquier `leaderboard_entry` de esa `publicProfileId` — mismo patrón de frontera ya usado en `PublicProfileRepository.anonymize()`, que hoy ya borra `equipped_title`/`equipped_cosmetic` (tablas de GAMIFICATION que representan presentación pública, no producción) en la misma transacción de USER.
  2. **Red de seguridad periódica**: el recálculo normal de cada 15 minutos, al reconstruir un grupo desde cero, nunca vuelve a incluir a un perfil no elegible — si el mecanismo inmediato fallara por cualquier razón, la exposición queda acotada a, como máximo, un ciclo de recálculo (nunca indefinida).
- `leaderboard_snapshot` **finales** (§10.8) son inmutables por diseño — si un perfil se vuelve `PRIVATE` DESPUÉS de que su temporada ya cerró y se archivó, la instantánea histórica NO se edita (correcto: es un registro de lo que ocurrió, no una vista en vivo) pero su presentación pública futura (si alguna vez se expone historial competitivo) deberá aplicar el mismo filtro de visibilidad en el momento de LEER el snapshot, no de escribirlo — decisión de presentación para Incremento 3, anotada aquí para no perderla.

### 10.12 Riesgos

1. **Costo de recálculo escala con el número de grupos activos** — mitigado por aislamiento de fallo por grupo (una transacción por grupo, sin bloqueo mutuo) y cadencia espaciada (15 min, no cada minuto).
2. **Staleness percibida por el estudiante** justo tras una actividad — mitigado por el requisito UX ya exigido por CUJ-16 (comunicar vigencia), no por reducir la cadencia a costa de escalabilidad.
3. **Fuga de privacidad si el borrado inmediato al pasar a `PRIVATE` falla** — mitigado por el recálculo periódico como red de seguridad (exposición acotada a un ciclo, nunca indefinida) + Decision Gate dedicado.
4. **Grammar de `promotionRule`/`demotionRule` mal definida** produce ascensos/descensos inconsistentes entre tiers — mitigado fijando UNA grammar V1 concreta en el ADR (top/bottom N%), no dejada abierta a interpretación libre por quien implemente.
5. **`contentHash` no determinista** (orden de iteración no fijo) generaría falsos positivos de "corrupción" al comparar instantáneas — mitigado exigiendo una serialización canónica ordenada por `rankPosition` antes de hashear.
6. **Bug en una pasada de recálculo sobrescribe datos correctos** (dado que `leaderboard_entry` se actualiza in place, no hay "versión anterior" que restaurar automáticamente) — mitigado manteniendo siempre disponible el recómputo administrativo interno (§10.6), y por el hecho de que la fuente (`league_point_ledger_entry`) nunca se toca, así que cualquier corrección es, en el peor caso, una repasada, nunca una pérdida de datos real.

### 10.13 Determinación de ADR

**Confirmado: Incremento 2 requiere ADR nuevo** (ya señalado en §6, ratificado aquí con el diseño completo). Redactado como **`docs/adr/0020-ranking-materializacion.md`**, con cinco precisiones obligatorias del Product Owner incorporadas: identidad autoritativa `season_league_participation` (no `public_profile`); la visibilidad nunca altera el cálculo competitivo (corrige §10.11); definición exacta y reconstruible de `tieBreakValue` con comportamiento de reversos; gramática `top/bottom N%` completamente formalizada (redondeo, mínimos, grupos incompletos, tiers extremos); `leaderboard_snapshot`/`leaderboard_snapshot_entry` con resultado completo y versiones de política congeladas. **Pendiente de aprobación final del ADR antes de implementar.**

### 10.14 Decision Gates propuestos (a confirmar antes de implementar)

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Reconstructibilidad completa | Borrar todas las filas `leaderboard_entry` de un grupo y forzar un recálculo produce exactamente el mismo resultado que antes de borrarlas (mismos `rankPosition`, mismo `metricValue`) — el ledger es la única fuente real. |
| 2 | Desempate determinista y estable | Dos participaciones con el mismo `metricValue` siempre producen el mismo orden relativo entre corridas repetidas del cálculo, sin importar el orden de iteración interno. |
| 3 | Exclusión desde el origen de perfiles no elegibles | Una `season_league_participation` cuyo perfil es `PRIVATE` o `lifecycleStatus != ACTIVE` nunca obtiene una fila `leaderboard_entry`, incluso con `leaguePoints > 0`. |
| 4 | Eliminación inmediata al perder elegibilidad | Cambiar `visibilityStatus` a `PRIVATE` elimina, en la misma transacción, cualquier `leaderboard_entry` preexistente de ese perfil — verificado leyendo la base inmediatamente después, sin esperar el siguiente ciclo del scheduler. |
| 5 | Red de seguridad periódica | Aunque se simule un fallo del mecanismo inmediato (insertando una fila `leaderboard_entry` de un perfil `PRIVATE` directamente), el siguiente recálculo del grupo la elimina igualmente. |
| 6 | Aislamiento de fallo por grupo | Un error forzado al recalcular un grupo no impide que otros grupos de la misma pasada se recalculen correctamente. |
| 7 | Atomicidad por grupo | Una lectura concurrente con un recálculo en curso nunca ve una mezcla de filas de dos `snapshotVersion` distintos dentro del MISMO grupo. |
| 8 | Sin recálculo bajo demanda expuesto | Ningún endpoint ni símbolo público permite a un cliente disparar un recálculo — verificación estática. |
| 9 | Snapshot final inmutable | Una fila `leaderboard_snapshot` con `snapshotType = FINAL` rechaza cualquier `UPDATE` (trigger) — una corrección crea una fila nueva con motivo registrado, nunca edita la existente. |
| 10 | `contentHash` determinista | Recalcular el hash sobre el mismo conjunto de filas (mismo contenido, distinto orden de iteración simulado) produce siempre el mismo valor. |
| 11 | Decisión de ascenso/descenso solo al cierre | `PROMOTED`/`DEMOTED`/`RETAINED` nunca se asigna mientras el grupo sigue `OPEN`/`FULL` — solo tras la transición a `LOCKED`. |
| 12 | Grammar de promoción/descenso aplicada correctamente | Con una distribución conocida de `rankPosition` y una regla `top N%/bottom N%` fija, las cuentas correctas (y solo esas) terminan `PROMOTED`/`DEMOTED`. |
| 13 | Recuperación directa por clave para "mi posición" | `leaderboard_entry` de una cuenta específica es recuperable en O(1) por `(groupId, publicProfileId)`, sin depender de la página en la que caería. |
| 14 | Paginación estable ante recálculo intermedio | Una página ya servida nunca cambia retroactivamente; una nueva página solicitada después de un recálculo puede reflejar datos más recientes (comportamiento aceptado, no un defecto) pero siempre con `calculatedAt`/`snapshotVersion` explícitos en la respuesta. |
| 15 | Frontera de dominio intacta | Verificación estática: ningún archivo nuevo de este incremento referencia `StudentResponse`/`CurriculumTopicProgress` ni repositorios de XP directamente (mismo criterio que Incremento 1, §14 de su gate). |

**Pendiente de confirmación del Product Owner antes de redactar el ADR-0020 y comenzar la implementación.**

### Evidencia de validación — Incremento 2 ("Ranking", 2026-08-05)

Implementado contra ADR-0020 (APPROVED), incorporando las cinco precisiones obligatorias del Product Owner: `leaderboard_definition`/`leaderboard_entry` (proyección materializada, identidad autoritativa `seasonLeagueParticipationId` -- `publicProfileId` siempre `null` en este incremento, resuelto en Incremento 3) + `leaderboard_snapshot`/`leaderboard_snapshot_entry` (instantánea inmutable, sin ninguna columna mutable -- migración `20260806011437_league_ranking_materialization`, con 2 nuevos triggers de bloqueo total + extensión del trigger de transición de `season_league_participation` para admitir `SEASON_ENDED -> {PROMOTED,DEMOTED,RETAINED}`). `LeaderboardCalculationService`/`LeaderboardCalculationScheduler` (cada 15 min, solo grupos `OPEN`/`FULL` de la temporada `ACTIVE`) y `LeaderboardFinalizationService`/`LeaderboardFinalizationScheduler` (cada minuto, cierra grupos `LOCKED` -- advisory lock namespace 22, distinto de 19/20/21).

**Corrección real encontrada al escribir el propio gate** (no un defecto de producción, sino de fixtures): mezclar inserciones directas vía `pg.query` (con objetos `Date` de JS) con lecturas vía Prisma para columnas `timestamp without time zone` introduce un desfase igual al offset de zona horaria del proceso (mismo artefacto ya documentado para columnas `@db.Date` en `verify-challenge-foundation-gate.ts`) -- corregido pasando siempre `.toISOString()` (string) como parámetro de consulta cruda, nunca el objeto `Date` directamente. Además, un empate de `tierOrder` entre corridas sucesivas de este mismo gate (sin higiene de `league_definition` entre ejecuciones) hacía que `findHighestActiveTier`/`findLowestActiveTier` pudieran devolver una fila de una corrida anterior -- corregido retirando toda `league_definition` `ACTIVE` al inicio del gate, mismo criterio de higiene ya usado en `verify-challenge-foundation-gate.ts`.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:league-ranking-gate` (nuevo -- 21 Decision Gates: 1,2,6,8,9,10,11,12,13,15 de la propuesta inicial + 16,17,18,19,20,21 exigidos por el Product Owner sobre ADR-0020, incluyendo tiers extremos y tope de solapamiento de la gramática) | **PASS** |
| `verify:league-season-foundation-gate` (Incremento 1, regresión) | PASS, sin regresión -- incluyó de nuevo una carrera SERIALIZABLE real capturada y reintentada en vivo |
| `tsc --noEmit` (backend) | PASS, sin errores |
| `eslint src` (backend) | PASS, sin advertencias |
| `node scripts/verify-block-iii-gate.mjs` (consolidado Bloque I+II+III, regresión) | **FAIL real, causa confirmada como ambiental -- ver nota abajo, no es una regresión de Incremento 2.** |

**Confirmado explícitamente fuera de Incremento 2**: sin endpoint HTTP, sin superficie móvil, sin resolución de `publicProfileId` (Incremento 3), sin recálculo bajo demanda del cliente.

**Nota de entorno, no de código -- fallo real en `verify-gamification-xp-grant-gate.ts` (Bloque I), confirmado NO relacionado con Incremento 2**: al correr el gate consolidado completo, `verify-gamification-xp-grant-gate.ts` falló de forma reproducible (verificado corriéndolo de forma aislada, dos veces). Diagnóstico confirmado, no supuesto:

1. `git diff` confirma CERO modificaciones en este incremento a `xp-grant.service.ts`, `xp-grant-attempt.repository.ts`, `xp-rule.repository.ts` ni al propio gate -- el fallo no puede originarse en código de Incremento 2.
2. Causa raíz real: `validated_gamification_activity` acumuló 474 filas "pendientes de otorgar" (sin `xp_ledger_entry` de tipo `OTORGAMIENTO`) tras una sesión de trabajo muy larga con decenas de corridas de gates de los cuatro bloques -- muy por encima de `GRANT_BATCH_SIZE = 100` que `findPendingGrant` procesa por ciclo, ordenado por `occurredAt ASC`. Las actividades de prueba más antiguas (de gates de Bloques I-III ejecutados horas antes) desplazan a las actividades recién creadas por `verify-gamification-xp-grant-gate.ts` fuera del lote de 100, que nunca llegan a evaluarse.
3. Limpieza aplicada: se eliminaron 411 + 352 filas huérfanas de `validated_gamification_activity` (sin ningún `xp_ledger_entry`/`league_point_ledger_entry` que las referencie) -- reduce el atasco de 474 a 122.
4. **Limitación real, no resuelta**: 101 de esas filas pendientes pertenecen a actividades referenciadas por `league_point_ledger_entry` de los propios gates de Incremento 1/2 (`verify-league-season-foundation-gate.ts`/`verify-league-ranking-gate.ts`) -- **no se pueden eliminar**: el trigger `enforce_league_point_ledger_entry_no_delete` (construido deliberadamente en Incremento 1 para garantizar inmutabilidad del ledger) bloquea el `DELETE`, correctamente. Estas 101 filas seguirán ocupando espacio en el lote de 100 de `findPendingGrant` de forma permanente, con `occurredAt` antiguos que las mantienen al frente del orden `ASC`.
5. **Clasificación**: fragilidad preexistente de `verify-gamification-xp-grant-gate.ts` (lote de tamaño fijo, sin exclusión de actividades de otros dominios que nunca tendrán regla de XP), expuesta por el volumen acumulado de esta sesión larga -- no un defecto de Incremento 2, no una regresión introducida hoy. Mismo criterio de clasificación ya usado en este proyecto para la saturación de `ThrottlerModule` (Bloque II) y la fragilidad temporal de `verify-gamification-progression-gate.ts` Gate 5 (enmienda de `BLOCK-II-CLOSURE-REPORT.md` §11).
6. **Pendiente de decisión del Product Owner**: si corresponde una corrección real a `findPendingGrant` (ej. excluir explícitamente actividades cuyo `activityType` nunca tendrá una `xp_rule`, o aumentar el lote) queda fuera del alcance de Incremento 2 -- no se toca `XpGrantService` (Bloque I, cerrado y gateado) sin autorización explícita.

Con esta causa raíz confirmada y ajena a Incremento 2, `tsc`/`eslint`/`verify:league-ranking-gate`/`verify:league-season-foundation-gate` (los cuatro directamente relevantes a este incremento) están en **PASS** real. El gate consolidado de bloque completo no se pudo confirmar en PASS en esta sesión por la razón ambiental documentada arriba.

**Adenda (2026-08-06) — punto 6 resuelto, commit independiente**: auditoría real contra Postgres (no supuesta) confirmó que las 101 filas no eran temporalmente pendientes, sino un caso genuino de starvation estructural: `findPendingGrant` ordenaba estrictamente por `occurredAt ASC` sin distinguir actividades nunca-resolubles (backoff vencido, siguen elegibles, pero ninguna regla llegará jamás a existir para su `activityType` de fixture) de actividades nuevas — reproducido exactamente contra el propio `verify-gamification-xp-grant-gate.ts`, cuya fixture quedaba con `attempts = NULL`, nunca tocada. Corregido ordenando por `attempts ASC NULLS FIRST, occurredAt ASC` (SQL crudo -- Prisma no expone `nulls` a través de una relación `orderBy`) en `ValidatedGamificationActivityRepository.findPendingGrant`. Verificado con 3 corridas consecutivas del gate contra el backlog real, sin resetear la base. Commit independiente `0b52122` (`fix(gamification)`, sin tag, Bloque I cerrado y gateado permanece intacto salvo esta corrección puntual).

Durante la regresión completa post-fix aparecieron además fallos en `title-equipment-gate`/`cosmetic-equipment-gate`/`challenge-claim-gate`/`gamification-progression-gate`/`public-profile-gate` (`Argument accountId is missing`) — auditados y confirmados como **rate limiting real** (`POST /auth/session`, NFR-SEC-007, 10 req/60s) disparado por ejecutar varios gates seguidos en poco tiempo, no un defecto de producto: los cinco gates comparten un `createSession()` que extraía `accountId` de una respuesta 429 sin comprobar el status. En aislamiento (fuera de la ventana de 60s) los cinco pasan limpio, incluido `public-profile-gate` (sus fixtures ya eran únicos por sufijo). `createSession()` se endureció en los cinco scripts para fallar explícito ante un status inesperado (commit `449d654`, `test(gamification)`), y se añadió una guarda de defensa en profundidad en `RewardEvaluationWorker.deliverBundleComponents` que rechaza un `accountId` ausente antes de tocar `reward_grant` (commit `15fcd30`, `fix(gamification)`, con check nuevo en `verify-reward-delivery-xp-bonus-gate.ts`).

## 11. Incremento 3 — Perfil competitivo de otro usuario: propuesta de diseño (auditoría completa, sin implementar todavía)

Mismo criterio que §10: solo auditoría y diseño en esta pasada. No se toca el esquema, no se implementa el endpoint, no se redacta el ADR hasta confirmación del Product Owner.

### 11.1 Auditoría documental — fuentes revisadas

- **Data Model §16.25 "Privacidad de rankings"**: el ranking usa exclusivamente `public_profile_id`. Lista blanca literal: *"username, avatar, título equipado, nivel o puntos aplicables, posición, liga"*. Lista negra explícita: nombre privado, correo, edad exacta, ubicación, materias débiles, puntajes diagnósticos, objetivos, historial de respuestas, estado Premium, configuración de accesibilidad.
- **§5 de este documento (Gate 4, ya fijado a nivel de bloque)**: *"nombre visible, avatar, título equipado, nivel, logros públicos, posición competitiva"* — añade **logros públicos**, ausente de la cita literal de §16.25. **Contradicción real, no cosmética** (ver §11.3.1).
- **Master Context §4.10**: *"el estado Premium no se muestra públicamente salvo cosmético equipado voluntariamente (ya cubierto por Bloque III)"* — exige que el **cosmético equipado** sea visible, un tercer campo tampoco mencionado en la cita literal de §16.25.
- **PRD PROFILE-006/007/008**: identidad pública limitada (mismo criterio que §16.25); sin comparaciones sobre inteligencia; el estudiante controla su visibilidad, con la opción más privada como predeterminada ante duda.
- **ADR-0018**: `visibilityStatus = PRIVATE` → perfil "no puede ser referenciado por `leaderboard_entry`" (decisión que ADR-0020 §1/§2 **corrigió** — ver §11.2). `lifecycleStatus = RETIRED` → excluido de "toda superficie pública" (esta parte de ADR-0018 sigue vigente sin cambios: RETIRED nunca es alcanzable desde una superficie pública nueva).
- **ADR-0020 §1/§2 (la corrección que redefine el problema de este incremento)**: la identidad autoritativa del cálculo de ranking es `season_league_participation`, **nunca** `public_profile`; la visibilidad del perfil **no debe alterar el cálculo competitivo bajo ninguna circunstancia**. Confirmado en el código ya commiteado: `SeasonLeagueParticipationRepository.findAllByGroupId` — *"TODAS las participaciones de un grupo, sin excepción [...] ningún filtro de visibilidad se aplica aquí ni en ningún punto de este repositorio"*. Esto **reemplaza** la lógica de "exclusión desde el origen" descrita en §10.11 de este documento (marcada ahí como corregida, conservada solo como registro auditable).
- **Código ya commiteado, `LeaderboardCalculationService.recalculateGroup`**: `publicProfileId` se escribe deliberadamente `null` en cada fila de `leaderboard_entry`, con una nota explícita en el propio código: resolverlo exige que GAMIFICATION consulte a USER, lo que crearía un ciclo de módulos (`UserModule` ya importa `GamificationModule` para `TitleEquipmentService`/`CosmeticEquipmentService`) — **diferido explícitamente a este incremento**.
- **Código ya commiteado, `PublicProfile`/`EquippedTitle`/`EquippedCosmetic`**: `equippedTitle`/`equippedCosmetics` cuelgan de `publicProfileId` (no de `accountId`) — coherente con exponerlos en una vista cross-cuenta que solo conoce `publicProfileId`.
- **Código ya commiteado, `AchievementDefinition.visibilityClass`** (`PUBLIC`/`PRIVATE`): mecanismo ya existente, sin usar todavía, para filtrar exactamente "logros públicos" — resuelve la contradicción de §11.3.1 sin necesitar un campo nuevo.

### 11.2 El problema central de este incremento (no estaba en el diseño original de §10)

§10.11 (versión original, corregida por ADR-0020) asumía que la privacidad **excluía** perfiles del cálculo — bajo ese modelo, toda fila de `leaderboard_entry` que existiera pertenecía, por construcción, a un perfil elegible para mostrarse. ADR-0020 invirtió esa decisión: **el ranking calcula sobre el 100% de las participaciones, sin importar visibilidad** (correcto para integridad competitiva — la posición de un estudiante no debe cambiar solo porque otro activó/desactivó su privacidad). La consecuencia directa, no resuelta por ningún documento hasta ahora: **`leaderboard_entry` contiene hoy filas de perfiles `PRIVATE` y `RETIRED` mezcladas con las de perfiles elegibles**, en la misma tabla, con posiciones reales y consecutivas.

Este incremento no puede limitarse a "resolver `publicProfileId`" — debe decidir explícitamente **qué hace el endpoint de lectura con una fila cuyo perfil no es presentable**, algo que ningún documento fuente (ni Data Model, ni Master Context, ni ADR-0018/0020) fija.

### 11.3 Vacíos reales identificados, pendientes de decisión del Product Owner

#### 11.3.1 Reconciliación de la lista blanca (§16.25 vs. §5 de este documento vs. Master Context §4.10)

**Propuesta**: la lista blanca real, efectiva, es la **unión** de las tres fuentes — ninguna es más autoritativa que otra (§16.25 es el Data Model general de "Privacidad de rankings", pero §4.10/Bloque III ya construyeron cosméticos específicamente para mostrarse en contextos como este, y el Gate 4 de este propio documento —ya redactado y aprobado a nivel de bloque— exige logros públicos). Campos propuestos, con su fuente de dato exacta:

| Campo expuesto | Fuente | Filtro aplicado |
|---|---|---|
| `username` | `PublicProfile.usernameNormalized` | Solo si `visibilityStatus = VISIBLE` y `lifecycleStatus = ACTIVE` — si no, perfil entero no presentable (§11.3.2) |
| `avatar` | `PublicProfile.avatarReference` | Igual que arriba |
| `título equipado` | `EquippedTitle` (vía `publicProfileId`) | Ya público por construcción (Bloque III, 3.b) — `null` si no hay ninguno equipado |
| `cosmético equipado` | `EquippedCosmetic[]` (vía `publicProfileId`) | Igual — refuerza Master Context §4.10, ausente de la cita literal de §16.25 pero exigido explícitamente en el mismo párrafo |
| `nivel` | `XpBalance.lifetimeXp` (vía `accountId`, resuelto a través de `PublicProfile.accountId`) → `LevelDefinition` | Mismo cálculo que `ProgressionService.getLevelProgress`, sin exponer `lifetimeXp` en crudo — solo `levelNumber` (Data Model dice "nivel **o** puntos aplicables", no ambos; se propone exponer solo nivel, más conservador) |
| `logros públicos` | `AchievementUnlock` (vía `accountId`) `JOIN AchievementDefinition WHERE visibilityClass = 'PUBLIC'` | Reutiliza un campo ya existente y sin usar — cero migración de esquema nueva |
| `posición competitiva` | `LeaderboardEntry.rankPosition`/`metricValue` (vía `publicProfileId`, una vez resuelto — §11.4) | Solo si el perfil es presentable (§11.3.2); la posición NUMÉRICA de otros nunca se recalcula por esto (§11.2) |
| `liga` | `LeagueDefinition` (vía `LeagueGroup` de la `SeasonLeagueParticipation`) | Sin filtro — el tier en sí no es información privada |

**Explícitamente en la lista negra** (ya fijada por §16.25, sin ambigüedad, ninguna fuente la contradice): nombre privado, correo, edad exacta, ubicación, materias débiles, puntajes diagnósticos, objetivos, historial de respuestas, estado Premium, configuración de accesibilidad, `lifetimeXp` en crudo, cualquier campo de `Account`/`AuthIdentity`.

#### 11.3.2 Qué hace el endpoint con una fila no presentable (el vacío central, §11.2)

Tres alternativas, ninguna fijada por ningún documento fuente:

| # | Alternativa | Evaluación |
|---|---|---|
| A | **Omitir la fila por completo** de la lista paginada (como si no existiera) | Preserva la privacidad, pero crea "huecos" de `rankPosition` visibles (posiciones 1, 2, 4, 6 sin el 3 ni el 5) — puede filtrar indirectamente CUÁNTOS estudiantes privados hay en el grupo, y contradice "posición competitiva" como campo de lista blanca (§16.25) para los perfiles vecinos, que verían un ranking con huecos inexplicados. |
| B | **Redactar la fila** (mostrar la posición numérica real, con identidad reemplazada por un marcador genérico, ej. `"Estudiante privado"`, sin avatar/título/nivel/logros) | Preserva la integridad de la tabla de posiciones completa (sin huecos, coherente con Master Context §7.20: *"Cada cálculo deberá conocer [...] estado de cierre"* — el cliente ve una tabla real, completa, consistente con el cálculo autoritativo del servidor) y no revela nada de la lista negra. Es la única alternativa consistente con la decisión ya tomada por ADR-0020 (el cálculo SIEMPRE incluye a todos) — omitir en la presentación después de haber calculado con todos sería reintroducir por la puerta trasera el modelo que ADR-0020 explícitamente rechazó. |
| C | **Redactar SOLO en "mi posición"/consultas directas, omitir en la lista paginada** | Inconsistente entre dos superficies del mismo dato — un estudiante vería una posición al consultar la suya y un hueco al pasar página hasta ahí. Ningún documento exige esta asimetría; se descarta por complejidad no justificada. |

**Propuesta: alternativa B** (redactar, nunca omitir) — consistente con la decisión ya vigente de ADR-0020 (el ranking es real y completo para todos, la privacidad controla identidad, nunca posición), y es la única que no reabre el mismo debate que ADR-0020 ya cerró. `RETIRED` recibe el mismo tratamiento que `PRIVATE` para esta decisión (ADR-0018: excluido de toda superficie pública) — la diferencia entre ambos estados es irrelevante para el endpoint de lectura, solo importa "presentable o no".

**Corolario de diseño**: el endpoint de lista NUNCA devuelve `publicProfileId`/ningún identificador estable de una fila redactada más allá de su posición — evita que el cliente pueda correlacionar una fila redactada entre dos peticiones y deducir permanencia/movimiento de un estudiante privado (fuga de información indirecta, no cubierta literalmente por §16.25 pero coherente con su espíritu).

#### 11.3.3 Resolución de `publicProfileId` sin ciclo de módulos

`GamificationModule` no puede importar `UserModule` (crearía el ciclo ya anticipado en el comentario del código de Incremento 2 — `UserModule` ya importa `GamificationModule`). Tres alternativas:

| # | Alternativa | Evaluación |
|---|---|---|
| A | `LeaderboardCalculationService` resuelve `publicProfileId` en tiempo de cálculo (cada 15 min), guardándolo en la fila | Reintroduce el ciclo que el propio Incremento 2 evitó deliberadamente — se descarta sin más análisis, ya fue evaluado y rechazado. |
| B | **Resolución en tiempo de lectura, en la capa de presentación de USER** (el endpoint nuevo vive en `UserModule`/`PublicProfileController`, no en `GamificationModule`) | Consistente con la arquitectura ya existente: `UserModule` ya depende de `GamificationModule` para leer `TitleEquipmentService`/`CosmeticEquipmentService` — este endpoint hace lo mismo, uniendo `LeaderboardEntryRepository`/`SeasonLeagueParticipationRepository` (ambos de GAMIFICATION, ya leídos hoy por USER a través de otros repositorios) contra `PublicProfileRepository` (de USER) **en la capa de presentación**, nunca dentro de GAMIFICATION. `accountId` es la clave de unión — ya presente en `SeasonLeagueParticipation.accountId` y en `PublicProfile.accountId`. |
| C | Vista SQL materializada o columna desnormalizada `publicProfileId` mantenida por un trigger cross-tabla | Introduce acoplamiento a nivel de base de datos entre dos bounded contexts que el propio proyecto ha mantenido separados en cada incremento anterior (GAMIFICATION nunca ha tocado tablas de USER ni viceversa vía trigger) — se descarta, no hay precedente ni necesidad de rendimiento demostrada. |

**Propuesta: alternativa B.** El nuevo endpoint (y su servicio) viven en `UserModule`, mismo patrón que `PublicProfileController` ya usa para exponer datos de GAMIFICATION (títulos/cosméticos equipados) sin que GAMIFICATION conozca a USER. La resolución es: `SeasonLeagueParticipation.accountId` → `PublicProfileRepository.findByAccountId` → filtrar presentable/no presentable (§11.3.2) → ensamblar la respuesta. `leaderboard_entry.publicProfileId` **permanece `null`** (la columna ya existe en el Data Model como parte de la proyección declarada, pero no se puede poblar sin el ciclo — se documenta como campo reservado, no usado en V1, mismo criterio que columnas grammar abiertas sin interpretar en otros incrementos).

### 11.4 Identidad y autorización del endpoint

- **Sin autenticación del sujeto, solo del solicitante** (§4.6, ya fijado): el endpoint requiere `AuthGuard` (sesión válida de QUIEN CONSULTA), pero no exige ninguna relación entre el solicitante y la cuenta consultada — mismo patrón ya usado para "título ajeno → 404" en `verify-title-equipment-gate.ts` Gate 14, ahora aplicado como diseño central en vez de un caso de rechazo aislado.
- **Identificador de entrada**: por `username` (no `accountId`/`publicProfileId`) — es el único identificador que un cliente (viniendo de una fila de ranking, que ya expone `username`) tendría de forma natural. Alternativa "por `publicProfileId`" se descarta como entrada primaria (expondría un UUID interno sin necesidad — el username ya es la identidad pública canónica, ADR-0018).
- **404 uniforme, nunca 403** (Gate 5, ya fijado en §5): perfil inexistente, `PRIVATE`, o `RETIRED` responden todos con el mismo 404 — nunca se filtra la existencia ni el motivo de inaccesibilidad (mismo criterio ya usado en 3.b/5.b).

### 11.5 Endpoint propuesto (forma, no contrato final)

```
GET /user/public-profile/:username/competitive-profile
```

Respuesta (lista blanca de §11.3.1, perfil presentable):

```
{
  username, avatar, equippedTitle, equippedCosmetics[],
  level, publicAchievements[],
  competitive: { leagueDefinitionKey, groupId, rankPosition, metricValue, calculatedAt, snapshotVersion }
}
```

Perfil inexistente/`PRIVATE`/`RETIRED` → 404 uniforme (§11.4). Perfil presentable pero **sin** participación de liga activa (nunca entró a Competir, o su temporada ya cerró) → `competitive: null`, el resto de la lista blanca sigue disponible (mismo criterio que "propiedad y presentación son capas separadas", ya usado en `equipTitle`/`equipCosmetic`).

**"Mi posición" (§10.10, capacidad ya garantizada por Incremento 2)**: se resuelve con el mismo mecanismo, `request.accountId` en vez de un `username` de otro — probablemente el mismo endpoint que ya expone "me" (`GET /user/public-profile` o un endpoint hermano), no duplicado aquí como decisión nueva.

### 11.6 Decision Gates propuestos (a confirmar antes de implementar)

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Lista blanca exacta | La respuesta expone EXACTAMENTE los campos de §11.3.1 — ningún campo de la lista negra alcanzable, verificado por inspección exhaustiva de las claves del JSON (mismo criterio que Gate 2 de `verify-public-profile-gate.ts`, ahora cruzando cuentas). |
| 2 | 404 uniforme sin filtrar motivo | Perfil inexistente, `PRIVATE` y `RETIRED` responden con el mismo status/cuerpo — indistinguibles entre sí desde fuera. |
| 3 | Redacción, nunca omisión (§11.3.2) | Un grupo con participantes `PRIVATE`/`RETIRED` mezclados con elegibles produce una lista de ranking SIN huecos de `rankPosition` — las filas no presentables aparecen redactadas, nunca ausentes. |
| 4 | Redacción sin identificador correlacionable | Una fila redactada no expone `publicProfileId`/`accountId`/ningún campo estable entre dos peticiones sucesivas al mismo endpoint. |
| 5 | El cálculo de ranking no cambia por privacidad | Cambiar `visibilityStatus` de una cuenta a `PRIVATE` NUNCA altera `rankPosition`/`metricValue` de las demás filas del mismo grupo (regresión directa sobre la garantía ya fijada por ADR-0020 §1/§2). |
| 6 | Sin dependencia circular de módulos | Verificación estática: ningún archivo de `src/gamification/` importa de `src/user/` (la resolución de `publicProfileId` vive exclusivamente en la capa de presentación de USER, §11.3.3). |
| 7 | Logros filtrados por `visibilityClass` | Un logro `PRIVATE` desbloqueado por la cuenta consultada nunca aparece en `publicAchievements`, incluso si está `ACTIVE`/desbloqueado. |
| 8 | Nivel expuesto sin `lifetimeXp` en crudo | La respuesta nunca contiene el campo `lifetimeXp`/ningún monto de XP — solo `level`/`levelNumber` derivado. |
| 9 | Sin identidad requerida más allá del solicitante | Llamar sin sesión → 401. Llamar con sesión válida sobre CUALQUIER `username` (propio o ajeno) → 200/404 según elegibilidad, nunca 403 (§4.6/§11.4). |
| 10 | Sin participación de liga no rompe el resto de la lista blanca | `competitive: null` con el resto de campos presentes, para un perfil elegible sin liga activa. |

### 11.7 Determinación de ADR

**Confirma lo ya señalado en §6/§4.6**: este incremento requiere ADR nuevo por ser el primer patrón de autorización cross-cuenta del proyecto — ninguna decisión de arquitectura previa lo cubre.

**Resuelto (2026-08-06)**: el Product Owner confirmó las tres decisiones de fondo (redactar, nunca omitir, únicamente dentro de una clasificación real — §11.3.2; lista blanca reconciliada — §11.3.1; resolución de identidad en la capa de presentación de USER, sin ciclo de módulos — §11.3.3). **Corrección obligatoria sobre la propuesta inicial de este documento**: la redacción NO se extiende a la consulta directa de un perfil individual — esa superficie mantiene el 404 uniforme ya fijado por el Gate 5 de §5 (`PRIVATE`/`RETIRED`/`ANONYMIZED`/inexistente, mismo código y cuerpo, sin excepción). La redacción aplica exclusivamente a filas dentro de una lista de ranking real, donde omitir dejaría un hueco de posición. **`docs/adr/0021-perfil-competitivo-cross-cuenta.md` — APROBADO (2026-08-06)**, con esta corrección incorporada, 12 Decision Gates (sustituyen y amplían los de §11.6). Implementación autorizada a continuación (ver plan incremental).

## 12. Incremento 4 — Pregunta rápida: auditoría documental (sin implementar)

Mismo criterio que §9/§10/§11: solo auditoría y diseño en esta pasada. No se toca el esquema, no se implementa nada.

### 12.1 Fuentes revisadas

- **Master Context §4.10** (recorrido canónico: *"Competir → Pregunta rápida → pregunta → respuesta → resultado validado → XP → continuación"*) y **CUJ-15** (Tier 1, integridad académica Tier 0): sin emparejamiento, sin depender de otro estudiante conectado, sin reutilizar preguntas activas de ensayos sin separación explícita, reintento de red no duplica intento ni XP, Premium no concede tiempo/dificultad/multiplicadores, la explicación nunca queda oculta por la recompensa.
- **PRD GAME-023 a GAME-026**: materia identificable, dificultad apropiada, tiempo opcional o controlado, resultado inmediato, explicación posterior, XP competitivo, registro del intento; preguntas de bancos aprobados y versionados; competencia asíncrona en V1 (Versus/emparejamiento explícitamente fuera del lanzamiento inicial); Premium sin ventajas competitivas.
- **Data Model §16.27 "Competencias dentro de Juego"**: entidades `competition_definition` (plantilla: `competitionType`, `participantMode`, `questionPolicyId`, `scoringRuleVersion`, `timeRuleVersion`, `matchmakingPolicyVersion`, `rewardPolicyVersion`) y `competition_instance` (ejecución concreta: definición+versión, temporada, participantes, preguntas materializadas, inicio/fin, estado, resultado, incidencias, integridad) — cierra con una nota literal: *"Las respuestas académicas continuarán utilizando el modelo del Bloque 11"* (PROGRESS).
- **Data Model §16.28 "Emparejamiento"**: `matchmaking_request` — **diferido explícitamente**, mismo criterio que Versus (§3 de este documento, DM-OQ047).
- **Data Model §16.29 "Resultado competitivo"**: `competition_result` (`placement`, `competitionScore`, `correctCount`, `responseTimeMetric`, `integrityStatus`, `resultStatus`, `supersedesResultId`) — *"El resultado competitivo no sustituye el resultado académico del intento."*

### 12.2 Hallazgo central — auditado contra el código real, no solo contra el Data Model

Se auditó si `StudentResponse` (PROGRESS, Bloque 11) es reutilizable literalmente para Pregunta rápida, dada la nota del Data Model citada arriba. **No lo es** — tres bloqueadores concretos, no interpretables:

1. **`@@unique([accountId, questionVersionId])` global** en `student_response` — una cuenta solo puede responder cada pregunta UNA vez, para siempre. Pregunta rápida necesita poder repetir preguntas entre rondas (o coincidir con una ya respondida en Estudio) sin chocar contra esa unicidad.
2. **Efecto colateral automático sobre `curriculum_topic_progress`**: `ProgressService.recordActivityAndMaybeComplete` crea/actualiza el progreso del tema y puede marcarlo `COMPLETED` en cada respuesta nueva. Una actividad explícitamente *"fuera de la estructura de Estudio"* (§8 de este documento) no puede disparar ese efecto sin corromper el seguimiento real de Estudio.
3. **Fila inmutable, sin dimensión de "intento"**: `student_response` no tiene ningún concepto de sesión/ronda repetible — es un registro académico permanente por pregunta, no un evento competitivo repetible.

**Conclusión**: Pregunta rápida necesita su **propia entidad de registro de intento** (alineada con `competition_instance`/`competition_result`, ya nombradas en Data Model) — nunca escribe en `student_response` ni en `curriculum_topic_progress`. La nota *"continuarán utilizando el modelo del Bloque 11"* se interpreta como: **reutiliza el mecanismo de corrección** (`QuestionVersion`/`AnswerOption`, ya en EDUCATION — la lógica de "¿esta opción es correcta?"), **no la tabla `student_response`**. Se marca como vacío a confirmar con el Product Owner antes de fijarlo en un ADR — no se asume en silencio, dado que contradice una lectura literal del Data Model.

### 12.3 Reutilización real ya disponible (sin trabajo nuevo en Bloque I)

Auditado contra el código, no supuesto:

- **`GamificationService.ingestPending`/`ingestOne` es genérico** — solo mira `eventKey`/`schemaVersion`/`payload` de `outbox_event`, sin ninguna suposición sobre qué endpoint lo publicó. Un evento nuevo con forma equivalente a `student_response_recorded` (mismo `accountId`, un id propio, `occurredAt`) alimenta `ValidatedGamificationActivity` sin tocar ese pipeline.
- **`XpGrantService`/`LeaguePointGrantService` ya escanean CUALQUIER `ValidatedGamificationActivity`** por `activityType` — un `activityType` nuevo (ej. `QUICK_QUESTION_ANSWERED`) con su propia `XpRule`/`LeaguePointRule` (mismo patrón "versión vigente en `occurredAt`" ya usado en todo el proyecto) basta para que el XP y los League Points fluyan **sin ningún código nuevo** en Bloque I ni en Incremento 1 de este bloque.
- **Patrón de idempotencia `operationId`** (`findByOperationId`, `@unique` en Postgres, P2002 resuelto por re-consulta) ya validado en PROGRESS — reutilizable tal cual para el intento de Pregunta rápida, mismo criterio "reintento de red no duplica" (CUJ-15).

### 12.4 Vacíos reales identificados, sin resolver en ningún documento fuente

1. **Selección de pregunta**: `QuestionVersionRepository` hoy solo tiene `findPublishedByTopicId` (una lista completa de un tema) y `findByIdWithQuestionStatus` (por id) — **ningún método de selección aleatoria/arbitraria existe**. Hay que decidir la política (¿aleatoria entre todas las publicadas? ¿el estudiante elige materia? ¿excluir preguntas ya usadas recientemente en Pregunta rápida por esa cuenta?).
2. **"No preguntas activas de ensayos sin separación" (GAME-024)**: auditado contra `schema.prisma` completo — **ningún concepto de "ensayo"/mock-exam existe hoy** en el esquema. La regla no tiene nada que excluir todavía. Clasificación propuesta: fuera de alcance real de este incremento (nada que construir), salvo que el Product Owner indique lo contrario.
3. **Timer** ("tiempo opcional o controlado", PRD): propuesta V1 mínima = sin timer, mismo criterio que `STREAK_PROTECTION` en Bloque III (deuda diferida documentada, no construida) — a confirmar.
4. **Forma de la entidad nueva**: ¿usar `competition_definition`/`competition_instance`/`competition_result` tal como ya están nombradas en Data Model (una fila de `competition_definition` para `"quick-question-v1"`, mismo patrón que `xp-core`/`league-ranking-v1`), con `matchmakingPolicyVersion` nulo/sin usar? Coincide con el precedente ya establecido en este bloque (construir solo lo pedido, columnas grammar abiertas sin interpretar) — recomendado, evita inventar una tabla paralela cuando el Data Model ya nombra la correcta.
5. **¿Aparece en el perfil competitivo de Incremento 3?** Ningún documento lo exige todavía — no se amplía la lista blanca de ADR-0021 sin instrucción explícita.

### 12.5 Dependencias

- **Bloque I (EDUCATION)**: `QuestionVersion`/`AnswerOption` ya construidos — reutiliza su lógica de corrección, no la amplía.
- **Bloque I (GAMIFICATION)**: pipeline `outbox_event` → `ValidatedGamificationActivity`, `XpGrantService`, patrón `operationId` — todos ya genéricos, se benefician sin cambios.
- **Bloque IV, Incremento 1**: `LeaguePointGrantService` — ya genérico, se beneficia automáticamente si la cuenta tiene participación activa.
- **No depende de Incremento 3** (perfil competitivo) salvo que se decida exponer el resultado ahí (vacío 5).

### 12.6 Decision Gates propuestos (borrador, a confirmar antes de implementar)

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Frontera con PROGRESS intacta | Ningún archivo de este incremento escribe en `student_response`/`curriculum_topic_progress` — verificación estática, mismo criterio que todos los incrementos anteriores. |
| 2 | Repetible sin chocar con Estudio | Responder la misma pregunta en Estudio y en Pregunta rápida (o dos veces en Pregunta rápida) nunca falla por la unicidad de `student_response` — entidad de intento completamente separada. |
| 3 | Reintento de red idempotente | Mismo `operationId` enviado dos veces no duplica intento ni XP/LP. |
| 4 | XP/LP automáticos, sin código nuevo en Bloque I/Incremento 1 | Una `XpRule`/`LeaguePointRule` nueva para el `activityType` de Pregunta rápida basta -- `XpGrantService`/`LeaguePointGrantService` no se modifican. |
| 5 | Sin emparejamiento | Ningún símbolo/tabla de `matchmaking_request` referenciado; sin espera de otro estudiante (CUJ-15, reglas 1-2). |
| 6 | Equidad Premium | Dos cuentas (una Premium) reciben la misma pregunta, el mismo tiempo, la misma dificultad (GAME-026). |
| 7 | Explicación nunca oculta | La respuesta HTTP/presentación siempre incluye la explicación, independiente de la recompensa obtenida. |

### 12.7 Determinación de ADR

Igual que Incremento 1 (Fundación de temporadas y ligas): por ahora, cada mecanismo identificado ya fue aprobado y validado en Bloques I/IV-1 (pipeline de outbox genérico, patrón `operationId`, `XpRule`/`LeaguePointRule` por `activityType`), aplicado a una entidad nueva. **No hay decisión de arquitectura nueva evidente todavía** — pendiente de confirmar en el diseño detallado si la relación `competition_result`/resultado académico (*"no sustituye el resultado académico del intento"* — una tabla de resultado competitivo paralela a un resultado académico ya existente en otro dominio) introduce un patrón genuinamente nuevo no visto en este proyecto. Se determina con el diseño detallado, no aquí.

**Resuelto (2026-08-06)** — el Product Owner aprobó la auditoría y confirmó los cinco vacíos de §12.4, ver §12.8. Diseño detallado en §13.


### 12.8 Decisiones confirmadas (2026-08-06)

El Product Owner aprobó la auditoría y confirmó, cerrando los cinco vacíos de §12.4:

1. **Entidades propias y mínimas** — `quick_question_session`/`quick_question_attempt` (o nombres equivalentes), **no** el framework genérico `competition_definition`/`competition_instance`/`competition_result` del Data Model. Corrige la propuesta de §12.4, punto 4 (que recomendaba usar las entidades genéricas) — decisión de fondo del Product Owner, no una ambigüedad que quedara sin resolver.
2. **Selección de pregunta server-side**, entre preguntas activas/elegibles (`editorialStatus = PUBLISHED`), **sin repetición dentro de una sesión**, y el cliente **nunca** elige `questionVersionId` arbitrariamente.
3. **Exclusión de preguntas de ensayos activos: `NO APLICA`** mientras el concepto de "ensayo" no exista en el esquema — confirma la clasificación propuesta en §12.4, punto 2, sin construir nada para una entidad inexistente.
4. **Timer estricto diferido** — solo se registran timestamps (`presentedAt`/`respondedAt`) para auditoría futura, sin lógica de límite de tiempo en V1.
5. **Corrección vía EDUCATION, cero escritura en PROGRESS** — confirma §12.2: nunca `student_response`, nunca `curriculum_topic_progress`.
6. **Una `ValidatedGamificationActivity` con resultado inequívoco** (`QUICK_QUESTION_ANSWERED`) por intento finalizado — XP/LP se resuelven exclusivamente por las reglas server-side ya existentes (`XpRule`/`LeaguePointRule`), sin código nuevo en `XpGrantService`/`LeaguePointGrantService`.
7. **Sin integración con el perfil competitivo (Incremento 3) todavía** — el resultado de Pregunta rápida solo impacta indirectamente vía League Points (si la cuenta participa en Liga), nunca se añade a la lista blanca de ADR-0021 en este incremento.

## 13. Incremento 4 — Pregunta rápida: diseño detallado y desglose incremental (sin implementar todavía)

Mismo criterio que Incrementos 1-3: propuesta de diseño completa, sin tocar el esquema hasta confirmación final del Product Owner sobre esta sección.

### 13.1 Modelo de datos propuesto

**`quick_question_session`** — una ronda de Pregunta rápida:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | UUID | — |
| `accountId` | UUID | sin FK a `Account`, mismo criterio que `ValidatedGamificationActivity`/`CurriculumTopicProgress` (ADR-0014) |
| `status` | enum (`ACTIVE`, `CLOSED`) | forward-only, trigger `enforce_quick_question_session_status_transition` -- mismo patrón que `AccountChallenge`/`LeagueGroup` |
| `currentQuestionVersionId` | UUID? | la pregunta actualmente presentada, sin responder todavía -- `NULL` si no hay ninguna pendiente. Vive en la sesión, no en una fila de intento a medio terminar -- evita un estado `PRESENTED` intermedio en `quick_question_attempt` |
| `currentPresentedAt` | DateTime? | timestamp de auditoría (decisión #4), no usado para ningún límite |
| `startedAt` | DateTime | — |
| `closedAt` | DateTime? | — |

**`quick_question_attempt`** — un intento finalizado (una pregunta ya respondida) dentro de una sesión:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | UUID | — |
| `sessionId` | UUID (FK) | — |
| `accountId` | UUID | denormalizado -- mismo criterio que `RewardGrant`/`XpLedgerEntry` (lectura directa sin join, no autoritativo por sí solo) |
| `questionVersionId` | UUID (FK a EDUCATION) | — |
| `answerOptionId` | UUID (FK a EDUCATION) | — |
| `isCorrect` | Boolean | resuelto por el servidor, nunca enviado por el cliente -- mismo criterio que `StudentResponse.isCorrect` (`ProgressService` es "la única autoridad") |
| `presentedAt` | DateTime | copiado de `session.currentPresentedAt` al finalizar -- timestamps de auditoría (decisión #4) |
| `respondedAt` | DateTime | — |
| `operationId` | UUID, `@unique` | idempotencia -- mismo patrón exacto que `StudentResponse.operationId` |
| `createdAt` | DateTime | — |

**Restricciones**:
- `@@unique([sessionId, questionVersionId])` -- **sin repetición dentro de una sesión** (decisión #2), a nivel de base de datos, no solo de lógica de aplicación.
- `@@unique([operationId])` -- idempotencia ante reintento de red (mismo mecanismo que `StudentResponse`).
- Trigger `enforce_quick_question_attempt_session_active` -- rechaza un `INSERT` en `quick_question_attempt` si `session.status != 'ACTIVE'` (**sesión cerrada no acepta nuevas respuestas**, defensa en profundidad -- la capa de aplicación ya lo valida antes, este trigger es el respaldo, mismo criterio que `enforce_league_group_capacity`).

**Repetible entre sesiones**: al no existir ninguna restricción de unicidad `(accountId, questionVersionId)` global (a diferencia de `student_response`), la misma pregunta puede aparecer en sesiones distintas de la misma cuenta -- diseño intencional (decisión de fondo §12.2), no un descuido.

### 13.2 Selección de pregunta -- servidor autoritativo

Nuevo método en `QuestionVersionRepository`:

```
findRandomEligible(excludeQuestionVersionIds: string[], limit = 1): Promise<QuestionVersion[]>
```

`WHERE editorialStatus = 'PUBLISHED' AND id NOT IN (excludeQuestionVersionIds) ORDER BY random() LIMIT :limit`. `excludeQuestionVersionIds` = todas las `questionVersionId` ya presentes en `quick_question_attempt` de la sesión actual (consulta directa por `sessionId`) -- refuerza a nivel de selección lo que el `@@unique([sessionId, questionVersionId])` ya refuerza a nivel de escritura (defensa en profundidad, mismo criterio que el resto del proyecto).

Sin filtro por materia/dificultad en V1 (no existe "dificultad" en el esquema hoy, confirmado en la auditoría de §12) -- cualquier pregunta `PUBLISHED` de cualquier tema es elegible. Selección por materia queda como extensión futura no bloqueante, sin construir en este incremento.

**El cliente nunca envía `questionVersionId`** (decisión #2): el endpoint que presenta la siguiente pregunta no lo acepta como parámetro; el endpoint que responde tampoco -- resuelve `session.currentQuestionVersionId` server-side. Un cliente que intentara enviarlo sería ignorado (el servicio nunca lo lee del body).

### 13.3 Corrección, publicación de actividad, cero escritura en PROGRESS

**Corrección (2026-08-06)** -- verificado contra el código real antes de implementar 4.a: `OutboxService.publish()` usa el cliente Prisma global (`OutboxEventRepository` recibe `PrismaService`, no un `Prisma.TransactionClient`) y es **best-effort por diseño**, documentado explícitamente en su propio docstring y en ADR-0006 §"Publicación best-effort" -- "publicar después de confirmar, nunca dentro de una transacción". No hay manera de que `publish()` participe en la misma transacción que otra escritura hoy, para ningún dominio. Este es el mismo patrón ya en producción en `ProgressService.recordResponse` (crea `StudentResponse`, luego, fuera de esa transacción, publica `student_response_recorded` best-effort) -- Pregunta rápida sigue exactamente ese precedente, sin extender `OutboxService` ni introducir entrega garantizada en este incremento.

`QuickQuestionService.submitAnswer(accountId, sessionId, answerOptionId, operationId)`:

1. Verifica idempotencia: `findByOperationId` -- reintento de red devuelve el mismo intento ya creado, sin duplicar (mismo patrón que `StudentResponse`).
2. Carga `session`, valida `status == 'ACTIVE'` y `currentQuestionVersionId != null` (si no hay pregunta pendiente, 409 -- el cliente debe pedir "siguiente pregunta" primero).
3. Carga `answerOption` vía EDUCATION (`AnswerOptionRepository`, ya existente) y valida que `answerOption.questionVersionId === session.currentQuestionVersionId` -- reutiliza el mecanismo de corrección de EDUCATION, **nunca** crea ni toca `student_response`/`curriculum_topic_progress` (decisión #5, Gate 5).
4. **En una transacción que cubre EXCLUSIVAMENTE las dos tablas propias de este incremento**: crea `quick_question_attempt` (con `isCorrect = answerOption.isCorrect`) y limpia `session.currentQuestionVersionId` (vuelve a `null`, lista para la siguiente). **Después de que esa transacción confirma** -- fuera de ella, best-effort -- publica `outbox.publish({ eventKey: 'quick_question_answered', ... })` (mismo `deduplicationKey` determinista que el resto del proyecto, ej. `quick-question:${attempt.id}`), igual que `ProgressService` publica `student_response_recorded` después de confirmar `StudentResponse`.
5. **Consecuencia aceptada, igual que ADR-0006/PROGRESS**: si el proceso cae exactamente entre el commit del paso 4 y el insert del outbox, el intento queda registrado (correcto, nunca se pierde ni se corrompe) pero ese evento puntual no se publica, sin reintento automático -- el mismo hueco conocido y aceptado que `student_response_recorded`. Un fallo de `publish()` (excepción atrapada dentro del propio `OutboxService`) tampoco revierte ni duplica el `quick_question_attempt` ya confirmado, ni dejan la sesión inconsistente: `currentQuestionVersionId` ya quedó en `null` dentro de la transacción que sí confirmó, independientemente de si el evento se publicó -- la sesión queda lista para pedir la siguiente pregunta en cualquier caso. Gate de evidencia obligatorio en 4.b (§13.5, Gate 7 revisado).
6. `GamificationService.ingestOne` (sin cambios, ya genérico) consume ese evento -- `activityTypeFor('quick_question_answered') = 'QUICK_QUESTION_ANSWERED'` (una línea nueva en el `switch`/mapa existente) -- crea `ValidatedGamificationActivity`.
7. `XpGrantScheduler`/`LeaguePointGrantScheduler` (sin cambios, ya genéricos) recogen esa actividad en su próximo ciclo -- **XP/LP solo si existe una `XpRule`/`LeaguePointRule` con `activityType = 'QUICK_QUESTION_ANSWERED'`** (decisión #6, dato de configuración, no código nuevo -- Gate 8).

### 13.4 Endpoints propuestos

```
POST /gamification/me/quick-question/sessions            -- abre una sesión ACTIVE
POST /gamification/me/quick-question/sessions/:id/next    -- servidor selecciona y devuelve la siguiente pregunta elegible
POST /gamification/me/quick-question/sessions/:id/answers -- responde la pregunta pendiente (answerOptionId + operationId)
POST /gamification/me/quick-question/sessions/:id/close   -- cierra la sesión (forward-only)
```

Respuesta de `/next`: pregunta + opciones (reutiliza la forma ya expuesta por EDUCATION para `GET /progress/topics/:topicId`, sin `isCorrect` de ninguna opción -- mismo criterio de no filtrar la respuesta correcta al cliente). Respuesta de `/answers`: `isCorrect`, `explanationContent` (recién ahí se revela -- GAME-023, "explicación posterior").

Todos exigen `AuthGuard`, operan sobre `request.accountId` -- mismo criterio que el resto del proyecto, ningún id de sesión ajeno es alcanzable (`sessionId` se valida contra `accountId` del solicitante, 404 si no coincide, mismo criterio "nunca filtra existencia" ya usado en 3.a-3.c).

### 13.5 Decision Gates refinados (sustituyen a los de §12.6)

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Repetible entre sesiones | La misma cuenta responde la MISMA pregunta en dos sesiones distintas -- ambos intentos se crean sin error. |
| 2 | Sin repetición dentro de una sesión | `findRandomEligible` nunca devuelve una pregunta ya usada en la sesión actual; un intento de `INSERT` directo violando `@@unique([sessionId, questionVersionId])` es rechazado por Postgres (defensa en profundidad). |
| 3 | Selección autoritativa del servidor | Ningún endpoint acepta `questionVersionId` del cliente -- verificación estática del DTO de entrada + funcional (enviar uno de todos modos no tiene efecto). |
| 4 | Corrección consistente con EDUCATION | `isCorrect` del intento coincide EXACTAMENTE con `AnswerOption.isCorrect` ya definido en EDUCATION -- nunca decidido de otra forma. |
| 5 | Cero escritura en PROGRESS | Ningún archivo de este incremento referencia `StudentResponse`/`CurriculumTopicProgress` -- verificación estática, mismo criterio que todos los incrementos anteriores. |
| 6 | Idempotencia del intento | Reenviar el mismo `operationId` no crea un segundo `quick_question_attempt` ni publica un segundo evento. |
| 7 | Publicación única, best-effort, POST-COMMIT (sin afirmar atomicidad) | Por cada `quick_question_attempt` existe EXACTAMENTE una `ValidatedGamificationActivity` con `activityType = QUICK_QUESTION_ANSWERED` -- nunca cero, nunca dos, en el camino normal. **Evidencia adicional obligatoria** (§13.3 punto 5): forzando un fallo en `OutboxService.publish()` tras confirmar la transacción, (a) el `quick_question_attempt` sigue existiendo, intacto, no se revierte; (b) no se crea un segundo intento ni se duplica ningún registro; (c) `session.currentQuestionVersionId` queda en `null` de todos modos (la sesión no queda inconsistente ni bloqueada) -- la ausencia del evento es el único efecto del fallo, nunca una escritura a medias. |
| 8 | XP/LP únicamente por reglas | Sin una `XpRule`/`LeaguePointRule` para `QUICK_QUESTION_ANSWERED`, la actividad queda `NO_ACTIVE_RULE`/`NOT_PARTICIPATING` (comportamiento genérico ya existente) -- ningún camino de código de este incremento otorga XP/LP directamente. |
| 9 | Sesión cerrada no acepta nuevas respuestas | Tras `close`, tanto `/next` como `/answers` responden con conflicto (409) -- verificado además a nivel de base de datos (trigger `enforce_quick_question_attempt_session_active`). |
| 10 | Frontera de dominio | Ningún archivo nuevo referencia `PublicProfile`/`LeaderboardEntry` directamente (Incremento 3 queda sin integrar, decisión #7). |

### 13.6 Desglose incremental propuesto

Mismo patrón que Bloque IV Incremento 3 (fundación → motor → endpoints, cada uno con su propio gate):

| # | Sub-incremento | Contenido | Gate |
|---|---|---|---|
| **4.a** | Fundación de persistencia | `quick_question_session`/`quick_question_attempt`, migración, triggers (`enforce_quick_question_session_status_transition`, `enforce_quick_question_attempt_session_active`), repositorios. Sin selección de preguntas, sin HTTP. | Gates 1, 2 (parcial, solo restricción de BD), 9 (parcial, solo trigger) |
| **4.b** | Motor de sesión | `QuickQuestionService` completo: `findRandomEligible`, `submitAnswer` (corrección + transacción + publicación de evento), `activityTypeFor('quick_question_answered')`. Sin HTTP todavía -- mismo criterio que 3.a (gate directo contra el servicio, sin servidor). | Gates 2 (completo), 3, 4, 5, 6, 7, 8 |
| **4.c** | Endpoints HTTP | Controller + contratos Zod + `sessions`/`next`/`answers`/`close`. Gate contra el servidor real, mismo criterio que 3.b/3.c. | Gate 9 (completo), 10, regresión de 1-8 vía HTTP |

Cada sub-incremento cierra con `tsc`/`eslint`/build + regresión de los gates ya existentes, mismo criterio que toda esta sesión.

**Pendiente de confirmación del Product Owner antes de comenzar 4.a** -- en particular, la forma exacta de las dos tablas (§13.1) y los cuatro endpoints (§13.4).
