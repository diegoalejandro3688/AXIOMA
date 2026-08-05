# Bloque III — Definición Formal: Gamificación Avanzada

**Fecha**: 2026-08-03
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: III de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-II-CLOSURE-REPORT.md`, `docs/adr/BLOCK-II-DEFINITION.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0018-public-profile-foundation.md`
**Estado**: **CERRADO — ver `docs/adr/BLOCK-III-CLOSURE-REPORT.md` (2026-08-05, APPROVED)**. Definición final (9ª pasada). Incremento 4 (Desafíos) completo (4.a `d476b63`, 4.b `8dacc71`, 4.c `83ae57b`, 4.d `bcbb107`). Incremento 5 (Cosméticos) completo (5.a `bcd5659`, 5.b `b186f6a`, 5.c `1ae25be`). Verificación visual real en Android (Desafíos y Cosméticos, claro/oscuro) confirmada por el Product Owner el 2026-08-05, incluyendo el hallazgo y fix del botón de Onboarding (`95601ad`). Gate consolidado `verify:block-iii-gate` en PASS.

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

### 4.19 Sub-incremento 5.a: fundación de persistencia y entrega de cosméticos (2026-08-05)

Mismo patrón que 3.a (Títulos): esquema + entrega idempotente reutilizando `deliverBundleComponents` — SIN `equipped_cosmetic`, SIN endpoints, SIN superficie móvil (eso es 5.b/5.c).

**`cosmetic_item`** (Data Model §16.33): `itemKey` (único), `itemType` (enum `CosmeticSlot`, ya fijado en §4.15 — `AVATAR|AVATAR_FRAME|PROFILE_BANNER|BADGE`), `name`, `description`, `rarityClass` (String abierto — mismo criterio que `TitleDefinition.rarityClass`, DM no lo enumera), `assetReference` (String **opaco** — no se interpreta como URL pública, ruta local ni clave de Object Storage hasta que exista un contrato específico; 5.a solo lo persiste tal cual), `visibilityStatus` (`PRIVATE|PUBLIC`), `status` (`ACTIVE|RETIRED`). Inmutable por diseño de repositorio (sin `update()`/`delete()`), mismo criterio que `TitleDefinitionRepository`.

**`inventory_item`** (Data Model §16.34): calco de `account_title` — `accountId`, `cosmeticItemId` FK, `acquisitionSourceType`/`acquisitionSourceId` (snapshot del `reward_grant` que lo entregó, nunca `cosmetic_item` como fuente), `acquiredAt`, `ownershipStatus` (`ACTIVE|REVOKED|SUPERSEDED`), `revokedAt`. `UNIQUE(accountId, cosmeticItemId)` — idempotencia de adquisición (DM: "Un artículo único no deberá duplicarse accidentalmente").

**Integridad de referencia (COSMETIC)**: mismos dos triggers que 3.a construyó para `TITLE`, replicados para `COSMETIC` — `enforce_reward_bundle_item_cosmetic_reference` (config, mutable) y `enforce_reward_grant_component_cosmetic_reference` (snapshot ya entregado/en curso), ambos rechazando `reference_id` que no exista en `cosmetic_item` cuando `component_type = 'COSMETIC'`. El CHECK de coherencia de 1.a (`reference_id` NULL solo si `XP_BONUS`) sigue sin interferencia, igual que en 3.a. Ningún trigger nuevo toca `XP_BONUS`/`TITLE`.

**`deliverCosmeticComponent`** (nueva rama en `RewardEvaluationWorker.deliverBundleComponents`, junto a `deliverXpBonusComponent`/`deliverTitleComponent` — mismo mecanismo, sin camino paralelo):
1. Resuelve `cosmetic_item` por `component.referenceId` (garantizado existente por el trigger — no revalida).
2. Intenta crear `inventory_item` idempotentemente (`UNIQUE(accountId, cosmeticItemId)`).
3. `acquisitionSourceType`/`acquisitionSourceId` = snapshot de `grant.sourceEntityType`/`grant.sourceEntityId` — misma fuente real que `deliverTitleComponent`, nunca un dato inventado.
4. `markDelivered` solo después de que la creación (o recuperación idempotente) de `inventory_item` haya confirmado. Si la creación falla, `markFailed` — mismo patrón que `deliverTitleComponent`.
5. Reintento (mismo `component.id`, `reward_grant` ya existente): el `UNIQUE` de `inventory_item` produce el mismo `P2002` recuperable ya usado en `AccountTitleRepository.createIdempotent` — no una segunda fila.
6. **Decisión fijada, recomendación del Product Owner adoptada**: si ya existe un `inventory_item` para (`accountId`, `cosmeticItemId`) con `ownershipStatus` distinto de `ACTIVE` (`REVOKED`/`SUPERSEDED`), una nueva entrega del mismo cosmético **no reactiva la propiedad automáticamente** — `InventoryItemRepository.createIdempotent` devuelve la fila existente tal cual (sin tocar `ownershipStatus`) y `deliverCosmeticComponent` la trata como entrega ya resuelta (`markDelivered`, sin error) — reactivar propiedad revocada es una política de dominio no definida (fuera de alcance de 5.a, igual criterio que `RewardGrant.grantStatus = REVERSED`/`AchievementUnlock.status = REVERSED`: reservado para una herramienta de moderación futura). No se distingue de un `ACTIVE` existente a nivel de resultado del componente — ambos casos son "ya hay una fila, no se crea otra, se marca entregado" — la diferencia de `ownershipStatus` es visible solo consultando `inventory_item` directamente, nunca bloquea ni reintenta la entrega.

**Limitación conocida, admitida explícitamente (no se construye backfill)**: componentes `COSMETIC` que quedaron `PENDING` antes de que `cosmetic_item` existiera (gates de 1.c/2.b/4.c, ejecutados contra bundles con `COSMETIC` fuera de alcance) solo se entregan si algo vuelve a tocar ese `reward_grant`. Para `LEVEL`/`ACHIEVEMENT_UNLOCK`, el worker los revisita en su próxima pasada normal. Para `CHALLENGE_CLAIM`, `ChallengeService.claim` corta temprano si el desafío ya está `CLAIMED` y nunca vuelve a intentar la entrega — un componente `COSMETIC` `PENDING` de un claim ya `CLAIMED` antes de 5.a queda `PENDING` para siempre, sin mecanismo de reconciliación. Aceptado como limitación conocida por tratarse de datos de prueba de Fase 2, sin datos de producción reales.

**Sin ADR nuevo**: mismo criterio que 3.a — reutiliza el mecanismo de ADR-0019 sin introducir una decisión arquitectónica nueva.

### 4.20 Sub-incremento 5.b: equipamiento de cosméticos (2026-08-05)

Cierra `equipped_cosmetic` (Data Model §16.35) sobre la fundación de 5.a — mismo patrón que 3.b (Equipamiento de títulos), extendido a multi-slot.

**`equipped_cosmetic`**: `@@id([publicProfileId, cosmeticSlot])` — clave única por perfil y slot (no `publicProfileId` solo, a diferencia de `equipped_title`, por la decisión multi-slot ya fijada en §4.10). `inventoryItemId` FK a `inventory_item`, sin `@unique`: la coincidencia estricta `item_type = cosmetic_slot` (Gate 34) ya garantiza que un `inventory_item` solo puede ocupar su slot correspondiente — no hace falta reforzarlo con una segunda restricción. `equippedAt`/`updatedAt`.

**Trigger `enforce_equipped_cosmetic_account_consistency`** (calco de `enforce_equipped_title_account_consistency`, 3.b, con una condición adicional): exige `inventory_item.ownership_status = ACTIVE`, `inventory_item.account_id = public_profile.account_id`, `public_profile.lifecycle_status = ACTIVE`, y `cosmetic_item.item_type = NEW.cosmetic_slot` (vía `inventory_item`) — esta última es la que cierra Gate 34 con mecanismo real, no declarativo.

**Contradicción real encontrada y resuelta antes de implementar** (no asumida en silencio): la ruta pedida (`/gamification/me/cosmetics`) necesita validar `public_profile` (dominio USER), pero `UserModule` ya importa `GamificationModule` (para `TitleEquipmentService`) — declarar el controller directamente en `GamificationModule` habría creado una dependencia circular de módulos, sin precedente en el proyecto. **Resuelto**: en NestJS la ruta HTTP de un controller es independiente del módulo que lo declara — `CosmeticEquipmentController` se registra en `UserModule` (mismo lugar que `PublicProfileController`), con el path `gamification/me/cosmetics`, y orquesta exactamente como títulos: `UserService` resuelve/valida `public_profile`, delega a `CosmeticEquipmentService` (vive en `GamificationModule`, exportado). Cero dependencia circular, cero patrón nuevo.

**Semántica de equipar** (`PUT /gamification/me/cosmetics/equipped/:slot`, cuerpo `{ inventoryItemId }` — `PUT` porque "cosmético equipado en este slot" es un recurso con identidad estable, idempotente por diseño):
- Re-equipar el MISMO cosmético: `UPSERT` sobre la PK `(publicProfileId, cosmeticSlot)` — no-op idempotente.
- Reemplazar el cosmético del slot: mismo `UPSERT` — una sola fila, un solo `UPDATE`, atómico por construcción (nunca borrar+insertar).
- `inventoryItemId` ajeno o inexistente → 404 (nunca 403, mismo criterio que títulos: no filtra existencia).
- `inventory_item.ownershipStatus != ACTIVE` (`REVOKED`/`SUPERSEDED`) → 409, sin reactivar la propiedad (§4.19 ya fijó esa regla a nivel de entrega; 5.b la respeta al no ofrecer ningún camino que la contradiga).
- `cosmetic_item.itemType != :slot` de la URL → 409 (mismo código que "no ACTIVE": ambos son conflictos de estado de negocio, no de identidad).
- Perfil público inexistente → 404.

**`GET /gamification/me/cosmetics`** → `{ owned: CosmeticSummary[], equipped: Record<CosmeticSlot, CosmeticSummary | null> }`. `owned` lista `inventory_item` `ACTIVE` de la cuenta — no depende de tener `public_profile` (propiedad y presentación son capas separadas, §4.3). `equipped` siempre expone las 4 claves de `CosmeticSlot`, en `null` si la cuenta nunca creó perfil o nunca equipó ese slot — nunca un objeto parcial.

**Concurrencia**: sin advisory lock (a diferencia de `ChallengeService.claim`, §4.17) — equipar es un `UPSERT` de una sola fila sobre su propia clave primaria, sin interacción con el mecanismo de entrega de recompensas que motivó ese lock. Dos `PUT` concurrentes al mismo slot se serializan por el propio `UPSERT` de Postgres: el resultado final es determinista (una fila, el valor de una de las dos solicitudes), sin duplicados ni error 500.

**Anonimización**: `UserService.anonymizePublicProfileForAccountClosure` se extiende para `DELETE FROM equipped_cosmetic WHERE public_profile_id = ...` (las hasta 4 filas, una por slot) en la MISMA transacción que ya limpia `equipped_title` — cumple lo ya anunciado en §4.10.

**Confirmado explícitamente fuera de 5.b**: desequipamiento explícito sin reemplazo, catálogo público, superficie móvil (5.c), economía/tienda, edición de `assetReference`, reactivación de propiedad, más de una insignia (`BADGE`) equipada simultáneamente (un solo slot `BADGE`, igual que cualquier otro — múltiples insignias exigiría un modelo distinto, no decidido).

**Sin ADR nuevo**: mismo criterio que 3.b — reutiliza el mecanismo de coordinación de ADR-0018 sin introducir una decisión arquitectónica nueva.

### 4.21 Sub-incremento 5.c: superficie móvil de cosméticos (2026-08-05)

Cierra el Incremento 5 en su alcance backend+móvil: consumo y presentación de lo que 5.b ya expone, sin evaluación ni lógica de negocio nueva en el cliente — mismo criterio que 4.d.

**Ubicación** (decisión de producto): Cosméticos vive dentro de **Perfil** (`app/(tabs)/perfil.tsx`), como una nueva sección "Personalización" (`components/cosmetics-section.tsx`) añadida bajo el formulario de perfil existente, dentro de un `ScrollView` nuevo (la pantalla no tenía scroll — necesario para que los 4 slots quepan sin recortar el botón de cerrar sesión). Ningún tab nuevo, ninguna ruta nueva.

**Cliente tipado**:
- `lib/api/client.ts`: se añade `'PUT'` a la unión de métodos de `apiRequest` (solo tenía `GET|POST|PATCH|DELETE`) — extensión mínima necesaria, sin tocar el resto del wrapper.
- `lib/api/cosmetics.ts`: `listCosmetics()` (`GET /gamification/me/cosmetics`) y `equipCosmetic(slot, inventoryItemId)` (`PUT .../equipped/:slot`), mismo patrón que `lib/api/challenges.ts`.
- `lib/cosmetics/equip-outcome.ts`: mapeo puro `ApiResult -> EquipCosmeticOutcome` (`ok`/`reload`/`conflict`/`network`/`error`) — solo traduce status HTTP, nunca reinterpreta reglas de negocio ya decididas por 5.b (propiedad, `ownershipStatus`, coincidencia de slot). `import type` de `ApiResult` a propósito (se elide en compilación) — gateable con `tsx` puro, mismo criterio que `claim-outcome.ts` (4.d).
- `lib/cosmetics/group-cosmetics.ts`: `COSMETIC_SLOTS` (los 4 slots fijos), `SLOT_LABEL`, `groupOwnedCosmetics` (agrupación de `owned` por `itemType` — puramente de presentación, sin decidir a qué slot pertenece cada cosmético).

**Pantalla** (`CosmeticsSection`, dentro de `perfil.tsx`): estados `loading`/`error`/`ready` (mismo `ScreenState` que otras pantallas). Los 4 slots (`AVATAR`/`AVATAR_FRAME`/`PROFILE_BANNER`/`BADGE`) se renderizan **siempre**, en el mismo orden, independientemente de si `owned`/`equipped` están vacíos — cada tarjeta muestra el cosmético equipado (o "Sin equipar") y, al tocarla, expande la lista de cosméticos poseídos de ESE slot (o un mensaje "Todavía no posees cosméticos de este tipo" si está vacío).

**Bloqueo de doble toque, por SLOT (no global)** — decisión explícita, distinta de 4.d: dos `PUT` a slots distintos pueden coexistir sin conflicto en el backend (Gate 66, verificado con concurrencia real en 5.b), así que bloquear los 4 slots mientras uno está en curso sería una restricción de UI sin respaldo en el backend. Un `equippingSlot: CosmeticSlotValue | null` deshabilita únicamente las filas de selección y el toggle de ESE slot; los otros tres permanecen operables.

**Sin equipamiento optimista** (mismo criterio que 4.d, nunca `CLAIMED`/equipado antes de la respuesta real):
1. El estudiante toca un cosmético poseído de un slot.
2. Se bloquea ese slot (`equippingSlot = slot`), se limpia su error previo.
3. Se ejecuta el `PUT`.
4. Solo tras una respuesta 200 el estado local de `equipped[slot]` se reemplaza con `outcome.data` (dato real del servidor) y el selector se cierra.
5. Ante cualquier otro resultado, el equipamiento anterior se conserva sin cambios.

**Reacción a cada resultado del `PUT`**:
- `ok` (200): actualiza `equipped[slot]` localmente con la respuesta real, cierra el selector.
- `reload` (404 — perfil inexistente o inventario desactualizado): descarta el estado local y recarga TODO (`load()` — `owned` + `equipped` completos), no se intenta adivinar qué cambió.
- `conflict` (409 — cosmético ya no disponible o slot equivocado): conserva el equipamiento anterior, muestra un mensaje inline en ESE slot, cierra el selector.
- `network`/`error`: mismo tratamiento que `conflict` — conserva el equipamiento anterior, mensaje inline, reintentable (el estudiante puede volver a tocar el cosmético).

**Tema claro/oscuro**: `useThemedStyles`/`useTheme`, únicamente tokens semánticos, mismo criterio que 4.d/ADR-0015. `Perfil` se reestructuró con un `ScrollView` (`styles.scroll`/`styles.scrollContent` nuevos) manteniendo "Cerrar sesión" fuera del scroll, fijo al fondo (antes usaba `marginTop: 'auto'` dentro de un único `View`; ahora es un hermano del `ScrollView`, con `marginTop: 12` fijo).

**Fuera de 5.c, confirmado**: sin desequipar sin reemplazo, sin tienda/monedas, sin compra, sin edición de `assetReference`, sin múltiples insignias simultáneas, sin catálogo público, sin subida de imágenes, sin animaciones complejas, sin cambios de backend (el único cambio fuera de `apps/mobile` es la adición de `'PUT'` a la unión de métodos del propio cliente móvil, que no es un cambio de backend).

**Verificación real ejecutada en esta sesión** (no solo el gate de lógica pura — ver Evidencia de validación más abajo): sesión autenticada real vía `expo start --web` contra el backend real, incluyendo el flujo completo `sin cosméticos → con cosméticos → equipar → reemplazar → persistencia tras recarga`, contra datos insertados directamente en Postgres (no fixtures de gate) y limpiados al finalizar. Verificación visual real en Android (dispositivo/emulador, tema claro/oscuro) queda explícitamente diferida al cierre formal del Bloque III, junto con la de Desafíos (4.d) — instrucción explícita del Product Owner, no un olvido.

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

#### Sub-incremento 5.a — Fundación de persistencia y entrega (§4.19)

| # | Gate | Qué verifica |
|---|---|---|
| 47 | Catálogo inmutable por diseño de repositorio | `CosmeticItemRepository` no expone `update()`/`delete()` — mismo criterio que `TitleDefinitionRepository`. |
| 48 | `UNIQUE(item_key)` | Rechaza un `cosmetic_item` con `itemKey` duplicado. |
| 49 | Adquisición idempotente, `UNIQUE(accountId, cosmeticItemId)` | Un segundo intento de adquirir el mismo cosmético para la misma cuenta devuelve la fila ya existente, sin duplicar. |
| 50 | Entrega real desde `LEVEL` | Un nivel con `reward_bundle` que incluye `COSMETIC` entrega `inventory_item` vía el mismo mecanismo ya usado para `XP_BONUS`/`TITLE` en esa fuente. |
| 51 | Entrega real desde `ACHIEVEMENT_UNLOCK` | Un logro con recompensa `COSMETIC` entrega `inventory_item` vía el mismo mecanismo. |
| 52 | Entrega real desde `CHALLENGE_CLAIM` | Un claim de desafío con recompensa `COSMETIC` entrega `inventory_item` vía el mismo mecanismo (§4.17). |
| 53 | Reintento no duplica la entrega | Reprocesar el mismo componente/grant no crea una segunda `inventory_item` ni reabre un `deliveryStatus` ya `DELIVERED`. |
| 54 | Referencia cosmética inexistente rechazada | Trigger rechaza `reward_bundle_item`/`reward_grant_component` con `component_type = COSMETIC` y `reference_id` inexistente en `cosmetic_item`, en AMBAS tablas — sin afectar `XP_BONUS`/`TITLE`. |
| 55 | Sin `DELIVERED` si falla el inventario | Si la creación de `inventory_item` falla, el componente queda `FAILED`, nunca `DELIVERED`. |
| 56 | Propiedad `REVOKED`/`SUPERSEDED` no se reactiva silenciosamente (§4.19) | Una nueva entrega sobre un `inventory_item` ya no `ACTIVE` no cambia su `ownershipStatus` — se trata como entrega ya resuelta, sin reactivar. |
| 57 | Sin camino de entrega paralelo | Verificación estática: ninguna ruta de código crea `inventory_item` fuera de `deliverCosmeticComponent`/`InventoryItemRepository`. |
| 58 | Componentes `COSMETIC`/`PENDING` históricos, documentados no silenciados (§4.19) | Se deja constancia explícita de cuántos `reward_grant_component` `COSMETIC` siguen `PENDING` de antes de 5.a — limitación conocida, no una reconciliación automática. |

#### Sub-incremento 5.b — Equipamiento (§4.20)

| # | Gate | Qué verifica |
|---|---|---|
| 59 | `PUT` idempotente ante el mismo valor | Reclamar el mismo `inventoryItemId` dos veces para el mismo slot produce el mismo resultado, sin duplicar filas. |
| 60 | Reemplazo atómico de un slot ya ocupado | Equipar un `inventoryItemId` distinto en un slot ya ocupado actualiza la MISMA fila (`UPDATE`, nunca borrar+insertar). |
| 61 | Propiedad exclusiva del equipamiento | `PUT` con un `inventoryItemId` ajeno o inexistente responde 404 — nunca 403, nunca filtra existencia (mismo criterio que Gate 37). |
| 62 | Sin equipar propiedad no activa | `PUT` con un `inventoryItemId` `REVOKED`/`SUPERSEDED` responde 409, sin reactivar la propiedad. |
| 63 | Coincidencia de slot exigida en el endpoint | `PUT` con un `inventoryItemId` cuyo `itemType` no coincide con `:slot` responde 409. |
| 64 | `GET` funciona sin perfil público | Una cuenta sin `public_profile` recibe `owned` poblado normalmente y `equipped` con las 4 claves en `null` — nunca un error. |
| 65 | Las cuatro claves de `equipped` existen siempre | La respuesta de `GET` incluye `AVATAR`/`AVATAR_FRAME`/`PROFILE_BANNER`/`BADGE` en todos los casos, incluso sin perfil o sin nada equipado — nunca un objeto parcial. |
| 66 | Concurrencia sin duplicados ni error | Dos `PUT` concurrentes con cosméticos distintos para el mismo slot terminan con exactamente una fila válida, cuyo valor corresponde a una de las dos solicitudes — sin 500, sin fila duplicada. |
| 67 | Anonimización limpia el equipamiento cosmético | `anonymizePublicProfileForAccountClosure` elimina las filas de `equipped_cosmetic` del perfil anonimizado (todas las que existan, hasta 4), sin tocar `inventory_item` (propiedad). |
| 68 | Sin dependencia circular de módulos | Verificación estática: `GamificationModule` no importa `UserModule` — el controller de cosméticos vive en `UserModule` pese a su ruta `gamification/me/*`. |

#### Sub-incremento 5.c — Superficie móvil (§4.21)

| # | Gate | Qué verifica |
|---|---|---|
| 69 | Contrato tipado del `GET`/`PUT` | `lib/api/cosmetics.ts` usa los esquemas Zod de `@axioma/contracts` (`listCosmeticsResponseSchema`/`equipCosmeticResponseSchema`) — sin tipos redefinidos a mano. |
| 70 | Los 4 slots existen siempre | `COSMETIC_SLOTS` tiene exactamente `AVATAR`/`AVATAR_FRAME`/`PROFILE_BANNER`/`BADGE`, sin depender del inventario recibido. |
| 71 | Agrupación correcta por tipo | `groupOwnedCosmetics` particiona `owned` en sus 4 grupos según `itemType`, sin decidir a qué slot pertenece cada cosmético (eso ya lo fijó el backend). |
| 72 | Inventario vacío no rompe la agrupación | Con `owned = []`, los 4 grupos existen como arrays vacíos — ninguno es `undefined`. |
| 73 | Selección limitada al slot equivalente | La UI solo ofrece, dentro del selector de un slot, los cosméticos de `grouped[slot]` — nunca cosméticos de otro `itemType`. |
| 74 | Doble toque bloqueado por slot | `equippingSlot` deshabilita la selección y el toggle de ESE slot mientras su `PUT` está en curso; los otros 3 slots permanecen operables (verificado por diseño: `equip-outcome.ts` no coordina entre slots). |
| 75 | Ningún estado optimista | `equipped[slot]` solo se actualiza en la rama `outcome.kind === 'ok'`, con `outcome.data` (dato real del servidor) — verificado por inspección: ninguna otra rama toca `equipped`. |
| 76 | `404`/`409` provocan reconciliación o conservación segura | `mapEquipResult`: 404 → `reload` (recarga completa); 409 → `conflict` (conserva el equipamiento anterior, mensaje inline) — mapeo puro, sin requerir `itemType`/slot para decidir (Gate verificado en `verify:cosmetics-gate`). |
| 77 | Cosméticos equipados correctamente identificados | Con un inventario poblado y un slot equipado, la tarjeta de ESE slot muestra el nombre del cosmético equipado (no "Sin equipar"), y ese mismo ítem aparece marcado "Equipado" (no seleccionable de nuevo) dentro de su selector expandido. |
| 78 | Sin lógica de negocio duplicada | Verificación por diseño: `mapEquipResult` no recibe ni necesita `itemType`/`ownershipStatus`/propiedad para decidir su resultado — solo el status HTTP ya decidido por el backend (5.b). |

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

**Confirmación para sub-incremento 5.a (2026-08-05)**: `deliverCosmeticComponent`, los triggers de referencia `COSMETIC`, y la política de no reactivación silenciosa de propiedad `REVOKED`/`SUPERSEDED` (§4.19) replican exactamente el mecanismo y las decisiones ya construidas en 3.a para `TITLE` — **no requiere ADR propio**, mismo criterio de confirmación incremento a incremento que 4.a/4.b/4.c.

**Confirmación para sub-incremento 5.b (2026-08-05)**: `equipped_cosmetic`, su trigger de consistencia, y la coordinación de anonimización (§4.20) replican exactamente el mecanismo ya construido en 3.b para `equipped_title`, extendido a multi-slot (decisión de modelado ya fijada en §4.10, no nueva). La resolución de la ruta HTTP (`CosmeticEquipmentController` en `UserModule`, path `gamification/me/*`) es una decisión de organización de código, no de arquitectura del sistema — **no requiere ADR propio**.

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

### Evidencia de validación — Incremento 5, sub-incremento 5.a ("Fundación de persistencia y entrega de cosméticos", 2026-08-05)

Implementado, contra el alcance fijado en §4.19: `cosmetic_item`/`inventory_item` (migración `20260805042438_cosmetic_foundation`), los dos triggers de referencia `COSMETIC` (calco exacto de los de `TITLE`, 3.a), `RewardEvaluationWorker.deliverCosmeticComponent` (nueva rama en `deliverBundleComponents`, ambas ramas de invocación), y la política de no reactivación silenciosa de `ownershipStatus`.

**Correcciones encontradas al gatear** (no anticipadas en el alcance aprobado, resueltas antes de cerrar 5.a):
- Dos gates de sub-incrementos ya cerrados (`verify-reward-delivery-xp-bonus-gate.ts`, 1.c; `verify-achievement-progress-unlock-gate.ts`, 2.b) tenían `'inventoryItem'` en su lista de símbolos prohibidos para `reward-evaluation.worker.ts` — vigente mientras `COSMETIC` no tenía entrega real. Se retiró de ambas listas, mismo criterio ya aplicado en 4.b/4.c para `'ChallengeDefinition'`/`'accountTitle'`.
- `verify-reward-delivery-xp-bonus-gate.ts` (1.c) tenía un fixture con `{ componentType: 'COSMETIC', referenceId: randomUUID() }` (un UUID inventado, válido antes de 5.a porque `COSMETIC` no se validaba) — el nuevo trigger de referencia lo rechaza de inmediato, rompiendo la creación del bundle. Corregido creando un `cosmetic_item` real para el fixture; los checks de esa sección se actualizaron para reflejar que el componente `COSMETIC` ahora SÍ se entrega (antes se afirmaba que quedaba `PENDING` para siempre, correcto solo hasta 5.a).
- `verify-reward-foundation-gate.ts` (1.a) tenía el mismo patrón para su test "CHECK rechaza COSMETIC con xp_amount no nulo" (`referenceId: randomUUID()`) — el trigger nuevo se disparaba ANTES que el CHECK de coherencia (los triggers `BEFORE INSERT` corren antes de evaluar los `CHECK`), enmascarando la verificación original. Corregido con el mismo patrón que ya existía en ese archivo para `TITLE` (`titleDefinitionFixture`): se añadió un `cosmeticItemFixture` real.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:cosmetic-foundation-gate` (nuevo — catálogo inmutable, `UNIQUE(item_key)`, adquisición idempotente, entrega real desde `LEVEL`/`ACHIEVEMENT_UNLOCK`/`CHALLENGE_CLAIM`, reintento sin duplicados, referencia inexistente rechazada en ambas tablas, componente `FAILED` (nunca `DELIVERED`) si falla el inventario, propiedad `REVOKED` no reactivada, sin camino de entrega paralelo, componentes `COSMETIC`/`PENDING` históricos reportados) | **PASS** |
| `verify:reward-foundation-gate` (1.a, con la corrección de fixture arriba) | PASS |
| `verify:reward-evaluation-worker-gate` (1.b) | PASS, sin regresión |
| `verify:reward-delivery-xp-bonus-gate` (1.c, con la corrección de fixture y frontera arriba) | PASS, sin regresión funcional |
| `verify:achievement-foundation-gate` (2.a) | PASS, sin regresión |
| `verify:achievement-progress-unlock-gate` (2.b, con la corrección de frontera arriba) | PASS, sin regresión funcional |
| `verify:title-foundation-gate` (3.a) | PASS, sin regresión |
| `verify:title-equipment-gate` (3.b) | PASS, sin regresión |
| `verify:challenge-foundation-gate` (4.a) | PASS, sin regresión |
| `verify:challenge-progress-gate` (4.b) | PASS, sin regresión |
| `verify:challenge-claim-gate` (4.c) | PASS, sin regresión |
| `node scripts/verify-block-ii-gate.mjs` (consolidado Bloque I + II) | PASS, sin regresión |

**Limitación conocida, reportada por el propio gate**: 14 `reward_grant_component` `COSMETIC` en `PENDING` de corridas anteriores a 5.a (fixtures de gates ya cerrados que crearon bundles `COSMETIC` deliberadamente fuera de alcance) — el gate confirma que NINGUNO de los componentes que ÉL MISMO entregó quedó `PENDING`, y reporta el conteo histórico como información, sin intentar reconciliarlo (§4.19, decisión ya aceptada).

**Sin equipamiento, sin endpoints, sin superficie móvil** (5.b/5.c) — confirmado explícitamente por el gate.

### Evidencia de validación — Incremento 5, sub-incremento 5.b ("Equipamiento de cosméticos", 2026-08-05)

Implementado, contra el diseño fijado en §4.20: `equipped_cosmetic` (migración `20260805170952_cosmetic_equipment`), su trigger de consistencia (cuenta, propiedad activa, coincidencia tipo-slot, perfil activo) más el trigger de des-equipamiento atómico ante revocación (calco de `equipped_title`, 3.b), `CosmeticEquipmentService`/`CosmeticEquipmentController` (`GET`/`PUT /gamification/me/cosmetics[...]`, controller registrado en `UserModule` para evitar la dependencia circular ya identificada en el diseño), y la extensión de `PublicProfileRepository.anonymize()` para borrar `equipped_cosmetic`.

**Corrección real encontrada al regresionar** (no relacionada con 5.b en sí, pero descubierta al ejecutar su regresión): `verify-challenge-progress-gate.ts` (4.b) anclaba `windowStart = now - 1h` a la HORA exacta de ejecución del gate, no al día calendario — corriendo el gate después del mediodía UTC, `daysFromNow(0)` (mediodía UTC de hoy) quedaba fuera de ventana y la materialización fallaba en silencio (falso negativo dependiente de la hora del día, no un defecto de `evaluateChallenges`). Corregido anclando `windowStart` al inicio del día calendario UTC de hoy, no a la hora de ejecución. También se encontró que `UserService` había pasado a exigir `CosmeticEquipmentService` como cuarto parámetro del constructor, y dos gates (`verify-title-equipment-gate.ts`, `verify-public-profile-gate.ts`) seguían instanciándolo con solo 3 argumentos — invisible a `tsc` porque `scripts/` no está en `tsconfig.json`, y sin causar fallo mientras no se tocara `equipCosmetic`/`getCosmetics`; corregido pasando una instancia real de `CosmeticEquipmentService` en ambos.

**Nota de entorno, no de código**: varias corridas de gates HTTP consecutivas en esta sesión activaron el `ThrottlerModule` (100 req/60s, `app.module.ts`) — los fallos resultantes (`session.body.accountId` indefinido tras un 429) se confirmaron como saturación de throttling, no regresiones, esperando a que la ventana se liberara antes de reintentar.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:cosmetic-equipment-gate` (nuevo, HTTP real — GET sin perfil con las 4 claves en `null`, propiedad exclusiva 404, `REVOKED` rechazado sin reactivar, coincidencia de slot exigida, `PUT` idempotente, reemplazo atómico, dos `PUT` concurrentes sin 500 ni duplicados, anonimización, sin dependencia circular, sin `@Delete`, sin identidad → 401) | **PASS** |
| `verify:cosmetic-foundation-gate` (5.a) | PASS, sin regresión |
| `verify:challenge-claim-gate` (4.c) | PASS, sin regresión |
| `verify:challenge-progress-gate` (4.b, con la corrección de fecha arriba) | PASS |
| `verify:challenge-foundation-gate` (4.a) | PASS, sin regresión |
| `verify:reward-foundation-gate` (1.a) | PASS, sin regresión |
| `verify:reward-evaluation-worker-gate` (1.b) | PASS, sin regresión |
| `verify:reward-delivery-xp-bonus-gate` (1.c) | PASS, sin regresión |
| `verify:achievement-foundation-gate` (2.a) | PASS, sin regresión |
| `verify:achievement-progress-unlock-gate` (2.b) | PASS, sin regresión |
| `verify:title-foundation-gate` (3.a) | PASS, sin regresión |
| `verify:title-equipment-gate` (3.b, con la corrección de constructor arriba) | PASS |
| `verify:public-profile-gate` (con la corrección de constructor arriba) | PASS |
| `node scripts/verify-block-ii-gate.mjs` (consolidado Bloque I + II) | **PASS** (ejecutado post-corrección, salida real confirmada: gate consolidado Bloque I PASS, GAMIFICATION Progresión Visible PASS, USER Public Profile Foundation PASS) |

**Confirmado explícitamente fuera de 5.b** (por el gate): sin desequipamiento sin reemplazo (`@Delete` ausente del controller), sin catálogo público de `cosmetic_item`, sin superficie móvil (5.c).

### Evidencia de validación — Incremento 5, sub-incremento 5.c ("Superficie móvil de Cosméticos", 2026-08-05)

Implementado, contra el diseño fijado en §4.21: `lib/api/cosmetics.ts`, `lib/cosmetics/equip-outcome.ts`, `lib/cosmetics/group-cosmetics.ts`, sección `CosmeticsSection` (`components/cosmetics-section.tsx`) integrada en `perfil.tsx` (reestructurado con `ScrollView`), y `'PUT'` añadido a la unión de métodos de `lib/api/client.ts`.

**Verificación de lógica pura** (`verify:cosmetics-gate`, mismo criterio `tsx` sin runtime RN que `verify:challenges-gate`): 4 slots siempre presentes, agrupación correcta por tipo (incluyendo inventario vacío), mapeo `mapEquipResult` (200/404/409/network/otro) sin lógica de negocio duplicada — **PASS**, sin fallos.

**Verificación real end-to-end ejecutada en esta sesión** (no solo la lógica pura): backend real levantado (`nest start`, PostgreSQL vía Docker), `expo start --web` con `EXPO_PUBLIC_AUTH_IDENTITY_CLIENT=stub` (ya configurado en `apps/mobile/.env`, sin tocar), sesión real autenticada contra `/auth/session`. Flujo verificado contra datos reales (insertados directamente en Postgres para esta verificación — no fixtures de gate — y eliminados al finalizar):
- Cuenta sin `public_profile` ni inventario: `GET` no falla, los 4 slots se renderizan con "Sin equipar" (Gate 64/70 consumidos correctamente por el cliente).
- Cuenta con inventario (2 `AVATAR` + 1 `BADGE`) pero sin `public_profile` ACTIVO: `PUT` responde 404 real → la pantalla ejecuta `reload()` (recarga completa), sin quedar en un estado inconsistente (Gate 76).
- Tras crear el `public_profile` (vía `POST /user/public-profile` real) y reintentar: `PUT` exitoso, el slot `AVATAR` pasa de "Sin equipar" a "Zorro Explorador" con la respuesta real del servidor.
- Reemplazo: equipar "Buho Sabio" en el mismo slot reemplaza atómicamente la fila (`equipped_cosmetic` confirmado en Postgres con exactamente 1 fila para `AVATAR`, valor actualizado) — sin fila duplicada, consistente con Gate 60/66 de 5.b.
- Persistencia real: recarga completa de la página (nueva sesión) muestra "Buho Sabio" todavía equipado — dato del servidor, no de estado local perdido.
- Tema oscuro: `resize_window` con `colorScheme: dark` + inspección de estilos computados confirma `color: rgb(245, 246, 248)` en el título "Personalización", exactamente `darkTokens.color.text.primary` (`#F5F6F8`) — sin hex nuevo, tokens aplicados correctamente.

**Datos de verificación limpiados**: cuenta, `auth_identity`/`auth_session`, `public_profile` (+ `profile_username_history`), `inventory_item` y los 3 `cosmetic_item` de prueba se eliminaron de Postgres al finalizar — no quedan residuos en la base de datos de desarrollo.

**Verificación visual real en Android (dispositivo/emulador) diferida explícitamente al cierre formal del Bloque III** — junto con la de Desafíos (4.d), instrucción explícita del Product Owner, no una omisión de esta sesión.

Gates ejecutados y su resultado:

| Gate/verificación | Resultado |
|---|---|
| `verify:cosmetics-gate` (nuevo, lógica pura — 4 slots siempre presentes, agrupación por tipo, mapeo 200/404/409/network/otro, sin lógica duplicada) | **PASS** |
| `verify:challenges-gate` (4.d, regresión) | PASS, sin regresión |
| `verify:offline-outbox-gate` (ADR-0011, regresión) | PASS, sin regresión |
| `tsc --noEmit` (mobile, `scripts/` incluido en `tsconfig.json`) | PASS, sin errores |
| `eslint app lib components` (mobile) | PASS, sin advertencias |
| Verificación manual real (`expo start --web` + backend real) | Descrita arriba — flujo completo equipar/reemplazar/persistir verificado contra datos reales |
| `node scripts/verify-block-ii-gate.mjs` (consolidado Bloque I + II, tras la manipulación manual de la base de datos de desarrollo) | **PASS** (ejecutado tras la limpieza de los datos de verificación, salida real confirmada: gate consolidado Bloque I PASS, GAMIFICATION Progresión Visible PASS, USER Public Profile Foundation PASS) |

**Confirmado explícitamente fuera de 5.c**: sin desequipar sin reemplazo, sin tienda/monedas/compra, sin edición de `assetReference`, sin múltiples insignias simultáneas, sin catálogo público, sin subida de imágenes, sin animaciones complejas, sin cambios de backend.

---

**Bloque III — definición formal, 9ª revisión (2026-08-05), CERRADA. Los siete ajustes de la auditoría crítica de la 2ª revisión permanecen incorporados; el modelo de equipamiento se mantiene normalizado (§4.10). Incremento 4 (Desafíos) completo (4.a-4.d). Incremento 5 (Cosméticos) completo: 5.a, 5.b y 5.c implementados y gateados (§4.19/§4.20/§4.21) — ningún ADR nuevo requerido (§6). Verificación visual real en Android (Desafíos y Cosméticos, tema claro/oscuro) confirmada por el Product Owner, incluyendo el fix del botón de Onboarding. Ver `docs/adr/BLOCK-III-CLOSURE-REPORT.md` para el cierre formal completo.**
