# ADR 0020 — Materialización de Ranking (Bloque IV, Learning Experience Foundation)

- **Estado**: **Aprobada (2026-08-05) — pendiente de implementación.** Incorpora cinco precisiones obligatorias del Product Owner (2026-08-05) sobre la propuesta inicial de diseño (`LEF-BLOCK-IV-DEFINITION.md` §10): (1) identidad competitiva autoritativa es `season_league_participation`, no `public_profile`; (2) la visibilidad de perfil nunca altera el cálculo competitivo; (3) definición exacta y reconstruible del "momento de alcanzar el puntaje", incluyendo reversos; (4) formalización completa de la gramática de ascenso/descenso `top/bottom N%`; (5) `leaderboard_snapshot` conserva el resultado completo y las versiones de política aplicadas, no solo posición y LP. Sin código todavía.
- **Fecha**: 2026-08-05
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation, Bloque IV ("Competir"), Incremento 2 ("Ranking").
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context §11.9): Nivel 2 — introduce un mecanismo nuevo (proyección materializada con recálculo periódico + instantánea de cierre inmutable) que lee datos ya propiedad de GAMIFICATION (Incremento 1) y escribe entidades nuevas de este incremento, sin modificar ningún dominio ni componente ya cerrado y gateado.

## Alcance de este ADR (y lo que deliberadamente NO decide)

Por instrucción explícita del Product Owner, este ADR se limita **exclusivamente** al cálculo, materialización y cierre del ranking. Quedan fuera, tratados como entradas/salidas fijas que este ADR consume o produce sin rediseñarlos:

- **`league_point_ledger_entry`/`season_league_participation`/`league_group`/`game_season`** (Incremento 1, ya cerrado y gateado) — se **leen**, nunca se modifican salvo la transición ya prevista de `participationStatus` (extiende, no reabre, el enum que Incremento 1 dejó deliberadamente en `SEASON_ENDED`).
- **Endpoint público cross-cuenta y su lista blanca de presentación** — pertenece al Incremento 3 (`LEF-BLOCK-IV-DEFINITION.md` §4.6), con su propio ADR si corresponde. Este ADR decide qué existe en base de datos y cómo se calcula; no decide qué HTTP expone ni cómo se anonimiza en la respuesta.
- **Pregunta rápida y superficie móvil** (Incrementos 4/5) — sin relación con este ADR.
- **`gamification_integrity_signal`/`enforcement_action`** — diferido explícitamente desde la definición del bloque (`LEF-BLOCK-IV-DEFINITION.md` §3), no reabierto aquí.

## Contexto

`LEF-BLOCK-IV-DEFINITION.md` §10 (propuesta inicial, ya auditada contra Data Model §16.23–16.25/§16.41–16.42, Master Context §4.10/§5.20/§5.21/§7.20, PRD GAME-015–022/PROFILE-006–008, y ADR-0018) fijó ya las decisiones de fondo que este ADR formaliza en una implementación concreta: modelo híbrido (`leaderboard_entry` proyección viva + `leaderboard_snapshot` cierre inmutable), ámbito por grupo, worker periódico sin recálculo bajo demanda, cursor de paginación.

El Product Owner encontró, al revisar esa propuesta, **una corrección de fondo** (precisiones 1–2) y **tres vacíos de formalización** (precisiones 3–5) que este ADR resuelve antes de tocar el esquema.

## Decisión

### 1. Identidad autoritativa de la fila: `season_league_participation`, no `public_profile`

**Corrección obligatoria del Product Owner sobre el diseño inicial**: la propuesta de §10.11 usaba `visibility_status`/`lifecycle_status` del `public_profile` como filtro de **elegibilidad para el cálculo** — esto es incorrecto. La identidad competitiva real, ya establecida por Incremento 1, es `season_league_participation` (una fila por cuenta y temporada, con su `leaguePoints` ya acumulado con total independencia de si el estudiante tiene o no un `public_profile`, o si lo tiene oculto). El perfil público **controla exclusivamente presentación y visibilidad de cara a otros usuarios** — nunca debe ser una entrada del cálculo competitivo.

**Diseño corregido**:

- `leaderboard_entry.seasonLeagueParticipationId` (FK, `NOT NULL`, única por fila) es la clave primaria de identidad — el cálculo de `rankPosition`/`metricValue`/`tieBreakValue` opera exclusivamente sobre `season_league_participation`/`league_point_ledger_entry`, sin ninguna condición sobre `public_profile`.
- `leaderboard_entry.publicProfileId` se conserva como columna (ya nombrada por Data Model §16.23), pero es **nullable** y **puramente denormalizada para conveniencia de presentación** (resuelta de nuevo en cada pasada de recálculo, vía `PublicProfileRepository.findByAccountId(participation.accountId)`, `null` si el estudiante nunca creó perfil) — ningún camino de código la usa para decidir si una fila existe, qué valor tiene, o si un estudiante asciende/desciende.
- **Toda `season_league_participation` de un grupo obtiene una fila `leaderboard_entry` con un `rankPosition` real**, sin excepción, sin importar `visibility_status`/`lifecycle_status` del perfil asociado (o su ausencia).

### 2. La visibilidad de perfil nunca altera el cálculo competitivo — corrige el diseño inicial

**Corrección obligatoria del Product Owner**: la propuesta inicial (§10.11) diseñaba un "doble mecanismo" de borrado inmediato + red de seguridad periódica que **eliminaba** la fila `leaderboard_entry` de un perfil `PRIVATE`. Esto viola el principio recién fijado en §1 y además contradice PRD GAME-018 (*"El estudiante podrá ocultar o abandonar la clasificación pública sin perder acceso al estudio, progreso personal o funcionalidades académicas esenciales"* — "ocultar la clasificación **pública**", no dejar de competir realmente) y GAME-017 (*"Subir o bajar de liga no modificará el progreso académico ni bloqueará contenido educativo"*, aplicado en sentido inverso: ocultar el perfil tampoco debe modificar la posición competitiva real).

**Diseño corregido**: pasar `visibility_status` a `PRIVATE`, o `lifecycle_status` a distinto de `ACTIVE`, **no borra, no excluye, no recalcula distinto** la fila `leaderboard_entry` ni afecta en ningún grado el `rankPosition`/ascenso/descenso de esa cuenta ni de las demás. Lo único que cambia es la **presentación**: cuando el Incremento 3 exponga el ranking a otros usuarios, la fila de una cuenta no-`VISIBLE`/no-`ACTIVE` se **omite de la lista mostrada a terceros** (o se presenta con identidad anonimizada — decisión de presentación exacta reservada al diseño del Incremento 3, anotada aquí para no perderla), mientras que:

- La cuenta **misma**, al consultar su propia posición, siempre ve su fila real, completa, sin importar su visibilidad.
- El **cálculo** de a quién le corresponde ascender/descender/permanecer en ese grupo **incluye siempre** a todas las participaciones, visibles o no — un estudiante `PRIVATE` puede ascender de liga exactamente igual que uno `VISIBLE`; solo que otros usuarios no lo verán en la tabla mientras esté oculto.
- **Anonimización histórica** (cuenta cerrada/anonimizada, `lifecycle_status = ANONYMIZED`): `leaderboard_entry`/`leaderboard_snapshot_entry` (ver §5) **nunca almacenan directamente** `username`/`avatarReference`/ningún campo identificador propio del perfil — solo `seasonLeagueParticipationId` (transitivamente `accountId`) y, de forma denormalizada y no autoritativa, `publicProfileId`. Esto significa que la anonimización de un `public_profile` (que sí borra/reescribe sus propios campos identificadores, ADR-0018) **se refleja automáticamente** la próxima vez que alguien lea el ranking a través de ese `publicProfileId` — sin que este incremento necesite tocar ninguna fila de ranking cuando una cuenta se anonimiza. El histórico competitivo (rango, puntos, resultado de temporada) permanece intacto y correcto; solo la identidad exhibible cambia, y cambia en su propia fuente (`public_profile`), no en el ranking.

### 3. Definición exacta y reconstruible de "momento de alcanzar el puntaje" (`tieBreakValue`)

**Definición formal**:

```sql
tieBreakValue(participationId) :=
  SELECT occurred_at
  FROM league_point_ledger_entry
  WHERE season_league_participation_id = :participationId
  ORDER BY occurred_at DESC, id DESC
  LIMIT 1
```

Es decir: el `occurredAt` de la entrada del ledger **cronológicamente más reciente** de esa participación (`OTORGAMIENTO` o `REVERSO` indistintamente — ninguno se filtra), con `id` como desempate determinista para entradas con `occurredAt` idéntico (posible si varias actividades se procesan en el mismo lote del worker).

**Por qué esta definición y no "la primera vez que se alcanzó este total"**: el `metricValue` actual de una participación solo tiene el valor que tiene **por causa de** todas las entradas hasta la última — antes de esa última entrada, el total era distinto. El total "actual" se estableció, por definición, en el instante de la última entrada. Esta definición es (a) trivialmente reconstruible con una sola consulta sin mantener estado incremental alguno, (b) determinista sin importar el orden de ejecución del recálculo, y (c) evita la ambigüedad de la alternativa descartada ("primera vez que la suma acumulada alcanzó su valor actual"), que requeriría reproducir el historial completo de sumas parciales y podría no converger a un único instante cuando el total fluctúa de forma no monótona (ver Alternativas descartadas).

**Comportamiento con reversos, explícito**:

- Un `REVERSO` que sea la entrada más reciente de una participación **es** su `tieBreakValue` — el total "cambió por última vez" en ese instante, aunque haya bajado. Un estudiante cuyo total fue corregido a la baja no conserva el timestamp del otorgamiento original revertido.
- Si tras un `REVERSO` llega un nuevo `OTORGAMIENTO` legítimo que devuelve a la cuenta a un total igual o distinto, `tieBreakValue` se actualiza al `occurredAt` de ESE nuevo otorgamiento — el desempate siempre refleja el estado real más reciente, nunca un instante ya invalidado por una corrección.
- **Caso borde, participación sin ninguna entrada de ledger** (`metricValue = 0`, nunca otorgada ni revertida nada): `tieBreakValue := season_league_participation.joinedAt` — evita un `tieBreakValue NULL` que produciría un orden no determinista entre participantes en cero.

### 4. Formalización completa de la gramática `top/bottom N%`

**Formato de grammar** (almacenado tal cual en `LeagueDefinition.promotionRule`/`demotionRule`, columnas `String?` ya creadas en Incremento 1, sin migración de esquema adicional): `"top-percent:{N}"` / `"bottom-percent:{N}"`, `N` entero `1..100`. `null` = sin ascenso/descenso configurado para ese tier (todas las participaciones de ese tier siempre `RETAINED`).

**Constante nueva**: `MINIMUM_PARTICIPANTS_FOR_PROMOTION = 3` — un grupo con menos participantes que este mínimo **no calcula ascenso ni descenso en absoluto**: todas sus participaciones cierran `RETAINED`. Razón: competir de forma significativa exige un mínimo de rivales; por debajo de eso, la posición no es una señal confiable (gate "grupos pequeños" explícito, ver Validación).

**Algoritmo, aplicado sobre `G` = cantidad REAL de participaciones del grupo al cierre** (nunca la capacidad teórica — un grupo incompleto se evalúa por su tamaño real):

1. Si `G < MINIMUM_PARTICIPANTS_FOR_PROMOTION` → todas `RETAINED`, fin.
2. `promoteCount := max(1, floor(G × promotionPercent / 100))` si `promotionRule != null`, si no `0`.
3. `demoteCount := max(1, floor(G × demotionPercent / 100))` si `demotionRule != null`, si no `0`.
   - El `max(1, …)` evita que un porcentaje válido en un grupo pequeño redondee a cero y no ascienda/descienda a nadie a pesar de tener una zona configurada — una zona configurada con `N > 0` siempre mueve al menos a una persona si el grupo alcanza el mínimo del punto 1.
4. **Redondeo hacia abajo (`floor`)** deliberado en ambas zonas — evita que el redondeo hacia arriba empuje a más participantes de los previstos por el porcentaje nominal cuando este no divide exacto a `G`.
5. **Tope de solapamiento**: si `promoteCount + demoteCount > G` (posible con porcentajes altos en grupos pequeños), `demoteCount := max(0, G - promoteCount)` — la zona de ascenso tiene prioridad de asignación sobre la de descenso ante conflicto (es la zona de "recompensa"; nunca se deja a nadie sin evaluar ascenso por falta de espacio).
6. Ordenar las participaciones por `rankPosition ASC` (orden total estricto, ya garantizado por el desempate de §10.5 hasta `accountId` como última instancia — **nunca hay empates sin resolver en la frontera de zona**, por construcción).
7. `rankPosition ∈ [1, promoteCount]` → candidato a `PROMOTED`. `rankPosition ∈ [G - demoteCount + 1, G]` → candidato a `DEMOTED`. El resto → `RETAINED`.
8. **Tiers extremos**: si `LeagueDefinition.tierOrder` del grupo es el **máximo** entre los tiers `ACTIVE` (`LeagueDefinitionRepository.findHighestActiveTier()`, nuevo método análogo a `findLowestActiveTier()` ya existente) — todo candidato a `PROMOTED` se resuelve como `RETAINED` en su lugar (no hay tier superior). Simétricamente, si es el tier **mínimo** (`findLowestActiveTier()`, ya existente), todo candidato a `DEMOTED` se resuelve como `RETAINED`.

**Empates de frontera**: no existen por diseño — `rankPosition` es siempre una secuencia estricta `1..G` sin repeticiones (el desempate de §10.5, incluyendo `accountId` como última instancia, garantiza un orden total). No se necesita ninguna regla adicional para "qué pasa si el puesto N y N+1 empatan": nunca ocurre.

### 5. `leaderboard_snapshot`/`leaderboard_snapshot_entry`: resultado completo y versiones de política congeladas

**Corrección obligatoria del Product Owner**: la propuesta inicial limitaba el snapshot a los campos ya nombrados por Data Model §16.42 (`ruleVersion` único, sin desglosar, y sin tabla de detalle por participante). Se formaliza ahora con dos tablas:

**`leaderboard_snapshot`** (una fila por cierre de grupo, resumen + versiones):

| Columna | Tipo | Nota |
|---|---|---|
| `id` | UUID | — |
| `leagueGroupId` | UUID (FK) | grupo cerrado |
| `gameSeasonId` | UUID (FK) | denormalizado, evita join para listar por temporada |
| `leagueDefinitionId` | UUID (FK) | denormalizado |
| `snapshotType` | enum (`FINAL`, con `PERIODIC` reservado sin uso en V1) | V1 solo escribe `FINAL`, al cierre |
| `snapshotAt` | DateTime | instante del cálculo final |
| `tieBreakRuleVersion` | String | grammar aplicada en §10.5/§3 de este ADR, versionada |
| `promotionRuleVersion` | String | valor exacto de `LeagueDefinition.promotionRule` usado (ej. `"top-percent:20"`) |
| `demotionRuleVersion` | String | ídem para descenso |
| `rankingMetricVersion` | String | versión de la fórmula de `metricValue` (V1: `"sum-league-points-v1"`) |
| `participantCount` | Int | `G` real usado en el cálculo |
| `contentHash` | String | ver más abajo |
| `supersedesSnapshotId` | UUID? (FK a sí misma) | solo si esta fila corrige una anterior |
| `correctionReason` | String? | obligatorio si `supersedesSnapshotId != null` |
| `createdAt` | DateTime | — |

**`leaderboard_snapshot_entry`** (una fila por participación, inmutable, hija de `leaderboard_snapshot`):

| Columna | Tipo | Nota |
|---|---|---|
| `id` | UUID | — |
| `leaderboardSnapshotId` | UUID (FK) | — |
| `seasonLeagueParticipationId` | UUID (FK) | identidad autoritativa, §1 |
| `rankPosition` | Int | congelado |
| `metricValue` | Int | congelado |
| `tieBreakValue` | DateTime | congelado |
| `promotionOutcome` | enum (`PROMOTED`, `DEMOTED`, `RETAINED`) | resultado aplicado |

**Inmutabilidad sin ninguna columna de estado mutable**: a diferencia de la propuesta inicial (que consideraba un campo `status` `ACTIVE`/`SUPERSEDED` actualizable), se decide **no mutar ninguna fila jamás** — una corrección siempre es una fila `leaderboard_snapshot` **nueva**, con `supersedesSnapshotId` apuntando a la anterior. "Cuál es la vigente" se determina por consulta (`NOT EXISTS` de otra fila cuyo `supersedesSnapshotId` la referencie), nunca por un `UPDATE`. Esto extiende el mismo principio ya usado en los ledgers ("reverso, nunca edición") a la capa de instantáneas, sin necesitar ningún trigger de bloqueo de `UPDATE` distinto: simplemente **ningún código de este incremento expone un camino de escritura que no sea `INSERT`** sobre estas dos tablas — reforzado además por un trigger de bloqueo total de `UPDATE`/`DELETE` (mismo patrón que `xp_ledger_entry`), como defensa en profundidad.

**`contentHash`**: `SHA-256` sobre una serialización canónica y determinista de las filas `leaderboard_snapshot_entry` de esa instantánea, ordenadas por `rankPosition ASC` antes de serializar (nunca por orden de inserción o de iteración de la base) — mismo contenido siempre produce el mismo hash, sin importar el orden físico de las filas en disco.

### 6. Disparador del recálculo, ámbito, reconstrucción y paginación (confirma la propuesta inicial, sin cambios)

Se mantienen, sin modificación, las decisiones ya presentadas y no objetadas en `LEF-BLOCK-IV-DEFINITION.md` §10.4/§10.6/§10.7/§10.9:

- **Fuente de verdad**: `league_point_ledger_entry` (montos) + `season_league_participation`/`league_group` (identidad y agrupación) — `leaderboard_entry` nunca se escribe directo.
- **`leaderboard_entry` como proyección reconstruible**: se actualiza *in place* (`UPSERT` por `(leaderboardDefinitionId, groupId, seasonLeagueParticipationId)` — nota: la clave cambia de `publicProfileId` a `seasonLeagueParticipationId` por la corrección de §1), incrementando `snapshotVersion` en cada pasada exitosa. Reconstruir = re-ejecutar el mismo cálculo, nunca un camino de emergencia distinto.
- **Ámbito por grupo**: `leaderboard_entry.groupId = league_group.id` — ranking agregado por tier o temporada completa queda fuera de V1 (`leaderboard_definition.scopeRule` como grammar abierta para no cerrar la puerta a futuro).
- **Worker periódico, cadencia 15 minutos, sin recálculo bajo demanda del cliente**: `LeaderboardCalculationScheduler` (`@Cron`), alcance por ciclo = todo `league_group` con `status IN (OPEN, FULL)` de la temporada `ACTIVE`. Ningún endpoint ni símbolo público permite a un cliente disparar un recálculo (Gate 8, `LEF-BLOCK-IV-DEFINITION.md` §10.14).
- **Paginación**: cursor `(rankPosition ASC, id ASC)`, nunca offset — mismo criterio que `XpLedgerEntryRepository.findByAccountIdPaginated`. `leaderboard_entry` es recuperable en O(1) por `(groupId, seasonLeagueParticipationId)` para servir "mi posición" sin depender de la página (capacidad construida aquí; presentación exacta es diseño de Incremento 3).

### 7. Cierre de grupo: pipeline idempotente

Extiende `SeasonTransitionService` (Incremento 1) en el mismo paso donde un `league_group` transiciona a `LOCKED`, en una única transacción por grupo:

1. **Guarda de idempotencia**: si el grupo ya tiene un `leaderboard_snapshot` con `snapshotType = FINAL` y sin `supersedesSnapshotId` de una versión más nueva (es decir, ya existe una instantánea final vigente), la operación es un no-op — no se recalcula, no se duplica, no se vuelve a transicionar `participationStatus`. Esto cubre reintentos del scheduler (ej. un fallo de red tras confirmar la transacción pero antes de que el llamador reciba la respuesta).
2. Último recálculo de `leaderboard_entry` para ese grupo (datos ya congelados, el grupo dejó de acumular puntos al pasar a `LOCKED` en Incremento 1).
3. Aplicación de la gramática de ascenso/descenso (§4) sobre ese resultado.
4. Escritura de `leaderboard_snapshot` + sus `leaderboard_snapshot_entry` (§5) — inserción pura, sin editar nada preexistente.
5. Transición `season_league_participation.participationStatus`: `SEASON_ENDED → PROMOTED|DEMOTED|RETAINED` (extiende el enum de Incremento 1).
6. `league_group.status: LOCKED → FINALIZED`.

### 8. Aislamiento de fallo y frontera de dominio

Mismo criterio que `RewardEvaluationWorker` (ADR-0019) y `LeaguePointGrantService` (Incremento 1): un fallo al recalcular o cerrar UN grupo no bloquea ni retrasa a los demás — cada grupo se procesa en su propia transacción, con captura de error y continuación del lote. Ningún archivo de este incremento referencia `StudentResponse`/`CurriculumTopicProgress` ni repositorios de XP (`XpLedgerEntryRepository`/`XpBalanceRepository`) — verificación estática, mismo patrón que todos los incrementos anteriores.

## Alternativas descartadas

- **Filtrar por `visibility_status`/`lifecycle_status` en el cálculo del ranking** (diseño inicial, §10.11 de la propuesta) — descartada tras la corrección obligatoria del Product Owner: acoplaba presentación con competencia real, contradiciendo GAME-017/GAME-018 (ocultar el perfil no debe alterar el progreso competitivo real, solo su exhibición).
- **`tieBreakValue` = "primera vez que la suma acumulada alcanzó su valor actual"** — descartada: no reconstruible con una sola consulta (exige reproducir el historial completo de sumas parciales), y ambiguo cuando el total fluctúa de forma no monótona por reversos seguidos de nuevos otorgamientos parciales. La definición elegida ("última entrada cronológica") es una consulta directa y determinista por construcción.
- **Grammar de ascenso/descenso como número absoluto de posiciones** (en vez de porcentaje) — descartada: no escala con el tamaño real de un grupo (un grupo incompleto de 8 personas con "las primeras 10 ascienden" ascendería a todo el grupo, incluido el último lugar) — el porcentaje sobre `G` real ya resuelve esto sin una regla especial adicional para grupos incompletos.
- **Redondeo hacia arriba (`ceil`) en vez de `floor`** para `promoteCount`/`demoteCount` — descartada: movería sistemáticamente más participantes de los que el porcentaje nominal implica cuando no divide exacto, inflando ambas zonas de forma acumulativa entre temporadas.
- **Campo `status` mutable (`ACTIVE`/`SUPERSEDED`) en `leaderboard_snapshot`** — descartada tras revisar la coherencia con el resto del dominio: introduciría el único `UPDATE` de una tabla por lo demás puramente `INSERT`-only. Determinar la vigencia por ausencia de referencia entrante (`supersedesSnapshotId`) logra lo mismo sin ninguna mutación.
- **Recalcular `leaderboard_entry` bajo demanda cuando un cliente abre la pantalla de Liga** — descartada por instrucción explícita del Product Owner y por Master Context CUJ-16 ("el cliente no recalcula posiciones como autoridad") — permitiría a un cliente forzar carga arbitraria en el servidor con solo refrescar la pantalla repetidamente.
- **Snapshot único (sin tabla de detalle por participante)** — descartada tras la precisión obligatoria del Product Owner: no permite auditar ni reconstruir el resultado completo de una temporada cerrada sin volver a ejecutar el cálculo contra el ledger (que para una temporada archivada podría ya no reflejar fielmente el contexto de reglas vigente en ese momento, ya que `LeagueDefinition` puede reemplazarse por una fila nueva más adelante).

## Consecuencias

- Nuevas tablas: `leaderboard_entry`, `leaderboard_snapshot`, `leaderboard_snapshot_entry` — ninguna toca `league_point_ledger_entry`/`season_league_participation` salvo la transición ya prevista de `participationStatus` y un nuevo método de lectura (`findHighestActiveTier` en `LeagueDefinitionRepository`, análogo al ya existente `findLowestActiveTier`).
- `SeasonTransitionService` (Incremento 1) gana un paso adicional en su transacción de cierre de grupo — no se reabre ni se reescribe su lógica existente de cierre de temporada.
- `public_profile`/ADR-0018 no ganan ninguna responsabilidad nueva — su anonimización ya construida se refleja automáticamente en la presentación futura del ranking sin cambio alguno de su parte.
- El Incremento 3 (perfil competitivo cross-cuenta) hereda de este ADR: la clave de lectura por participación (`seasonLeagueParticipationId`), la garantía de que toda fila existe siempre (nunca hay que "adivinar" si un `PRIVATE` tiene o no fila), y la responsabilidad de filtrar/anonimizar en la respuesta HTTP, nunca en el cálculo.
- Este ADR **no** modifica PROGRESS, XP, Incremento 1 (temporadas/ligas/otorgamiento de LP), `public_profile`, ni diseña el endpoint cross-cuenta ni la superficie móvil.

## Validación

Pendiente — este ADR precede a la implementación. Decision Gates de `LEF-BLOCK-IV-DEFINITION.md` §10.14 que este ADR debe satisfacer con evidencia real (1–15), más los gates nuevos exigidos explícitamente por el Product Owner en esta revisión:

16. **Privacidad sin alteración competitiva** — dos participaciones idénticas en `league_point_ledger_entry`, una con perfil `VISIBLE` y otra `PRIVATE`, producen exactamente el mismo `rankPosition`/`metricValue`/`tieBreakValue`/resultado de ascenso-descenso. Cambiar la visibilidad de una a mitad de temporada no altera ningún valor calculado.
17. **Anonimización histórica sin tocar el ranking** — anonimizar una cuenta (`lifecycle_status → ANONYMIZED`) no modifica ninguna fila de `leaderboard_entry`/`leaderboard_snapshot_entry`; una lectura posterior a través de `publicProfileId` refleja el perfil ya anonimizado sin que este incremento haya escrito nada.
18. **Reversos afectan `tieBreakValue` correctamente** — una secuencia OTORGAMIENTO→REVERSO→OTORGAMIENTO produce un `tieBreakValue` igual al `occurredAt` del último OTORGAMIENTO, nunca del primero ni del reverso intermedio.
19. **Cierre idempotente** — invocar el cierre del mismo grupo dos veces (simulando un reintento del scheduler) produce exactamente un `leaderboard_snapshot`, sin duplicar `leaderboard_snapshot_entry`, sin transicionar `participationStatus` una segunda vez.
20. **Política congelada** — cambiar `LeagueDefinition.promotionRule` DESPUÉS de cerrar un grupo no altera el `promotionRuleVersion` ya escrito en su `leaderboard_snapshot`; un nuevo cierre (grupo distinto) sí usa la regla actualizada.
21. **Grupos pequeños** — un grupo con menos de `MINIMUM_PARTICIPANTS_FOR_PROMOTION` participantes cierra con el 100% de sus participaciones en `RETAINED`, sin excepción, incluso con `promotionRule`/`demotionRule` configuradas.

Ninguno ejecutado todavía — se ejecutarán como parte de la implementación de este incremento.
