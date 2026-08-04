# Bloque III — Definición Formal: Gamificación Avanzada

**Fecha**: 2026-08-03
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: III de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/BLOCK-II-CLOSURE-REPORT.md`, `docs/adr/BLOCK-II-DEFINITION.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0018-public-profile-foundation.md`
**Estado**: Definición revisada (2ª pasada, auditoría crítica del Product Owner incorporada). Pasos 1–6 del ciclo. **Sin implementación todavía.**

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
5. **Cosméticos (entrega directa)** — `cosmetic_item`/`inventory_item`/`equipped_cosmetic`, modelo de slots **normalizado** (§4.8 — decisión tomada tras analizar probabilidad de expansión, no simplificado a un slot único). Incluye extender `LevelDefinition` con `reward_bundle_id` (vacío encontrado en auditoría, ver §4.1).

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
| Niveles como fuente de recompensa | `LevelDefinition.reward_bundle_id` (extensión aditiva sobre el Bloque II) | 5 |
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

El Bloque II construyó `LevelDefinition` como escalera mínima, omitiendo `reward_bundle_id` (Data Model §16.11) por no ser necesario entonces. Resuelto en Incremento 5: columna nullable, migración aditiva, sin tocar `verify:gamification-progression-gate` (debe seguir en PASS sin modificarse).

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

Data Model ya modela `achievement_version` correctamente (con `unlock_rule`, `effective_from`/`until`, `approval_status` — mismo patrón que `xp_rule`/`gamification_program_version`). Se fija explícitamente que `achievement_progress`/`achievement_unlock` referencian **`achievement_version_id`**, nunca `achievement_definition_id` directamente — así, una versión nueva del criterio no reinterpreta progreso ya evaluado bajo la versión anterior. Ver Decision Gate 8 (§5).

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
| 21 | Antifraude — tope de repetición (cierra el Gate 8 pendiente del Bloque I) | Reutiliza el patrón `daily_cap` ya validado en el Bloque I como tope de completions elegibles por desafío/día — mecanismo real, no una declaración cualitativa. |

### Incremento 5 — Cosméticos, slots y niveles con recompensa

| # | Gate | Qué verifica |
|---|---|---|
| 22 | Un ítem por slot, solo si poseído y activo | `equipped_cosmetic` rechaza equipar un ítem no poseído, revocado, o en un slot incompatible. |
| 23 | Múltiples slots simultáneos sin interferencia (§4.10) | Equipar un cosmético en el slot `marco` no afecta lo equipado en `avatar`/`banner`/`insignia` de la misma cuenta — cada slot es independiente. |
| 24 | Cosméticos no alteran nada funcional | Ningún cosmético cambia dificultad, corrección o XP base. |
| 25 | Extensión de `LevelDefinition` sin regresión | Añadir `reward_bundle_id` no rompe `verify:gamification-progression-gate` (Bloque II) — mismo gate, sin modificar, debe seguir en PASS. |

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

## 7–10. Pendientes

Implementación incremental, validación técnica, actualización documental y cierre formal **no se inician todavía** — quedan para cuando el Product Owner autorice el paso a implementación.

---

**Bloque III — definición formal, 2ª revisión (2026-08-03). Los siete ajustes de la auditoría crítica quedaron incorporados; el modelo de equipamiento se mantiene normalizado (§4.10). Pendiente de revisión final del Product Owner antes de redactar ADR-0019.**
