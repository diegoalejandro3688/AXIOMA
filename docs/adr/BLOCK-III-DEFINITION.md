# Bloque III — Definición Formal: Gamificación Avanzada

**Fecha**: 2026-08-03
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: III de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-II-CLOSURE-REPORT.md`, `docs/adr/BLOCK-II-DEFINITION.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0018-public-profile-foundation.md`
**Estado**: Definición revisada (6ª pasada, 2026-08-05 — añade §4.18, superficie móvil). Incremento 4 (Desafíos) **completo**: sub-incrementos 4.a, 4.b, 4.c y 4.d **implementados y gateados** (4.a: commit `d476b63`; 4.b: commit `8dacc71`; 4.c/4.d: ver Evidencia de validación más abajo). Incremento 5 (Cosméticos, §4.15) sigue sin implementación.

---

## 1. Definición formal del bloque

El Bloque III extiende GAMIFICATION con reconocimiento de largo plazo derivado del esfuerzo real del estudiante: logros, títulos, desafíos y cosméticos — todo por **entrega directa** (logro/nivel/desafío otorga el ítem), sin economía comprable — decisión explícita del Product Owner (2026-08-03).

**Flujo aprobado**, único camino de recompensa de este bloque:

```
nivel | logro | desafío | hito académico  →  reward_bundle  →  entrega directa al inventario (título o cosmético)
```

"Hito académico" **no es una quinta fuente independiente**: es una categoría de logro (`achievement_definition.achievement_category`) — aclarado en §4.6 tras la auditoría, el Data Model no modela una entidad "milestone" separada.

Ningún otro camino de adquisición existe en este bloque — no hay compra, no hay moneda, no hay azar.

El bloque se compone de **cinco incrementos**:

1. **Entrega de recompensas** — mecanismo genérico (`reward_bundle`/`reward_grant`) que logros, niveles y desafíos comparten. Fija ahora la convención de clave de idempotencia por fuente (§4.4) y la política de snapshot (§4.5) — ambas resueltas en esta definición, no dejadas para el ADR.
2. **Logros** — `achievement_definition`/`version`/`progress`/`unlock`, evaluados sobre señales que GAMIFICATION ya produce (XP, nivel, racha). Progreso/desbloqueo referencian siempre `achievement_version_id` (§4.7).
3. **Títulos** — `title_definition`/`account_title`/`equipped_title`, otorgados como recompensa, equipables públicamente sobre `public_profile` (Bloque II). Propiedad y equipamiento son capas separadas con una invariante de sincronización explícita (§4.3).
4. **Desafíos** — `challenge_definition`/`account_challenge` (diario/semanal), con las reglas antifraude de Data Model §16.18 desglosadas en verificaciones concretas (§5, Incremento 4) — cierra el Decision Gate 8 que el Bloque I dejó pendiente.
5. **Cosméticos (entrega directa)** — `cosmetic_item`/`inventory_item`/`equipped_cosmetic`, modelo de slots **normalizado** (§4.8 — decisión tomada tras analizar probabilidad de expansión, no simplificado a un slot único). La relación `LevelDefinition.reward_bundle_id` (vacío encontrado en auditoría) se trasladó al sub-incremento 1.c — ver §4.1, nota histórica — este incremento entrega únicamente los títulos/cosméticos que ese bundle referencie, sin volver a tocar la columna.

## 2. Objetivo

Dar al estudiante reconocimiento visible y duradero de su esfuerzo — logros desbloqueados, títulos, insignias y desafíos superados — sin que ninguna recompensa dependa de otro estudiante, de dinero real, o de azar. Toda recompensa debe derivar de actividad académica ya validada por GAMIFICATION (Bloque I) o de participación en un desafío con reglas explícitas — nunca de una compra ni de un sorteo (Data Model §16.36).

Este bloque **no** introduce competencia entre estudiantes (Bloque IV) ni una vista consolidada de perfil (Bloque V) — solo la capacidad de ganar y mostrar reconocimiento individual.

## 3. Alcance y exclusiones

### Dentro de alcance

| Capacidad | Entidades (Data Model §16) | Incremento |
|---|---|---|
| Entrega genérica de recompensas (snapshot, idempotente) | `reward_bundle`, `reward_bundle_item`, `reward_grant`, `reward_grant_component` | 1 |
| Logros (versionados) | `achievement_definition`, `achievement_version`, `achievement_progress`, `achievement_unlock` | 2 |
| Títulos (propiedad + equipamiento separados) | `title_definition`, `account_title`, `equipped_title` | 3 |
| Desafíos (definición inmutable por fila, antifraude real) | `challenge_definition`, `account_challenge` | 4 |
| Cosméticos por entrega directa (slots normalizados, múltiples simultáneos) | `cosmetic_item`, `inventory_item`, `equipped_cosmetic` | 5 |
| Niveles como fuente de recompensa | `LevelDefinition.reward_bundle_id` (extensión aditiva sobre el Bloque II) | 1 (sub-incremento 1.c) |
| Worker de evaluación (logros/desafíos), aislado del `XpGrantService` cerrado | Nuevo componente, sin tabla propia adicional a las de arriba | 1–4 |

### Fuera de alcance (explícito)

- **Economía comprable** — decisión explícita del Product Owner (2026-08-03):
  - `virtual_currency_definition`/`ledger`/`balance` (moneda virtual, en cualquier forma).
  - Tienda (cualquier superficie de navegación/compra de cosméticos).
  - `cosmetic_offer` (ofertas, precios).
  - Precios de cualquier tipo sobre cosméticos, títulos o insignias.
  - Compras — de cualquier tipo, con cualquier medio.
  - Rotaciones comerciales (catálogos rotativos, temporales o promocionales).
  - Cualquier forma de compra de ventaja competitiva.

  Diferida hasta que exista una necesidad de producto demostrada, sujeta a su propia decisión formal cuando llegue ese momento.
- Ligas, temporadas, rankings, competencias, emparejamiento (Bloque IV).
- Perfil Avanzado (estadísticas, historial competitivo, vista consolidada — Bloque V).
- Interacción con Premium/Suscripciones — el dominio SUBSCRIPTION no existe todavía.
- Rankings entre instituciones — "idea futura" incluso en el propio Data Model.
- UI/mobile — mismo criterio que el Bloque I (backend primero), salvo indicación contraria al autorizar la implementación.
- Modificación de `XpGrantService`, `ProgressionService` o cualquier código ya cerrado y gateado de los Bloques I–II — este bloque **consume** sus datos mediante un componente nuevo (el worker de evaluación, §4.9), nunca modificando el existente.

## 4. Contradicciones y vacíos documentales

### 4.1 Vacío propio: `LevelDefinition` sin `reward_bundle_id`

El Bloque II construyó `LevelDefinition` como escalera mínima, omitiendo `reward_bundle_id` (Data Model §16.11) por no ser necesario entonces. **Resuelto en el sub-incremento 1.c** (corregido — ver nota histórica abajo): columna nullable, migración aditiva, sin tocar `verify:gamification-progression-gate` (debe seguir en PASS sin modificarse).

**Nota histórica (corrección de secuenciación, 2026-08-04):** las revisiones previas de este documento asignaban esta columna al Incremento 5, junto con cosméticos/slots. Al autorizar la implementación del sub-incremento 1.c ("Entrega de XP_BONUS y convergencia" — primer camino real de entrega dentro del Incremento 1), se detectó que 1.c no puede demostrar el ciclo completo `nivel alcanzado → reward_bundle → XP_BONUS → nuevo XP → reevaluación` sin que `LevelDefinition` ya tenga con qué `reward_bundle` asociarse: 1.c es el primer consumidor real de esa relación, no el Incremento 5 (que solo entrega títulos/cosméticos usando la relación, no la crea). Se traslada la migración de la columna a 1.c; el Incremento 5 conserva únicamente la entrega de títulos/cosméticos vinculados a niveles (componentes `TITLE`/`COSMETIC` de un `reward_bundle` ya asociado a un nivel desde 1.c), sin volver a tocar `LevelDefinition`. El Gate 25 se traslada junto con la columna — ver §5, tabla del Incremento 1.

### 4.2 Decisión de alcance ya resuelta: entrega directa, no economía comprable

Ver §3. Bifurcación de diseño legítima que el Data Model deja abierta — documentada con fecha para trazabilidad, no un error documental.

### 4.3 Propiedad y equipamiento son capas separadas con una invariante de sincronización obligatoria

**Hallazgo de la auditoría crítica**: el Data Model separa correctamente propiedad (`account_title`, `inventory_item` — nivel `account_id`, existe aunque el estudiante nunca haya entrado a Competir) de presentación (`equipped_title`, `equipped_cosmetic` — nivel `public_profile_id`, exige Gate 8/ADR-0018). Pero ninguna versión previa de este documento fijaba qué ocurre cuando el ítem equipado deja de estar activo — y no es hipotético: Data Model modela revocación real (`account_title` tiene fecha de revocación; §20.31 modela moderación que "retira un cosmético impropio").

**Regla fijada ahora**: revocar la propiedad de un ítem equipado debe des-equiparlo **atómicamente**, en la misma operación — nunca debe quedar un `equipped_title`/`equipped_cosmetic` apuntando a un ítem ya no poseído o inactivo. Ver Decision Gate 1 (§5).

### 4.4 Convención de clave de idempotencia por fuente de recompensa

**Vacío real, el de mayor impacto**: sin una convención explícita, no hay forma de verificar el Decision Gate de idempotencia de forma consistente entre las cuatro fuentes. Se fija ahora:

```
reward_grant.idempotencyKey = reward:{sourceEntityType}:{sourceEntityId}
```

| Fuente | `sourceEntityType` | `sourceEntityId` | Nota |
|---|---|---|---|
| Logro | `ACHIEVEMENT_UNLOCK` | `achievement_unlock.id` | Incluye `unlock_instance` para logros repetibles — cada instancia es una fila distinta, con id propio. |
| Desafío | `CHALLENGE_CLAIM` | `account_challenge.id` | Transición terminal (`claimed`) sobre una fila única por (cuenta, desafío). |
| Nivel | `LEVEL` | `{accountId}:{levelNumber}` | Clave compuesta determinista — **no requiere revivir `account_level_history`** (Bloque II). El propio `reward_grant` es el registro de verdad de "esta cuenta ya recibió la recompensa del nivel N". Si el XP baja por un reverso y vuelve a cruzar el umbral, la clave ya existe → no se duplica ni se re-otorga; tampoco se revoca lo ya entregado (mismo principio no punitivo que rachas). |
| Hito académico | `ACHIEVEMENT_UNLOCK` | igual que Logro | Es una categoría de logro (ver §4.6), no una fuente propia — misma clave. |

### 4.5 Conservación histórica: `reward_grant_component` debe ser snapshot, no referencia viva

**Vacío real**: a diferencia de `xp_rule` (vive bajo una versión de programa inmutable por convención) o `achievement_version` (versionado real), **`reward_bundle`/`reward_bundle_item` no tiene ningún campo de versión en el Data Model** — nada impide editarlo en el sitio. Si `reward_grant_component` solo guardara una referencia (FK) y consultara el contenido en vivo, el Decision Gate de inmutabilidad de lo entregado sería imposible de cumplir.

**Regla fijada ahora**: `reward_grant_component` almacena un **snapshot desnormalizado** en el momento de la entrega — tipo de componente, cantidad, y referencia estable a la entidad concreta ya entregada (`cosmetic_item_id`/`title_definition_id`/monto de XP) — nunca una proyección que dependa de que `reward_bundle_item` no cambie después. Editar o retirar un `reward_bundle` nunca altera ni revoca un `reward_grant` ya emitido.

### 4.6 "Hito académico" aclarado: categoría de logro, no fuente independiente

El Data Model no modela una entidad "milestone" separada — lo más cercano es `achievement_definition.achievement_category`. Un "hito académico" es, en este bloque, un logro cuya categoría lo distingue (p. ej. completar la primera unidad, alcanzar cierto dominio) — usa exactamente el mismo mecanismo de definición/versión/progreso/desbloqueo que cualquier otro logro, sin entidad ni tabla adicional.

### 4.7 Logros: progreso y desbloqueo referencian siempre `achievement_version_id`

Data Model ya modela `achievement_version` correctamente (con `unlock_rule`, `effective_from`/`until`, `approval_status` — mismo patrón que `xp_rule`/`gamification_program_version`). Se fija explícitamente que `achievement_progress`/`achievement_unlock` referencian **`achievement_version_id`** como única autoridad semántica para evaluar reglas e interpretar progreso — así, una versión nueva del criterio no reinterpreta progreso ya evaluado bajo la versión anterior. Ver Decision Gate 11 (§5) — la referencia previa a "Decision Gate 8" era un cruce erróneo (Gate 8 es sobre `LEVEL`, sin relación con logros); corregido en esta revisión.

**Excepción controlada (2026-08-04, auditoría previa a 2.a):** el Data Model no incluye `achievement_definition_id` en `achievement_progress`, lo cual impide expresar con un `UNIQUE` de Postgres la invariante real de este mecanismo — una fila de progreso por (cuenta, logro), para siempre, sin importar cuántas versiones se aprueben después. Se añade `achievement_definition_id` a `achievement_progress` y a `achievement_unlock` **exclusivamente como columna denormalizada para integridad/unicidad** — nunca como autoridad para evaluar reglas ni interpretar progreso, que sigue siendo `achievement_version_id` en exclusiva. Esto no contradice el espíritu de esta sección (ninguna versión nueva reinterpreta progreso existente), solo reconoce que el Data Model, tal como lista los atributos, dejaba esa invariante sin respaldo estructural.

Diseño aprobado:
- `achievement_progress`: `UNIQUE(account_id, achievement_definition_id)` — una sola fila de progreso por logro y cuenta, para siempre.
- `achievement_unlock`: `UNIQUE(account_id, achievement_definition_id, unlock_instance)` — `unlock_instance` comienza en 1; logros únicos siempre usan la instancia 1, los repetibles incrementan.
- Garantía compuesta: `achievement_version_id` debe pertenecer al `achievement_definition_id` de la misma fila (verificable — la versión referenciada nunca es de un logro distinto al denormalizado).
- `achievement_definition`/`achievement_version` quedan inmutables después de creadas (mismo criterio que `reward_bundle`/`level_definition`: sin `update()` expuesto).
- Una versión nueva de un logro nunca migra ni reinterpreta progreso ya existente bajo una versión anterior (sin cambio respecto a la regla original de esta sección).

### 4.8 Desafíos: `challenge_definition` es inmutable por fila, sin campo de versión propio

**Vacío real**: a diferencia de logros, `challenge_definition` no tiene entidad de versión en el Data Model — solo `starts_at`/`ends_at` fijos en la propia definición. Sin una regla explícita, no está claro si un desafío recurrente ("diario") reutiliza la misma fila con ventanas actualizadas (riesgo: reinterpretar criterios de estudiantes con `account_challenge` en progreso) o genera una fila nueva cada vez.

**Regla fijada ahora**: `challenge_definition` **nunca se edita en el sitio** una vez que existe algún `account_challenge` que la referencia. Un desafío recurrente o con criterio actualizado es siempre una **fila nueva** (mismo `challenge_key`, id distinto, ventana `starts_at`/`ends_at` propia) — mismo principio de inmutabilidad que el resto del dominio, sin necesitar una entidad de versión adicional.

### 4.9 Aislamiento y reintentos del worker de evaluación

**Vacío**: la definición previa mencionaba de pasada "un worker propio, mismo patrón que `XpGrantScheduler`" sin fijar sus propias garantías. Se fija ahora, como prerrequisito de diseño para ADR-0019 (no como su contenido — el ADR resuelve la implementación exacta, esta definición fija las garantías que debe cumplir):

- Un fallo evaluando una cuenta no detiene el lote completo (mismo patrón que `GamificationRelayWorker`/`XpGrantService`).
- Correr el worker completo dos veces seguidas produce el mismo resultado (idempotencia de lote, no solo de cada `reward_grant` individual).
- El worker nunca lee `StudentResponse`/`CurriculumTopicProgress` directamente — solo tablas ya propiedad de GAMIFICATION (Bloque I/II) y las nuevas de este bloque.
- El worker es un componente **nuevo**, no una modificación de `XpGrantService` (ya cerrado y gateado en el Bloque I).

### 4.10 Modelo de equipamiento: slots normalizados, no columnas en `public_profile`

**Análisis pedido antes de fijar esto**: ¿hay probabilidad razonable de que el producto necesite múltiples slots de equipamiento simultáneos? Evidencia a favor de sí, encontrada en el propio Data Model, no especulada:

- `cosmetic_item.item_type` ya enumera explícitamente cinco tipos de slot distintos: *"Avatar, marco, banner, título, insignia u otro"* (§16.33) — no es una categoría única, es una lista abierta ya modelada como tal.
- `equipped_cosmetic.cosmetic_slot` es un campo propio en el Data Model (§16.35) — el slot ya es un concepto de primera clase, pensado para que una cuenta pueda tener **varias filas simultáneas** (una por slot: avatar equipado + marco equipado + banner equipado, todos a la vez), no una única fila.
- La visión del Bloque V (Perfil Avanzado, Kickoff §5.2) describe el perfil mostrando "títulos obtenidos, logros, insignias y elementos visuales asociados al desempeño académico" en conjunto — varios elementos visuales simultáneos, no uno solo alternando.

**Decisión**: se mantiene el modelo **normalizado** del Data Model — `equipped_cosmetic` como tabla propia con `cosmetic_slot`, permitiendo una fila por slot por perfil (múltiples simultáneas), en vez de columnas fijas en `public_profile`. No se adopta la simplificación propuesta en la auditoría anterior.

**Ajuste sobre el vacío de ciclo de vida que motivó la pregunta** (qué ocurre al retirar/anonimizar un `public_profile`): se resuelve sin denormalizar, extendiendo el mismo mecanismo de coordinación ya construido en ADR-0018 —
- Al **retirar** (`RETIRED`): `equipped_title`/`equipped_cosmetic` no se borran, pero quedan excluidas de toda superficie pública porque ya dependen de que `public_profile.visibilityStatus = VISIBLE` **y** `lifecycleStatus = ACTIVE` para mostrarse — un perfil `RETIRED` nunca cumple esa condición (mismo mecanismo que ya oculta el resto del perfil).
- Al **anonimizar** (`ANONYMIZED`, terminal): `UserService.anonymizePublicProfileForAccountClosure` (ya existente, Bloque II) se extiende para también limpiar (`DELETE`) las filas de `equipped_title`/`equipped_cosmetic` de ese perfil, en la misma transacción — mismo criterio que ya aplica a `avatarReference`. La propiedad (`account_title`/`inventory_item`) no se toca — solo la presentación pública, igual que el resto de ADR-0018.

Ver Decision Gate 15 (§5).

### 4.11 Sin preguntas abiertas documentales (DM-OQ) para este alcance

Revisado el listado completo de Data Model (DM-OQ001–054): ninguna pregunta abierta cae sobre logros, títulos, desafíos o cosméticos.

### 4.12 Desafíos: mecanismo real de tope diario (`daily_cap`), no una declaración cualitativa (2026-08-04)

**Vacío cerrado por decisión del Product Owner**: el Gate 21 original (§5) declaraba el tope de repetición "por construcción", sin mecanismo. Se fija ahora un mecanismo concreto, distinto en forma del `dailyCap` de `xp_rule` (Bloque I) aunque inspirado en él — divergencia deliberada, justificada abajo.

**Esquema**:

```
challenge_definition.daily_cap  Int?   -- null = sin tope adicional
account_challenge_daily_progress
  - id
  - account_challenge_id
  - local_date
  - contribution_count
  - created_at
  - updated_at
  UNIQUE(account_challenge_id, local_date)
```

**Semántica de `daily_cap`**: tope sobre cuántas contribuciones válidas de progreso puede aportar un mismo día calendario — nunca sobre cuántas veces el estudiante puede realizar la actividad. `null` = sin tope; `N` = como máximo `N` contribuciones ese día, sin importar cuántos eventos elegibles ocurran.

**Por qué diverge del `dailyCap` de `xp_rule` (Bloque I)**: ese mecanismo sólo suma montos de XP ya otorgados dentro de un rango UTC del día (`utcDayRange`, ver `xp-grant.service.ts`) — no necesita una fila propia porque el ledger ya es la fuente de verdad y el rango es fijo. Un desafío semanal necesita, en cambio, (a) el día calendario **UTC** del evento — igual convención que `xp_rule`/racha, ver corrección de (b) más abajo — y (b) un contador explícito por fecha, porque las contribuciones de un desafío no son montos de un ledger existente que puedan sumarse retroactivamente, son eventos discretos de progreso acumulados a lo largo de un período de varios días. Se documenta la divergencia para que no se lea como inconsistencia entre incrementos.

**Corrección (§4.16, 2026-08-05)**: la redacción original de este párrafo proponía resolver `local_date` vía `UserProfile.timezone`. Se corrige: `local_date` es el día calendario **UTC** (`utcDayKey`, reutilizado de `streak-calculator.ts`), no una fecha de cuenta — `UserProfile.timezone` no es alcanzable desde GAMIFICATION sin una dependencia circular de módulos, y el resto del dominio (`xp_rule.dailyCap`, racha) ya usa UTC deliberadamente. El nombre de columna `local_date` no cambia; su semántica sí.

**Procesamiento** (worker de evaluación, dentro de la misma transacción `SERIALIZABLE` que ya usa `XpGrantService` como referencia de aislamiento — mismo patrón, tabla distinta; ver §4.16(d) sobre el uso obligatorio de un único `Prisma.TransactionClient` para todo el paso):

1. Resolver el día calendario UTC del evento (`utcDayKey`, no zona horaria de cuenta — §4.16(a)).
2. Obtener o crear (`upsert`) la fila diaria (`account_challenge_daily_progress`, `UNIQUE(account_challenge_id, local_date)`), sobre el mismo `tx`.
3. Verificar `contribution_count < daily_cap` (si `daily_cap` no es `null`).
4. Incrementar `contribution_count`.
5. Incrementar el progreso agregado de `account_challenge`.
6. Aplicar el tope de `target_value` (el progreso agregado nunca excede la meta del desafío).
7. Marcar `completed_at` si el progreso alcanza `target_value`.

**El `daily_cap` no reemplaza la deduplicación de eventos**: el worker exige, además y de forma independiente, una clave de deduplicación por evento de origen (mismo criterio que `ValidatedGamificationActivity.deduplicationKey`, Bloque I) — sin ella, reprocesar el mismo evento dos veces incrementaría `contribution_count` dos veces aunque el `daily_cap` no se haya alcanzado. Ver Gate 31 (§5) y §4.16(e) (un evento bloqueado por `daily_cap` igual se marca consumido).

### 4.13 Desafíos: señal de "días activos" vía contrato de dominio, nunca la racha de presentación

**Vacío cerrado**: una regla de desafío semanal del tipo "N días activos esta semana" no puede leer `currentStreak >= N` — la racha derivada en tiempo de lectura (Bloque II, sin tabla propia — ver BLOCK-II-CLOSURE-REPORT §6.2) puede haber empezado antes del período semanal del desafío y no representa "días activos dentro de este período".

**Contrato fijado**: un lector de dominio propio, `DailyActivitySignalReader`, con dos operaciones:

```
hasEligibleActivity(accountId, localDate): boolean
countActiveDays(accountId, periodStart, periodEnd): number
```

Debe consultar la **misma fuente persistida** que Bloque II ya usa para derivar racha (`XpLedgerEntryRepository.findByAccountId`, filtrando `entryType = OTORGAMIENTO` — el mismo dato que consume `ProgressionService.getStreak`), preservando una única semántica oficial de: actividad elegible, límites de inicio/fin de día (día calendario **UTC**, corrección §4.16(a) — no timezone de cuenta como decía esta redacción originalmente), exclusión de eventos duplicados, y sincronización tardía de operaciones offline. No introduce una tabla de racha nueva ni llama `computeStreak()` — reutiliza la fuente y la utilidad `utcDayKey` (importada de `streak-calculator.ts`), nunca la interpretación ya calculada para presentación.

**Uso desde el worker**: al llegar una actividad elegible, el worker resuelve el día calendario UTC del evento y aplica exactamente el mecanismo de §4.12 con `daily_cap = 1` sobre ese `account_challenge` — "como máximo un día activo cuenta por fecha" es el mismo mecanismo de tope diario, no uno adicional. `countActiveDays` corresponde entonces a contar fechas únicas ya acumuladas en `account_challenge_daily_progress` dentro del período, no a re-derivar la racha de presentación.

### 4.14 Desafíos: asignación automática y materialización perezosa de `account_challenge`

**Vacío cerrado**: ningún documento (Data Model, PRD, Master Context) especifica si un `account_challenge` nace por aceptación explícita del estudiante o por asignación automática. No existe hoy una UX de catálogo/descubrimiento de desafíos, ni una decisión de producto que la exija — introducirla requeriría endpoint de aceptación, pantalla de descubrimiento, límite de desafíos aceptables simultáneos, y tratamiento de progreso previo a la aceptación: ninguno de esos elementos está definido en este bloque.

**Decisión fijada (2026-08-04)**: para este bloque, `account_challenge` se asigna **automáticamente** a toda cuenta elegible — no hay botón "Aceptar". `accepted_at` conserva el nombre de columna del Data Model, pero su semántica oficial pasa a ser "instante en que el desafío fue asignado automáticamente y quedó habilitado para acumular progreso", no una acción voluntaria del estudiante.

**Materialización perezosa** (evita crear filas para todas las cuentas por adelantado): la fila `account_challenge` se crea en el primero de estos dos disparadores en ocurrir:
- el estudiante abre la sección de desafíos, o
- llega el primer evento elegible del período para esa cuenta/desafío.

```
account_challenge (creación perezosa)
  accepted_at   = now()
  period_start
  period_end
  progress      = 0
  UNIQUE(account_id, challenge_definition_id, period_start)
```

Si en el futuro se introducen desafíos opcionales (elegibles entre varios), eso exige una decisión de producto nueva y probablemente separar `assigned_at` de `accepted_at` — no se anticipa aquí.

### 4.15 Cosméticos: unificación `item_type`/`cosmetic_slot`, insignias, y diferimiento explícito de protección de racha (2026-08-04)

**Contradicción cerrada** (detectada en auditoría, ver historial de este documento): `cosmetic_item.item_type` y `equipped_cosmetic.cosmetic_slot` enumeraban listas distintas en el Data Model (una incluía "insignia", la otra "título"). Se fija un único enum, usado idénticamente en ambos campos:

```
CosmeticItemType / CosmeticSlot (mismo enum para ambos campos)
  - AVATAR
  - AVATAR_FRAME
  - PROFILE_BANNER
  - BADGE
```

Corrección del Product Owner (2026-08-04): `AVATAR` y `AVATAR_FRAME` son slots distintos — `AVATAR` es un cosmético de avatar propio del sistema de inventario (independiente de `PublicProfile.avatarReference`, que sigue siendo la imagen base del perfil, ADR-0018), y `AVATAR_FRAME` es el marco decorativo que se superpone a esa imagen. `PROFILE_BACKGROUND` se descarta — no se introduce ningún slot ausente del Data Model.

**Reglas**:
- `cosmetic_item.item_type` debe coincidir exactamente con `equipped_cosmetic.cosmetic_slot` al equipar — un cosmético solo puede equiparse en su slot equivalente (verificable, Gate 34).
- `TITLE` se elimina de `cosmetic_slot`: los títulos siguen exclusivamente en `equipped_title` (Incremento 3) — no vuelven a aparecer en el sistema cosmético (Gate 35).
- Una cuenta tiene como máximo un ítem equipado por slot; el ítem debe existir previamente en `inventory_item` (propiedad).

**Insignias**: no requieren un `RewardComponentType.BADGE` propio. Se conceden como `RewardComponentType.COSMETIC` referenciando un `cosmetic_item` con `item_type = BADGE` — evita duplicar el mecanismo de inventario ya construido para el resto de cosméticos.

**Protección de racha (`STREAK_PROTECTION`) queda explícitamente diferida**, no omitida en silencio: el Data Model (§16.36) la lista como componente posible de `reward_bundle_item`, pero implementarla exige dominio que no existe en este bloque — saldo/inventario de protecciones, política de expiración, reglas de consumo, integración con la derivación de racha (§4.13), comportamiento ante sincronización offline tardía, y UX de aviso de uso. `RewardComponentType` se mantiene sin cambios: `XP_BONUS | TITLE | COSMETIC`. Se deja constancia aquí para que una futura corrección de Data Model, o un futuro bloque, encuentre la decisión documentada en vez de una ausencia sin explicar.

**Nota de fidelidad al Data Model**: la lista `AVATAR`/`AVATAR_FRAME`/`PROFILE_BANNER`/`BADGE` (corregida 2026-08-04) mapea uno a uno los cuatro tipos de Data Model §16.33 (*"Avatar, marco, banner, insignia u otro"*, una vez retirado "título" — ver arriba): `Avatar` → `AVATAR`, `marco` → `AVATAR_FRAME`, `banner` → `PROFILE_BANNER`, `insignia` → `BADGE`. `AVATAR` (el cosmético de inventario) es distinto de `PublicProfile.avatarReference` (ADR-0018, la imagen base del perfil) — ambos coexisten sin conflicto de nombre a nivel de columna.

### 4.16 Sub-incremento 4.b: correcciones previas a la implementación, contra ADR-0019 y el código vigente (2026-08-05)

4.a (cerrado, commit `d476b63`) quedó tal como se implementó — esta sección no lo reabre, corrige la redacción de §4.12/§4.13 antes de construir 4.b sobre ella.

**a) Día calendario UTC, no zona horaria de cuenta (corrige §4.12/§4.13)**: `UserProfile.timezone` no es alcanzable desde GAMIFICATION sin crear una dependencia circular de módulos (`UserModule` ya importa `GamificationModule` para `TitleEquipmentService`) ni sin apartarse de la convención que el propio dominio ya fijó dos veces: tanto el `daily_cap` de `xp_rule` (`utcDayRange`, Bloque I) como el cálculo de racha (`utcDayKey`, `streak-calculator.ts`) resuelven el día en **UTC** deliberadamente, no en la zona horaria del estudiante — `streak-calculator.ts` lo dice explícitamente en su propio comentario. §4.12/§4.13 quedan corregidos: `account_challenge_daily_progress.local_date` se resuelve como el día calendario **UTC** de `xpLedgerEntry.occurredAt`, reutilizando `utcDayKey` (importado de `streak-calculator.ts`, nunca duplicado) — no una fecha de cuenta.

**Semántica heredada de `local_date`**: el nombre de columna no cambia (ya migrado en 4.a, `20260805022207_challenge_foundation`) — solo su significado documentado. Donde §4.12/§4.13 decían "fecha local de cuenta", debe leerse "día calendario UTC", mismo criterio que el resto de GAMIFICATION. No es una migración de esquema, es una corrección de la definición formal previa a que 4.b dependa de ella.

**b) Gramática mínima `CUMULATIVE_COUNT v1` para `completion_rule`**: mismo criterio que `XP_THRESHOLD` (2.b) — el mínimo necesario para que 4.b materialice `account_challenge.targetValue` al crear la fila perezosamente. Única forma soportada: `{schemaVersion:"v1", type:"CUMULATIVE_COUNT", targetValue:N}` (`N` entero positivo). Cualquier otra forma se rechaza explícitamente (validación estricta, mismo criterio que `parseUnlockRule`) — un `challenge_definition` con `completion_rule` no reconocida o malformada es un error de configuración de esa definición, aislado (no detiene la evaluación de otras cuentas ni de otros desafíos), nunca una excepción silenciosa que finja progreso.

**c) `eligibility_rule` no se ignora — gramática mínima `ALL_ACCOUNTS v1`**: corrige la propuesta previa de tratarlo como no leído. 4.b debe parsear y validar `eligibility_rule` con la misma disciplina que `completion_rule`, aunque el único valor soportado en 4.b sea `{schemaVersion:"v1", type:"ALL_ACCOUNTS"}` (elegible cualquier cuenta, sin segmentación). Una regla no reconocida o malformada es error de configuración de esa definición (mismo aislamiento que (b)) — nunca se asume "sin filtro" por default silencioso ante un valor no entendido. Este campo queda así como el punto de extensión real para segmentación futura (p. ej. por nivel mínimo), sin tocar el mecanismo de materialización cuando eso llegue.

**d) Un único `Prisma.TransactionClient` para todo el paso**: la lectura de `account_challenge_daily_progress` (para comparar contra `daily_cap`), el `INSERT` en `account_challenge_consumed_event`, la escritura de `upsertContribution`, y el incremento de `account_challenge.progressValue` deben ejecutarse sobre el **mismo** `tx` — nunca una lectura fuera de transacción seguida de una escritura dentro de otra. `AccountChallengeDailyProgressRepository.upsertContribution` deja de aceptar invocarse sin `tx` explícito: firma corregida `upsertContribution(tx: Prisma.TransactionClient, accountChallengeId, localDate)`, mismo criterio posicional que `XpBalanceRepository.upsertIncrement(tx, ...)`. Sin este cambio, el `SELECT` de `daily_cap` y el `UPSERT` podrían correr en conexiones distintas, reabriendo exactamente la condición de carrera que `SERIALIZABLE` existe para prevenir (mismo razonamiento que `xp-grant.service.ts`).

**e) Un evento bloqueado por `daily_cap` sigue siendo un evento CONSUMIDO**: la fila en `account_challenge_consumed_event` se inserta siempre que el evento sea elegible para la definición (dentro de su ventana, `eligibility_rule` satisfecha) — incluso cuando esa contribución específica no incrementa nada porque el `daily_cap` del día ya se agotó. "Consumido" (no se vuelve a evaluar) y "contribuyó" (incrementó `contribution_count`/`progress_value`) son hechos independientes. Si el registro de consumo dependiera de haber contribuido, un reintento del mismo evento volvería a competir por el cupo del día contra el resultado de otros eventos ya procesados en ese reintento — el resultado dejaría de ser determinista, rompiendo la idempotencia de lote (Gate 27).

### 4.17 Sub-incremento 4.c: reclamación explícita (2026-08-05)

Cierra el flujo de un desafío ya `COMPLETED` (4.b) — endpoints de autoservicio, autorización de propiedad, y la única transición `COMPLETED -> CLAIMED` que 4.b dejó fuera. Superficie móvil diferida a 4.d.

**Semántica del claim** (orden fijo, cada paso condición del siguiente):

1. Verificar que `account_challenge.id` pertenece a `request.accountId` (AuthGuard) — si no existe o pertenece a otra cuenta, **404** (nunca 403): mismo criterio que `TitleEquipmentService.equipTitle`, evita que el código de error filtre si un id ajeno existe.
2. Verificar `challengeStatus`: `ACCEPTED`/`IN_PROGRESS` → **409** ("todavía no completado"); `CLAIMED` → **200** con el estado actual, sin re-entregar nada (idempotencia real de la solicitud, no solo del `reward_grant` interno — punto 5).
3. Si `challenge_definition.reward_bundle_id` es `NULL` (desafío sin recompensa configurada, permitido desde 4.a), no hay nada que entregar — transicionar directo a `CLAIMED` (paso 6).
4. Si hay bundle: reutilizar `RewardEvaluationWorker.deliverBundleComponents` (visibilidad ampliada de `private` a pública en 4.c — mismo mecanismo genérico de entrega, ADR-0019 §5/§6, sin camino paralelo) con `sourceEntityType = 'CHALLENGE_CLAIM'`, `sourceEntityId = account_challenge.id` — clave `reward:CHALLENGE_CLAIM:{account_challenge.id}` (§4.4, ya reservada desde 1.a).
5. Idempotencia ante doble solicitud CONCURRENTE (no solo secuencial): `reward_grant.idempotencyKey` es único — dos solicitudes simultáneas del mismo claim producen como máximo un `reward_grant`, la segunda recupera la fila ya creada (mismo patrón P2002 ya usado en `RewardGrantRepository.createIdempotent`, que SÍ es seguro aquí porque gestiona su propia transacción interna, a diferencia de `AccountChallengeRepository.createIdempotent` corregido en 4.b — ver evidencia de 4.b).
6. Solo si `deliverBundleComponents` devuelve `allResolved = true` (o no había bundle, paso 3), transicionar `challengeStatus` a `CLAIMED` con `claimedAt = now()` — nunca antes.
7. Si algún componente queda `FAILED`/`PENDING` (`allResolved = false`), `account_challenge` conserva `COMPLETED` — el endpoint responde **503** (reintentable: una nueva solicitud de claim vuelve a intentar los componentes no entregados, mismo mecanismo de recuperación de dos capas que nivel/logros).

**Nueva capacidad de escritura, alcance angosto**: `AccountChallengeRepository.claim(tx, id)` es la única vía que produce `CLAIMED` — transición reforzada por el trigger de Gate 17 (4.a) como segunda barrera. El worker periódico (`RewardEvaluationWorker.run`/`processAccount`) sigue sin tocar `CLAIMED` — la reclamación es siempre una acción síncrona iniciada por el estudiante vía HTTP, nunca automática.

**Endpoints** (`/gamification/me/challenges`, mismo prefijo y criterio de autoservicio que `ProgressionController`):
- `GET /gamification/me/challenges` — lista `account_challenge` de `request.accountId` con los datos de su `challenge_definition` (nombre, descripción, tipo) ya unidos — sin exponer el catálogo completo de definiciones no materializadas (§4.14 no introduce descubrimiento).
- `POST /gamification/me/challenges/:accountChallengeId/claim` — sin cuerpo de solicitud.

**Sin ADR nuevo**: reutiliza íntegramente el mecanismo de entrega de ADR-0019 (§6, mismo criterio de confirmación incremento a incremento que 4.a/4.b).

### 4.18 Sub-incremento 4.d: superficie móvil (2026-08-05)

Cierra el Incremento 4 en su alcance backend+móvil: consumo y presentación de lo que 4.c ya expone, sin evaluación ni lógica de negocio nueva en el cliente.

**Ubicación** (decisión de producto, no técnica — resuelta contra Master Context §4.10, la autoridad más alta disponible, no asumida): *"Competir reúne progresión personal, desafíos y competencia asincrónica"* — Desafíos vive dentro del tab **Competir** ya existente (`app/(tabs)/competir.tsx`), reemplazando su `ComingSoonPlaceholder`. Ningún tab nuevo, ninguna ruta nueva — mismo criterio que Master Context exige para esa pantalla: *"no mostrar capacidades futuras como si ya pudieran utilizarse"* (liga, pregunta rápida, logros siguen sin construirse y no aparecen).

**Cliente tipado**:
- `lib/api/challenges.ts`: `listChallenges()` (`GET /gamification/me/challenges`) y `claimChallenge(id)` (`POST .../claim`), mismo patrón que `lib/api/progress.ts` (ADR-0013) — `apiRequest` + esquema Zod de `@axioma/contracts` (ya existentes desde 4.c).
- `lib/challenges/claim-outcome.ts`: mapeo puro `ApiResult -> ClaimChallengeOutcome` (`ok`/`not_found`/`not_completed`/`retryable`/`network`/`error`) — **solo** traduce status HTTP a intención de UI, nunca reinterpreta reglas de negocio (Gate 43). Importa `ApiResult` con `import type` a propósito: ese import se elide en compilación, así este módulo nunca arrastra en tiempo de ejecución `expo-secure-store` (vía `lib/api/client.ts`) — es lo que permite gatearlo con `tsx` puro, sin runtime de React Native, mismo criterio que `verify-offline-outbox-gate.ts` (ADR-0011).
- `lib/challenges/group-challenges.ts`: `groupChallenges` (activos/completados/reclamados), `progressRatio` (razón `[0,1]` para la barra, NO cálculo de progreso — los dos números ya vienen decididos por el backend), `canClaim` (réplica de presentación de "solo `COMPLETED` reclama", el backend la vuelve a exigir con 409 si se elude).

**Pantalla** (`competir.tsx`): estados `loading`/`error`/`ready` (mismo `ScreenState` que `estudio/index.tsx`/`index.tsx`), `LoadingState`/`ErrorState`/`EmptyState` reutilizados sin modificar. `SectionList` con tres secciones filtradas a no-vacías (Activos/Completados/Reclamados). Progreso mostrado como `progressValue/targetValue` + barra proporcional. Botón "Reclamar" solo si `canClaim`. Protección de doble toque: un único `claimingId` global deshabilita TODOS los botones de reclamar mientras cualquier solicitud está en curso (no solo el ítem tocado) — más simple y suficiente para el volumen esperado de desafíos simultáneos.

**Reacción a cada resultado del claim** (nunca optimista — el estado local solo cambia con la respuesta ya recibida):
- `ok`: reemplaza ese ítem en el array local con `outcome.data` (dato real del servidor) — se re-agrupa solo, `groupChallenges` lo mueve a "Reclamados" en el siguiente render.
- `not_completed` (409) / `not_found` (404): la vista local ya no coincide con el backend — se descarta y se recarga la lista completa (`load()`), no se intenta adivinar el estado correcto localmente (Gate 44).
- `retryable` (503): el ítem NO cambia de grupo (sigue `COMPLETED` en el estado local, igual que en el backend) — se muestra un mensaje de error inline en ESE ítem y el botón vuelve a estar disponible para reintentar.
- `network`/`error`: mismo tratamiento que `retryable` — mensaje inline, reintentable, sin tocar el estado del desafío.

**Tema claro/oscuro**: `useThemedStyles`/`useTheme`, únicamente tokens semánticos (`color.background.*`, `color.text.*`, `color.accent.*`, `color.border.default`, `color.state.error.text`) — ningún hex nuevo, mismo criterio que ADR-0015.

**Fuera de 4.d, confirmado**: sin cálculo de progreso en el cliente, sin `CLAIMED` optimista, sin evaluación de desafíos, sin tipos de desafío nuevos, sin notificaciones, sin animaciones de recompensa, sin cambios de backend (no se encontró ningún defecto de integración que lo exigiera).

**Verificación manual pendiente, admitida explícitamente**: el gate de 4.d (`verify:challenges-gate`) prueba `group-challenges.ts`/`claim-outcome.ts` (lógica pura, sin RN) contra `tsx`, mismo criterio que `verify-offline-outbox-gate.ts` — NO reemplaza una verificación visual real del renderizado/tema/gestos en Browser o dispositivo, que no se ejecutó en esta sesión (requiere sesión autenticada real vía `expo start --web` + backend arriba). Queda pendiente antes de considerar 4.d validado end-to-end, mismo criterio de honestidad que ya usa el propio checklist de ADR-0011.

**Sin ADR nuevo**: sin decisión de arquitectura (solo cliente/presentación).

## 5. Decision Gates

### Incremento 1 — Entrega de recompensas

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Revocar un ítem equipado lo des-equipa atómicamente | Revocar un `account_title`/`inventory_item` que está equipado limpia `equipped_title`/`equipped_cosmetic` en la misma operación — nunca queda un puntero a un ítem no poseído o inactivo (§4.3). |
| 2 | Idempotencia de entrega por convención de clave | Reintentar un `reward_grant` con la misma `sourceEntityType`/`sourceEntityId` (§4.4) no duplica componentes ni XP, para las cuatro fuentes (logro, desafío, nivel, hito). |
| 3 | Recuperación parcial sin duplicación | Si un componente falla, los demás se entregan igual y el fallido puede reintentarse solo, sin re-entregar los ya otorgados (`reward_grant_component`). |
| 4 | Sin selección aleatoria | El contenido de un `reward_bundle` es determinista y visible antes de reclamar — ninguna ruta de código introduce aleatoriedad. |
| 5 | No-autoridad académica (mecanismo de entrega) | No lee ni modifica `StudentResponse`/`CurriculumTopicProgress` — solo tablas propias de GAMIFICATION y las nuevas de este bloque. |
| 6 | Snapshot, no referencia viva (§4.5) | Editar un `reward_bundle`/`reward_bundle_item` después de un `reward_grant` no cambia lo que ese `reward_grant`/`reward_grant_component` reporta haber entregado. |
| 7 | Sin revocación retroactiva por retiro de bundle | Retirar (`status`) un `reward_bundle` no afecta `inventory_item`/`account_title` ya otorgados por él. |
| 8 | Nivel: no se re-otorga ni se revoca por fluctuación de XP | Un reverso que baja el XP por debajo del umbral de un nivel ya alcanzado no revoca su recompensa; volver a cruzar el umbral no la duplica (§4.4, fuente `LEVEL`). |
| 25 | Extensión de `LevelDefinition` sin regresión, y recompensa por nivel entregada correctamente (trasladado desde Incremento 5 — ver §4.1, nota histórica) | Añadir `reward_bundle_id` no rompe `verify:gamification-progression-gate` (Bloque II) — mismo gate, sin modificar, debe seguir en PASS. Además: una cuenta que cruza `minimumLifetimeXp` de un `LevelDefinition` con `reward_bundle_id` configurado recibe un `reward_grant` cuyos componentes `XP_BONUS` quedan `DELIVERED`, vía el mismo mecanismo idempotente de §4.4 (fuente `LEVEL`). |

### Incremento 2 — Logros

| # | Gate | Qué verifica |
|---|---|---|
| 9 | Reconstructibilidad del progreso | `achievement_progress` puede recalcularse desde el origen (XP/nivel/racha ya persistidos o derivados). |
| 10 | Desbloqueo idempotente | Alcanzar la meta dos veces (reintento del evaluador) no duplica `achievement_unlock` ni el `reward_grant` asociado. |
| 11 | Referencia estable a `achievement_version_id` (§4.7) | Cambiar `unlock_rule` en una versión nueva no reinterpreta progreso/desbloqueos ya evaluados bajo una versión anterior. |
| 12 | Privacidad de logros públicos | Un logro con `visibility_class` pública nunca expone dificultades, materias débiles ni evidencia académica privada. |

### Incremento 3 — Títulos

| # | Gate | Qué verifica |
|---|---|---|
| 13 | Equipar exige perfil público existente | No se puede equipar un título sin `public_profile` (ADR-0018). |
| 14 | Solo un título propio y activo equipable | Rechaza equipar un título no poseído, revocado, o de otra cuenta. |
| 15 | Equipar no altera propiedad ni progreso | Cambiar el título equipado es una operación de presentación pura. |

### Incremento 4 — Desafíos

| # | Gate | Qué verifica |
|---|---|---|
| 16 | `challenge_definition` inmutable por fila (§4.8) | Ningún código actualiza `challenge_definition` una vez que existe un `account_challenge` referenciándola — un criterio nuevo es siempre una fila nueva. |
| 17 | Ciclo de vida sin saltos | `account_challenge` transiciona únicamente aceptado → en progreso → completado → reclamado, en ese orden. |
| 18 | Expiración respetada | Un desafío vencido (`ends_at` pasado) no puede completarse ni reclamarse retroactivamente. |
| 19 | Antifraude — sin gasto obligatorio | Satisfecho **por construcción**: no existe economía en este bloque (§3) — se declara, no requiere prueba de comportamiento. |
| 20 | Antifraude — sin castigo por no participar | No completar un desafío no afecta XP, racha ni nivel — mismo aislamiento que el diseño no punitivo de rachas (Bloque II). |
| 21 | Antifraude — tope de repetición (cierra el Gate 8 pendiente del Bloque I) | `daily_cap` real sobre `account_challenge_daily_progress` (§4.12): superar el tope el mismo día local no incrementa el progreso agregado, aunque existan más eventos elegibles ese día. |
| 31 | Deduplicación de evento independiente del `daily_cap` (§4.12) | Reprocesar el mismo evento de origen dos veces no incrementa `contribution_count` ni el progreso agregado — la deduplicación por evento y el tope diario son mecanismos independientes, ambos exigidos. |
| 32 | Asignación automática y materialización perezosa (§4.14) | `account_challenge` se crea sin acción explícita del estudiante, solo al abrir la sección o al primer evento elegible del período — `UNIQUE(account_id, challenge_definition_id, period_start)` impide duplicados y preexistencia para cuentas sin actividad. |
| 33 | Señal de "días activos" vía `DailyActivitySignalReader` (§4.13) | Un desafío de días activos cuenta fechas únicas dentro de su propio período (misma mecánica que Gate 21, `daily_cap = 1`) — nunca lee `currentStreak` de presentación. |
| 37 | Propiedad exclusiva del claim (§4.17) | `POST .../claim` sobre un `account_challenge` inexistente o de otra cuenta responde 404 — nunca 403, nunca filtra existencia. |
| 38 | Solo `COMPLETED` es reclamable (§4.17) | `ACCEPTED`/`IN_PROGRESS` responde 409; `CLAIMED` responde 200 idempotente, sin re-entregar. |
| 39 | Idempotencia real del claim, secuencial y concurrente (§4.17) | Reclamar dos veces (secuencial o concurrente) produce como máximo un `reward_grant` y transiciona a `CLAIMED` una sola vez. |
| 40 | `CHALLENGE_CLAIM` como fuente de recompensa (§4.4/§4.17) | El `reward_grant` de un claim usa `sourceEntityType = CHALLENGE_CLAIM`, `sourceEntityId = account_challenge.id`, clave `reward:CHALLENGE_CLAIM:{id}`. |
| 41 | Sin `CLAIMED` sin entrega confirmada (§4.17) | Si algún componente de la recompensa falla, `account_challenge` conserva `COMPLETED` (nunca `CLAIMED`) y el endpoint responde 503, reintentable. |
| 42 | Renderizado correcto de los cuatro estados (§4.18) | `ACCEPTED`/`IN_PROGRESS` en "Activos", `COMPLETED` en "Completados", `CLAIMED` en "Reclamados" -- sin duplicar ni omitir ningún desafío entre grupos. |
| 43 | Sin lógica de negocio duplicada en el cliente (§4.18) | `mapClaimResult`/`progressRatio`/`canClaim` derivan su resultado ÚNICAMENTE de datos ya decididos por el backend (status HTTP, `progressValue`/`targetValue`/`challengeStatus`) -- ninguno reevalúa ni reinterpreta una regla de negocio. |
| 44 | 409/404 fuerza reconciliación completa (§4.18) | Ante una discrepancia con el backend durante el claim, el cliente recarga la lista completa (`GET .../challenges`) en vez de adivinar el estado localmente. |
| 45 | 503 conserva el estado local y permite reintentar (§4.18) | Un claim con 503 no cambia el grupo/estado local del desafío (sigue `COMPLETED`) y el botón de reclamar sigue disponible. |
| 46 | Protección de doble toque (§4.18) | Mientras una solicitud de claim está en curso, ningún botón de reclamar adicional puede iniciar una segunda solicitud. |

### Incremento 5 — Cosméticos y slots (títulos/cosméticos vinculados a niveles vía `reward_bundle_id` ya añadido en 1.c)

| # | Gate | Qué verifica |
|---|---|---|
| 22 | Un ítem por slot, solo si poseído y activo | `equipped_cosmetic` rechaza equipar un ítem no poseído, revocado, o en un slot incompatible. |
| 23 | Múltiples slots simultáneos sin interferencia (§4.10) | Equipar un cosmético en el slot `AVATAR_FRAME` no afecta lo equipado en `AVATAR`/`PROFILE_BANNER`/`BADGE` de la misma cuenta — cada slot es independiente. |
| 24 | Cosméticos no alteran nada funcional | Ningún cosmético cambia dificultad, corrección o XP base. |
| 34 | Coincidencia exacta tipo-slot (§4.15) | `equipped_cosmetic` rechaza equipar un `cosmetic_item` cuyo `item_type` no sea idéntico al `cosmetic_slot` destino. |
| 35 | Títulos fuera del sistema cosmético (§4.15) | `CosmeticSlot` no incluye `TITLE` — no existe ruta de código que equipe un título vía `equipped_cosmetic`; los títulos usan exclusivamente `equipped_title` (Incremento 3). |
| 36 | `STREAK_PROTECTION` diferido, no omitido en silencio (§4.15) | `RewardComponentType` se mantiene en `XP_BONUS \| TITLE \| COSMETIC` — verificación estática de que ningún código introduce un componente de protección de racha en este bloque; insignias se conceden como `COSMETIC` con `item_type = BADGE`, sin componente propio. |

**Gate 25** (extensión de `LevelDefinition` con `reward_bundle_id`) se trasladó al Incremento 1, tabla de arriba en §5 (sub-incremento 1.c) — ver §4.1, nota histórica. Este incremento no vuelve a tocar `LevelDefinition`; solo añade componentes `TITLE`/`COSMETIC` al `reward_bundle` que un nivel ya referencia desde 1.c.

### Worker de evaluación (transversal a Incrementos 1–4, §4.9)

| # | Gate | Qué verifica |
|---|---|---|
| 26 | Aislamiento de fallo por cuenta | Una cuenta que falla al evaluarse no detiene el resto del lote. |
| 27 | Idempotencia de lote | Correr el worker completo dos veces seguidas produce exactamente el mismo estado resultante. |
| 28 | Frontera de dominio del worker | Verificación estática: el worker no referencia `StudentResponse`/`CurriculumTopicProgress`. |

### Coordinación con `public_profile` (§4.10)

| # | Gate | Qué verifica |
|---|---|---|
| 29 | Retiro oculta el equipamiento sin borrarlo | Con `public_profile.lifecycleStatus = RETIRED`, `equipped_title`/`equipped_cosmetic` dejan de ser visibles en cualquier superficie pública, sin eliminarse. |
| 30 | Anonimización limpia el equipamiento, no la propiedad | `anonymizePublicProfileForAccountClosure` elimina `equipped_title`/`equipped_cosmetic` del perfil anonimizado, pero `account_title`/`inventory_item` (propiedad) permanecen intactos. |

### Precisión posterior (ADR-0019, aprobado): cuatro gates adicionales del worker/entrega

La revisión de ADR-0019 encontró que los Gates 2 y 26–28 de arriba, tal como estaban redactados aquí, no eran suficientes por sí solos — quedaron formalizados con mecanismo concreto y cuatro Decision Gates propios en ADR-0019 §Validación: retry verificable del cursor por cuenta (nunca omisión permanente), convergencia del ciclo recompensa→BONO→evaluación, máquina de estados completa de `reward_grant`/`reward_grant_component`, y uso de la versión de logro históricamente aplicable (nunca una posterior). Ver ADR-0019 para el detalle — no se duplica aquí para evitar que ambos documentos diverjan.

### Gate consolidado del Bloque III

Mismo patrón que `verify:block-ii-gate`: invoca el gate consolidado del Bloque II completo (que ya incluye Bloque I + M1) como un solo paso, y agrega los gates propios de los cinco incrementos y del worker de este bloque.

## 6. ADR

- **Incremento 1 (Entrega de recompensas) + worker de evaluación**: **requiere ADR nuevo** (ADR-0019, a redactar a continuación). Las políticas de fondo ya quedaron fijadas en esta definición (convención de clave de idempotencia §4.4, snapshot de lo entregado §4.5, garantías del worker §4.9, inmutabilidad de `challenge_definition` §4.8) — el ADR formaliza la implementación exacta (esquema de tablas, estructura del worker, endpoints internos), no redescubre estas decisiones.
- **Incrementos 2–5 (Logros, Títulos, Desafíos, Cosméticos)**: no requieren ADR propio si se apoyan en el mecanismo que fije ADR-0019 sin introducir una decisión arquitectónica nueva — mismo criterio que Progresión Visible en el Bloque II. Se confirmará incremento a incremento.

**Confirmación para Incremento 4 (2026-08-04)**: los mecanismos fijados en §4.12–4.14 (`account_challenge_daily_progress`, `DailyActivitySignalReader`, asignación automática con materialización perezosa) **no requieren ADR propio**. Ninguno introduce un componente de infraestructura nuevo (worker, cola, sistema externo): el tope diario reutiliza el patrón de aislamiento `SERIALIZABLE` ya validado en `XpGrantService` (Bloque I) sobre una tabla nueva, no un mecanismo nuevo; el lector de racha reutiliza la fuente persistida de Bloque II sin nueva tabla; la asignación perezosa es una regla de negocio sobre creación de filas, no una decisión de arquitectura. Se confirma consistente con el mecanismo de ADR-0019 (worker de evaluación por cursor de cuenta).

**Confirmación para Incremento 5 (2026-08-04)**: la unificación de enum (§4.15) y el diferimiento de `STREAK_PROTECTION` son decisiones de modelado de datos y alcance de producto, no de arquitectura — **no requieren ADR propio**. Se apoyan íntegramente en el mecanismo de entrega ya fijado por ADR-0019 y en la coordinación de ciclo de vida ya construida en ADR-0018 (§4.10).

## 7–10. Pendientes

Implementación incremental, validación técnica, actualización documental y cierre formal **no se inician todavía** para el Bloque III como conjunto — quedan para el cierre formal completo. Sub-incrementos individuales ya autorizados e implementados registran su evidencia a continuación, en la medida en que avanzan.

### Evidencia de validación — Incremento 4, sub-incremento 4.a ("Fundación de persistencia de desafíos", 2026-08-04)

Implementado: esquema (`challenge_definition`/`account_challenge`/`account_challenge_daily_progress`, migración `20260805022207_challenge_foundation`), repositorios mínimos (`ChallengeDefinitionRepository`/`AccountChallengeRepository`/`AccountChallengeDailyProgressRepository`), sin evaluación de eventos, progresión, reclamación ni integración con `RewardEvaluationWorker` (fuera de alcance de 4.a, ver arriba).

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:challenge-foundation-gate` (nuevo, 40 verificaciones — esquema, unicidad, ciclo de vida sin saltos, primitivo de acumulación diaria, frontera de dominio) | **PASS** |
| `verify:reward-foundation-gate` (1.a) | PASS, sin regresión |
| `verify:reward-evaluation-worker-gate` (1.b) | PASS, sin regresión |
| `verify:reward-delivery-xp-bonus-gate` (1.c) | PASS, sin regresión |
| `verify:achievement-foundation-gate` (2.a) | PASS, sin regresión |
| `verify:achievement-progress-unlock-gate` (2.b) | PASS, sin regresión |
| `verify:title-foundation-gate` (3.a) | PASS, sin regresión |
| `node scripts/verify-block-ii-gate.mjs` (consolidado Bloque I + II) | PASS, sin regresión |
| `verify:title-equipment-gate` (3.b) | **NO EJECUTADO** — requiere un servidor HTTP activo en `localhost:3000` (hace peticiones `fetch` reales); no se levantó un servidor para esta corrida. **No se reporta como PASS.** Excepción de entorno, no de código: 4.a no toca `equipped_title`, `public_profile`, ni ninguna ruta HTTP — ningún archivo de este sub-incremento roza ese flujo (verificado por la frontera de dominio del propio gate de 3.a/3.b y por la ausencia de cualquier referencia cruzada en los archivos nuevos de 4.a). Pendiente de re-ejecutar con el servidor arriba antes del cierre formal del Bloque III, junto con el resto de gates que dependen de HTTP. |

### Evidencia de validación — Incremento 4, sub-incremento 4.b ("Consumo de eventos y progresión de desafíos", 2026-08-05)

Implementado, contra la propuesta de diseño confirmada y las correcciones de §4.16: `RewardEvaluationWorker.evaluateChallenges`/`evaluateChallengeEventForDefinition` (consume únicamente `pendingEntries` filtrado a `OTORGAMIENTO`, sin ensanchar la frontera del worker), `account_challenge_consumed_event` (migración `20260805024926_challenge_event_consumption`, deduplicación por evento), gramáticas `CUMULATIVE_COUNT v1`/`ALL_ACCOUNTS v1` (`challenge-rule.ts`), `DailyActivitySignalReader` (independiente de la racha de presentación, gateado por separado — no invocado por el worker en 4.b), y progresión `ACCEPTED → IN_PROGRESS → COMPLETED` (`AccountChallengeRepository.advanceProgress`, nunca `CLAIMED`).

**Correcciones encontradas durante la implementación** (no anticipadas en la propuesta de diseño, resueltas antes de cerrar 4.b):
- `AccountChallengeRepository.createIdempotent` usaba el patrón "crear y recuperarse de `P2002`" (mismo criterio que `AccountTitleRepository`) — dentro de la transacción `SERIALIZABLE` compartida que exige §4.16(d), un error de restricción única deja la transacción abortada en Postgres (`25P02`) y ninguna sentencia posterior sobre el mismo `tx` se ejecuta. Corregido a verificar existencia antes de crear (`findUnique` → `create`), seguro en este flujo porque el lock consultivo por cuenta (ADR-0019 §1) ya serializa el acceso.
- Dos gates de sub-incrementos ya cerrados (`verify-reward-delivery-xp-bonus-gate.ts`, 1.c; `verify-achievement-progress-unlock-gate.ts`, 2.b) tenían `'ChallengeDefinition'` en su lista de símbolos prohibidos para `reward-evaluation.worker.ts` — vigente mientras desafíos no tenían evaluación real. Se retiró de ambas listas, mismo criterio ya aplicado ahí mismo cuando 2.b/3.a extendieron el worker (comentario `'AchievementDefinition' se retiró en 2.b... 'accountTitle' se retiró en 3.a`) — ninguna otra frontera de esos gates cambió.
- `verify-challenge-foundation-gate.ts` (4.a) no retiraba sus propias filas `challenge_definition` de prueba entre corridas (a diferencia de los gates de logros/títulos) — quedaban `ACTIVE` con `eligibility_rule`/`completion_rule` en texto libre, y el worker real de 4.b las leía e intentaba evaluarlas. Se añadió la misma higiene de retiro al inicio del gate, mismo criterio que 2.a/2.b.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:challenge-progress-gate` (nuevo — materialización perezosa, progresión completa, idempotencia de lote ante reintento, `daily_cap` real con eventos concurrentes, aislamiento por evento consumido bajo cap agotado, exclusión de `BONO`/`AJUSTE`, exclusión de eventos fuera de ventana, aislamiento de definiciones con `completion_rule`/`eligibility_rule` inválida, `DailyActivitySignalReader` independiente de la racha, ausencia de `CLAIMED`/endpoints, frontera de dominio) | **PASS** |
| `verify:challenge-foundation-gate` (4.a, con la corrección de higiene arriba) | PASS |
| `verify:reward-foundation-gate` (1.a) | PASS, sin regresión |
| `verify:reward-evaluation-worker-gate` (1.b) | PASS, sin regresión |
| `verify:reward-delivery-xp-bonus-gate` (1.c, con la corrección de frontera arriba) | PASS, sin regresión funcional |
| `verify:achievement-foundation-gate` (2.a) | PASS, sin regresión |
| `verify:achievement-progress-unlock-gate` (2.b, con la corrección de frontera arriba) | PASS, sin regresión funcional |
| `verify:title-foundation-gate` (3.a) | PASS, sin regresión |
| `node scripts/verify-block-ii-gate.mjs` (consolidado Bloque I + II) | PASS, sin regresión |
| `verify:title-equipment-gate` (3.b) | **NO EJECUTADO** — misma excepción de entorno que 4.a (requiere servidor HTTP activo); 4.b tampoco toca `equipped_title`/`public_profile`/HTTP. |

### Evidencia de validación — Incremento 4, sub-incremento 4.c ("Reclamación explícita", 2026-08-05)

Implementado, contra el diseño fijado en §4.17: `ChallengeService`/`ChallengeController` (`GET`/`POST /gamification/me/challenges[...]`), `AccountChallengeRepository.claim` (única vía de `COMPLETED -> CLAIMED`), gramática de contrato `challengeSummarySchema`/`listChallengesResponseSchema`/`claimChallengeResponseSchema` (`@axioma/contracts`), y `RewardEvaluationWorker.deliverBundleComponents` con visibilidad ampliada a pública (sin camino de entrega paralelo).

**Corrección encontrada durante la implementación** (no anticipada en el diseño, resuelta antes de cerrar 4.c): `deliverXpBonusComponent`/`deliverTitleComponent` (worker, 1.c/3.a) asumen serialización externa por el advisory lock POR CUENTA de `processAccount` (ADR-0019 §1) — nunca se diseñaron para tolerar dos llamadas verdaderamente concurrentes sobre el MISMO componente. El endpoint HTTP de claim no tenía ese lock: dos solicitudes de claim simultáneas para el mismo `account_challenge` podían ambas ver un componente `PENDING` y la segunda en confirmar `markDelivered` chocaba contra el trigger de inmutabilidad de `reward_grant_component` (ya `DELIVERED`), devolviendo 500 en vez de resolverse idempotentemente. Corregido con un advisory lock BLOQUEANTE (`pg_advisory_xact_lock`, namespace `20`, distinto del `19` de ADR-0019) por `account_challenge.id` al entrar a `ChallengeService.claim` — una segunda solicitud concurrente espera en vez de fallar, y encuentra el estado ya `CLAIMED` al continuar (Gate 39). No se modificó el mecanismo de entrega ya cerrado (1.c/3.a).

También encontrado y corregido en el camino: la aserción "`account-challenge.repository.ts` nunca asigna `claimedAt`" del gate de 4.b (`verify-challenge-progress-gate.ts`) quedó obsoleta — 4.c añade `AccountChallengeRepository.claim`, la única vía autorizada de esa transición. Se retiró esa aserción puntual (la que verifica que el WORKER PERIÓDICO nunca la asigna sigue vigente y en PASS).

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:challenge-claim-gate` (nuevo, HTTP real contra servidor + Postgres — propiedad exclusiva del claim, estado previo exigido, entrega XP_BONUS+TITLE con `CHALLENGE_CLAIM`, idempotencia secuencial y CONCURRENTE, desafío sin `reward_bundle` configurado, sin identidad -> 401, frontera de dominio) | **PASS** |
| `verify:challenge-progress-gate` (4.b, con el ajuste de aserción arriba) | PASS |
| `verify:challenge-foundation-gate` (4.a) | PASS, sin regresión |
| `verify:reward-foundation-gate` (1.a) | PASS, sin regresión |
| `verify:reward-evaluation-worker-gate` (1.b) | PASS, sin regresión |
| `verify:reward-delivery-xp-bonus-gate` (1.c) | PASS, sin regresión |
| `verify:achievement-foundation-gate` (2.a) | PASS, sin regresión |
| `verify:achievement-progress-unlock-gate` (2.b) | PASS, sin regresión |
| `verify:title-foundation-gate` (3.a) | PASS, sin regresión |
| `verify:title-equipment-gate` (3.b) | PASS, sin regresión — ejecutado por primera vez en la evidencia de este bloque (servidor HTTP disponible para el gate de 4.c); cierra la excepción de entorno registrada en 4.a/4.b. |
| `node scripts/verify-block-ii-gate.mjs` (consolidado Bloque I + II) | PASS, sin regresión |

### Evidencia de validación — Incremento 4, sub-incremento 4.d ("Superficie móvil", 2026-08-05)

Implementado, contra el diseño fijado en §4.18: `lib/api/challenges.ts`, `lib/challenges/claim-outcome.ts`, `lib/challenges/group-challenges.ts`, y `app/(tabs)/competir.tsx` (reemplaza `ComingSoonPlaceholder`, ubicación confirmada contra Master Context §4.10). Sin cambios de backend — ningún defecto de integración lo exigió.

**Decisión de ubicación confirmada explícitamente antes de implementar** (no asumida): Master Context §4.10 ubica Desafíos dentro de Competir — se confirmó con el Product Owner antes de tocar `competir.tsx`.

**Corrección de arquitectura encontrada al diseñar el gate** (no un defecto de comportamiento, un ajuste de estructura para poder probarlo): `lib/api/challenges.ts` importaba `apiRequest` de `lib/api/client.ts`, que importa `expo-secure-store` — cualquier archivo que lo importe, aunque sea transitivamente, falla al transformarse con `tsx` puro (esbuild no puede parsear el `react-native` que `expo-secure-store` arrastra fuera de Metro). Se extrajo el mapeo de resultado del claim a `lib/challenges/claim-outcome.ts`, que importa `ApiResult` con `import type` (elidido en compilación) — permite gatear la lógica de decisión real sin runtime de React Native, mismo criterio que ya usa `verify-offline-outbox-gate.ts` para el driver de SQLite.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:challenges-gate` (nuevo, móvil — cuatro estados agrupados correctamente, `progressRatio` acotado, `canClaim` solo en `COMPLETED`, mapeo 200/404/409/503/red/otro sin lógica de negocio duplicada) | **PASS** |
| `tsc --noEmit` (mobile) | PASS |
| `eslint app lib components` (mobile) | PASS, sin advertencias |
| `verify:offline-outbox-gate` (mobile, regresión del flujo previo) | PASS, sin regresión |
| `verify:challenge-claim-gate` (4.c) | PASS, sin regresión |
| `verify:challenge-progress-gate` (4.b) | PASS, sin regresión |
| `verify:challenge-foundation-gate` (4.a) | PASS, sin regresión |
| `verify:title-equipment-gate` (3.b) | PASS, sin regresión |

**No verificado en esta sesión, admitido explícitamente** (§4.18): renderizado visual real (Browser/dispositivo, sesión autenticada real, tema claro/oscuro, gestos de doble toque) — el gate automatizado prueba la lógica de decisión pura, no la pantalla React Native en sí. Mismo criterio de honestidad que ya usa `verify-offline-outbox-gate.ts` sobre su propia verificación manual pendiente en Android.

---

**Bloque III — definición formal, 6ª revisión (2026-08-05). Los siete ajustes de la auditoría crítica de la 2ª revisión permanecen incorporados; el modelo de equipamiento se mantiene normalizado (§4.10). Incremento 4 — Desafíos — queda COMPLETO en su alcance backend + móvil: sub-incrementos 4.a, 4.b, 4.c y 4.d implementados y gateados (§4.12–4.14, §4.16, §4.17, §4.18) — ningún ADR nuevo requerido (§6). Verificación visual manual de 4.d en dispositivo/Browser queda pendiente, admitida explícitamente (no bloqueante para el cierre de este sub-incremento, sí recomendable antes de considerar Incremento 4 verificado end-to-end). Incremento 5 (Cosméticos, §4.15) sigue en definición, sin implementación todavía — Bloque III NO se etiqueta todavía.**
