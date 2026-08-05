# Bloque IV — Definición Formal: Competir

**Fecha**: 2026-08-05
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: IV de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-III-CLOSURE-REPORT.md`, `docs/adr/BLOCK-III-DEFINITION.md`, `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/PHASE-2-KICKOFF-INVENTORY.md`
**Estado**: Definición revisada (2ª pasada, 2026-08-05). Incremento 1 ("Fundación de temporadas y ligas") **implementado y gateado** (§9, ver Evidencia de validación) — cuatro precisiones obligatorias del Product Owner incorporadas y verificadas con gates de concurrencia real. Pendiente: Incrementos 2-5 (ranking, perfil competitivo cross-account, pregunta rápida, superficie móvil).

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
