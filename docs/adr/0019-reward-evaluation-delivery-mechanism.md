# ADR 0019 — Mecanismo de Evaluación y Entrega de Recompensas (Bloque III, Learning Experience Foundation)

- **Estado**: **Aprobada — pendiente de implementación.** Aprobada con precisiones obligatorias del Product Owner (2026-08-03): cursor por cuenta con reintento verificable (nunca omisión permanente), política explícita de tipos de `xp_ledger_entry` que disparan evaluación con gate de convergencia del ciclo recompensa→BONO→evaluación, máquina de estados completa de `reward_grant_component`/`reward_grant`, y precisión de que la recomputación usa siempre la versión de logro históricamente aplicable, nunca una posterior. Este documento ya incorpora esas precisiones. No incluye código todavía.
- **Fecha**: 2026-08-03
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation, Bloque III ("Gamificación Avanzada"), Incremento 1 ("Entrega de recompensas" + worker de evaluación transversal a Incrementos 1–4).
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context §11.9): Nivel 2 — introduce un mecanismo nuevo (worker de evaluación + entrega idempotente de recompensas) que lee datos ya propiedad de GAMIFICATION (Bloque I/II) y escribe entidades nuevas de este bloque, sin modificar ningún dominio ni componente ya cerrado y gateado.

## Alcance de este ADR (y lo que deliberadamente NO decide)

Por instrucción explícita del Product Owner, este ADR se limita **exclusivamente** al mecanismo de evaluación (worker) y entrega (`reward_grant`) de recompensas. Quedan fuera de su responsabilidad, tratados como entradas/salidas fijas que este ADR consume o produce sin rediseñarlos:

- **PROGRESS** — no se lee, no se modifica. El worker nunca referencia `StudentResponse`/`CurriculumTopicProgress`.
- **XP** — `XpGrantService`, `xp_rule`, `xp_ledger_entry` (Bloque I, ya cerrado y gateado) se **leen**, nunca se modifican. Este ADR no reabre ni altera esa lógica.
- **Inventario manual** — cualquier mecanismo de administración para otorgar ítems a mano (herramienta operativa/editorial) queda fuera — pertenece a Plataforma Editorial (Bloque VII), no a este incremento.
- **Public Profile** — `equipped_title`/`equipped_cosmetic` y su coordinación con retiro/anonimización (ADR-0018, extendida en `BLOCK-III-DEFINITION.md` §4.10) pertenecen a los Incrementos 3 y 5, no a este ADR. Este ADR entrega a la **propiedad** (`account_title`/`inventory_item`), nunca al equipamiento.
- **Reward Bundles como configuración** — `reward_bundle`/`reward_bundle_item` se tratan como datos de configuración ya definidos por Data Model §16.36, sin que este ADR diseñe herramientas de autoría, catálogos o flujos de aprobación para ellos. Este ADR decide cómo se **consumen** de forma idempotente y verificable, no cómo se **crean**.

## Contexto

`BLOCK-III-DEFINITION.md` (2ª revisión, auditoría crítica del Product Owner incorporada) ya fijó las políticas de fondo que este ADR debe formalizar en una implementación concreta:

- §4.4 — convención de clave de idempotencia por fuente de recompensa (`reward:{sourceEntityType}:{sourceEntityId}`).
- §4.5 — `reward_grant_component` debe ser snapshot desnormalizado, nunca referencia viva a `reward_bundle_item`.
- §4.8 — `challenge_definition` es inmutable por fila.
- §4.9 — garantías del worker: aislamiento de fallo por cuenta, idempotencia de lote, frontera de dominio propia.

Este ADR no redescubre esas decisiones — las implementa.

## Decisión

### 1. Disparador del worker: cursor **por cuenta**, nunca modificando `XpGrantService`

Se descarta cualquier diseño que dispare la evaluación de logros/desafíos de forma síncrona dentro de `XpGrantService.grantForActivity` (Bloque I, cerrado y gateado) — este ADR no lo toca. En su lugar, un nuevo componente (`RewardEvaluationWorker`) **consulta** `xp_ledger_entry` de forma periódica.

**Corrección obligatoria del Product Owner sobre el diseño inicial**: un cursor **global único** (`reward_evaluation_cursor`, fila única) tiene un defecto real: si la cuenta A falla al evaluarse mientras la cuenta B (con una `xp_ledger_entry` más reciente) se procesa con éxito en el mismo lote, avanzar el cursor global hasta el máximo `recordedAt` del lote deja la actividad de A **permanentemente** por debajo del cursor — nunca volvería a aparecer como pendiente, sin importar cuántas veces se corra el worker después. No es un caso hipotético: es exactamente el tipo de fallo silencioso que este proceso existe para prevenir.

**Diseño corregido**: cursor **por cuenta**, no global.

```sql
-- reward_evaluation_cursor: clave primaria account_id (no fila única)
CREATE TABLE reward_evaluation_cursor (
  account_id UUID PRIMARY KEY,
  last_processed_recorded_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_eligible_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Selección de cuentas pendientes en cada ejecución:

```sql
SELECT xle.account_id
FROM xp_ledger_entry xle
LEFT JOIN reward_evaluation_cursor c ON c.account_id = xle.account_id
WHERE xle.recorded_at > COALESCE(c.last_processed_recorded_at, '-infinity')
  AND now() >= COALESCE(c.next_eligible_at, '-infinity')
GROUP BY xle.account_id;
```

Por cuenta procesada **con éxito**: `last_processed_recorded_at` avanza a la `recordedAt` más reciente de esa cuenta en el lote, `attempts` se resetea a 0. Por cuenta que **falla**: `last_processed_recorded_at` **no avanza** — su actividad sigue siendo "pendiente" en la siguiente corrida, con garantía estructural (no solo de comportamiento) de que nunca queda omitida. `attempts` se incrementa y `next_eligible_at` aplica el mismo backoff acotado y creciente que `NO_RULE_BACKOFF_MS` (`XpGrantService`, Bloque I) — evita reintentar en bucle apretado una cuenta con un fallo persistente, sin dejar nunca de reevaluarla (no es backoff terminal, mismo criterio que Bloque I).

Disparo: cron periódico (`@nestjs/schedule`, mismo patrón que `XpGrantScheduler`) + endpoint interno `POST /gamification/_internal/evaluate-rewards` (protegido por `InternalOpsGuard`, reutilizado sin duplicar).

**Decision Gate nuevo**: forzar un fallo determinista en la cuenta A dentro de un lote que también contiene la cuenta B (que se procesa con éxito); confirmar que B avanza su cursor y A no; correr el worker de nuevo sin corregir la causa del fallo — A debe seguir apareciendo como pendiente (tras su `next_eligible_at`); corregir la causa y correr una vez más — A debe procesarse y avanzar. Ningún resultado alternativo (A omitida silenciosamente) es aceptable.

### 2. Qué tipos de `xp_ledger_entry` disparan evaluación, y convergencia del ciclo recompensa→BONO→evaluación

**Recomputo desde el origen, no acumulación**: cada pasada recalcula `achievement_progress.current_value` y el nivel actual desde `xp_balance`/`xp_ledger_entry` (mismo cálculo puro que `ProgressionService`, Bloque II, reutilizado, no reimplementado), en vez de incrementar un contador — evita el riesgo de desalineación que Bloque I ya evitó con `xp_balance` reconstruible, y es lo que hace la idempotencia de lote (Gate 27, `BLOCK-III-DEFINITION.md`) verificable por construcción: dos pasadas sobre el mismo estado producen el mismo resultado porque ninguna acumula sobre la anterior.

**Política de disparo**: los cuatro `entryType` (`OTORGAMIENTO`, `BONO`, `REVERSO`, `AJUSTE`) disparan una pasada de evaluación para la cuenta correspondiente — los cuatro alteran `xp_balance.lifetimeXp`, que es la entrada de la que dependen tanto el nivel como (indirectamente) el progreso de logros. No se filtra por tipo: filtrar excluyendo `BONO`/`REVERSO`/`AJUSTE` sería una optimización prematura que además complicaría el razonamiento de convergencia de abajo sin necesidad — el mecanismo de idempotencia (§3) ya garantiza que una pasada disparada por un tipo que no produce novedades simplemente no escribe nada.

**El riesgo real que exige un gate propio**: una `BONO` entregada por este mismo mecanismo (recompensa de nivel/logro que incluye XP) es en sí misma una `xp_ledger_entry` nueva — dispara una pasada de evaluación más. Sin una garantía de convergencia, un ciclo `recompensa → BONO → nueva evaluación → ¿nueva recompensa?` podría no terminar nunca.

**Argumento de convergencia** (por qué sí termina, no solo que se observó que termina):

1. El conjunto de recompensas "que le corresponden" a una cuenta en un instante dado (qué niveles ya alcanzados, qué logros ya satisfechos) es una función determinista y **monótona no decreciente** del `lifetimeXp` actual — el catálogo de niveles y logros es finito (Data Model: escalera de niveles acotada, catálogo de logros acotado).
2. Cada elemento de ese conjunto solo puede otorgarse **una vez** (idempotencia por clave, §3) — una vez otorgado, nunca vuelve a producir una nueva `reward_grant` ni, por lo tanto, una nueva `BONO` para ese mismo elemento.
3. Toda recompensa con componente `XP_BONUS` aporta una cantidad **no negativa** — se fija como invariante de `reward_bundle_item` para este mecanismo (un bundle que restara XP no es una "recompensa" y queda fuera de lo que este ADR entrega; si algún día se necesitara, requeriría su propia decisión).
4. Con (1)+(3), cada `BONO` entregado por este mecanismo solo puede mover el `lifetimeXp` hacia arriba o dejarlo igual, nunca producir un ciclo que vuelva a un estado ya visitado; con (2), el número de recompensas nuevas que puede desencadenar una cascada está acotado por el tamaño del catálogo (finito). Por lo tanto, tras un número finito de pasadas (como máximo, una por cada nivel/logro que la cuenta cruce en la cascada), una pasada de evaluación no encuentra nada nuevo que otorgar → no crea `reward_grant` → no crea `BONO` → no dispara una pasada siguiente. El ciclo termina por construcción, no por convención.

**Decision Gate nuevo (convergencia)**: construir un escenario donde un solo otorgamiento de XP dispara una cascada de N recompensas encadenadas (p. ej., cruza dos niveles y desbloquea un logro, cada uno con `XP_BONUS`); correr el worker repetidamente; confirmar que, a partir de la pasada N+1, no se escribe ningún `reward_grant` ni `xp_ledger_entry` nuevo — la cascada converge a un punto fijo verificable, no se asume.

### 3. Máquina de estados de `reward_grant`/`reward_grant_component`, completitud e idempotencia de entregas parciales

**`reward_grant_component.deliveryStatus`** — tres estados, transiciones estrictas:

```
PENDING ──(entrega exitosa)──► DELIVERED   [terminal, nunca vuelve a transicionar]
PENDING ──(fallo de entrega)──► FAILED
FAILED  ──(reintento exitoso)──► DELIVERED [terminal]
FAILED  ──(reintento fallido)──► FAILED    [permanece, reintentable indefinidamente con backoff]
```

`DELIVERED` es terminal por el mismo motivo que `xp_ledger_entry`/`achievement_unlock` son inmutables una vez ocurridos: es un snapshot de un hecho ya sucedido (§4.5) — ningún código de este mecanismo vuelve a escribir un componente ya `DELIVERED`.

**`reward_grant.grantStatus`** — **derivado** de los componentes, nunca escrito de forma independiente (evita que ambos se desalineen):

| Condición de los componentes | `grantStatus` | ¿Terminal? |
|---|---|---|
| Ninguno intentado todavía | `PENDING` | No |
| Al menos uno `DELIVERED`, al menos uno no | `PARTIAL` | No — se reintenta en la siguiente pasada |
| Todos `DELIVERED` | `GRANTED` | **Sí** |
| Al menos uno intentado, ninguno `DELIVERED` todavía | `FAILED` | No — reintentable, mismo backoff que §1 |

`REVERSED` (quinto valor que el Data Model reserva en `reward_grant.grant_status`) **no lo produce este mecanismo bajo ninguna circunstancia** — coherente con el principio no punitivo ya establecido (rachas, niveles): una recompensa entregada no se revierte automáticamente. Queda reservado para una futura herramienta administrativa (Plataforma Editorial, fuera de alcance) que no existe todavía.

**Idempotencia de entregas parciales**: reintentar un `reward_grant` en estado `PARTIAL`/`FAILED` reprocesa **únicamente** los componentes no `DELIVERED` — cada componente se entrega con su propia idempotencia (p. ej., `account_title`/`inventory_item` con restricción única `(accountId, titleDefinitionId)`/`(accountId, cosmeticItemId)`; XP vía `XpLedgerEntryRepository.createIdempotent`, que ya garantiza esto). Reintentar un componente ya `DELIVERED` nunca se ejecuta — se filtra antes de intentar, no se confía únicamente en la restricción de base de datos como única barrera (misma disciplina de dos capas que ya usa el reverso compensatorio de XP, Bloque I).

**Decision Gate nuevo**: forzar el fallo de un componente dentro de un `reward_grant` de varios componentes; confirmar `grantStatus = PARTIAL` y que los demás componentes SÍ quedaron `DELIVERED`; reintentar — confirmar que solo el componente fallido se reprocesa (los `DELIVERED` no se tocan, verificado comparando su `updatedAt`/ausencia de escritura) y que `grantStatus` pasa a `GRANTED`.

### 4. Logros: la recomputación usa siempre la versión históricamente aplicable, nunca una posterior

Precisión obligatoria del Product Owner: recalcular "desde el origen" (§2 de esta sección, más abajo) **no** significa reevaluar contra la configuración más reciente en cada pasada — significa recalcular el valor de progreso contra la **misma** `achievement_version` que ya se fijó la primera vez que esa cuenta empezó a trackear ese logro.

Regla exacta:
- La primera vez que el worker crea un `achievement_progress` para (cuenta, logro), fija `achievement_version_id` a la versión `APPROVED` vigente **en ese instante** (mismo criterio que `XpGrantService` elige la versión vigente en el momento de otorgar, ADR-0016) — y ese `achievement_version_id` **no vuelve a cambiar** para esa fila.
- Toda recomputación posterior de esa fila evalúa `current_value` contra el `unlock_rule` de **esa misma versión fijada**, sin importar si mientras tanto se aprobó una versión más nueva.
- Una versión nueva de un logro solo afecta a `achievement_progress` que se **cree** después de su aprobación — nunca reinterpreta filas ya existentes.

Para las otras dos fuentes, la misma pregunta no aplica por diseño ya fijado, no por descuido — se deja explícito para que quede completo:
- **Nivel**: `LevelDefinition` no tiene versión (escalera única, Bloque II) — no hay "versión histórica" que preservar porque no hay versiones.
- **Desafío**: `challenge_definition` es inmutable por fila (§4.8 de `BLOCK-III-DEFINITION.md`) — `account_challenge.progress_value` siempre se evalúa contra la misma fila que nunca cambia, por construcción.

**Decision Gate nuevo**: crear `achievement_progress` bajo la versión V1; aprobar una versión V2 con `unlock_rule` distinto; recomputar progreso de esa cuenta — confirmar que sigue evaluándose contra V1, y que una cuenta **nueva** que empieza a trackear el mismo logro después de aprobar V2 sí usa V2.

### 5. Entrega: `reward_grant` idempotente por convención de clave, con snapshot

Formaliza `BLOCK-III-DEFINITION.md` §4.4/§4.5 en esquema concreto:

```
reward_grant.idempotency_key = "reward:{sourceEntityType}:{sourceEntityId}"
```

`RewardGrantRepository.createIdempotent(...)` sigue el mismo patrón ya establecido por `XpLedgerEntryRepository.createIdempotent` (ADR-0016): captura `P2002` sobre `idempotency_key`, devuelve la fila existente sin duplicar, distingue `created` de `preexistente`.

Cada `reward_grant_component` almacena, en el momento de la entrega (nunca por referencia viva): `componentType` (`XP_BONUS` | `TITLE` | `COSMETIC`), `quantity` (para XP) o referencia estable (`titleDefinitionId`/`cosmeticItemId`) — capturada tal cual estaba el `reward_bundle_item` en el instante de la entrega — y `deliveryStatus`, cuya máquina de estados completa queda fijada en §3 arriba.

Entrega de un componente `TITLE`/`COSMETIC` = crear `account_title`/`inventory_item` (propiedad) — **nunca** `equipped_title`/`equipped_cosmetic` (fuera de alcance de este ADR, ver arriba). Entrega de un componente `XP_BONUS` = una `xp_ledger_entry` nueva vía el repositorio ya existente de Bloque I (`entryType: BONO`, ya modelado en el enum `XpLedgerEntryType` desde el Bloque I aunque sin uso real hasta ahora) — se **reutiliza** `XpLedgerEntryRepository.createIdempotent`, no se crea un camino de escritura paralelo hacia `xp_ledger_entry`.

### 6. Aislamiento de fallo y frontera de dominio

`RewardEvaluationWorker.run()` itera cuentas con actividad nueva; un error evaluando una cuenta se registra y el lote continúa (mismo patrón que `GamificationService.ingestPending()`/`XpGrantService.grantPending()`) — nunca una excepción no capturada detiene el resto.

Verificación estática de frontera (mismo método que Bloques I/II): ningún archivo de este incremento importa `StudentResponse`/`CurriculumTopicProgress`.

## Alternativas descartadas

- **Disparar la evaluación síncronamente dentro de `XpGrantService.grantForActivity`** — descartada por instrucción explícita del Product Owner y por principio: reabriría código ya cerrado y gateado en el Bloque I, acoplando su disponibilidad a la de un dominio nuevo (mismo error que Data Model §4.24 ya prohíbe evitar para GAMIFICATION↔PROGRESS, aplicado ahora en un nivel más).
- **Reutilizar el Outbox de plataforma (ADR-0006/0017) como fuente del disparador** — descartada: no existe hoy un evento de plataforma para "XP otorgado", y publicar uno nuevo solo para este propósito interno-al-dominio duplicaría infraestructura cuando `xp_ledger_entry` ya es una fuente de verdad directa, propia de GAMIFICATION, sin necesidad de cruzar el mecanismo de multi-consumidor pensado para comunicación *entre* dominios.
- **Acumulación incremental de `achievement_progress`** (sumar en cada evento en vez de recalcular) — descartada: reintroduce exactamente el riesgo de desalineación que Bloque I ya evitó con `xp_balance` reconstruible; recalcular desde el origen es más simple de verificar y hace la idempotencia de lote trivial por construcción, no por disciplina.
- **Entregar XP de recompensa por un camino de escritura propio (tabla o método nuevo) en vez de reutilizar `XpLedgerEntryRepository`** — descartada: duplicaría un mecanismo de idempotencia/inmutabilidad ya construido, auditado y gateado.

- **Cursor global único en vez de cursor por cuenta** — descartada tras la corrección obligatoria del Product Owner: un fallo aislado en una cuenta podía dejarla permanentemente por debajo del cursor si este avanzaba por lote en vez de por cuenta — exactamente el tipo de omisión silenciosa que el aislamiento de fallo debe impedir, no solo tolerar.
- **Filtrar el disparo de evaluación excluyendo `entryType` distintos de `OTORGAMIENTO`** — descartada: no elimina ningún riesgo real (la idempotencia ya absorbe las pasadas sin novedades) y sí complica sin necesidad el razonamiento de convergencia, que se apoya en tratar `lifetimeXp` como la única entrada relevante, sin importar qué tipo de entrada lo movió.
- **`reward_grant.grantStatus` como campo escrito independientemente de los componentes** — descartada: permite que el estado agregado y el detalle por componente diverjan (el mismo tipo de riesgo que ya se evitó al hacer `xp_balance` una proyección reconstruible en vez de una segunda fuente de verdad); se deriva siempre de los componentes.
- **Reevaluar el progreso de logros contra la versión `achievement_version` más reciente en cada pasada** — descartada por instrucción explícita del Product Owner: reinterpretaría hechos ya en curso con reglas que no existían cuando empezaron a trackearse, exactamente lo que la inmutabilidad de `xp_rule`/`achievement_version` ya evita en el resto del dominio.

## Consecuencias

- Nueva tabla `reward_evaluation_cursor` (clave primaria `account_id`, no fila única) — infraestructura mínima, sin relación con el Outbox de plataforma.
- `XpLedgerEntryRepository`/`XpBalanceRepository` (Bloque I) ganan un nuevo llamador (`RewardEvaluationWorker`) para el tipo `BONO`, ya contemplado en el enum desde su creación — sin cambio de esquema.
- `ProgressionService` (Bloque II) no se modifica; su función de cálculo de nivel se reutiliza (importada, no reimplementada) desde el nuevo worker.
- `achievement_progress` fija `achievement_version_id` en su creación y nunca lo reescribe — una nueva versión de un logro no reinterpreta progreso ya en curso.
- Los Incrementos 2–5 (Logros, Títulos, Desafíos, Cosméticos) consumen `RewardEvaluationWorker`/`reward_grant` como mecanismo ya resuelto — ninguno necesita su propio ADR salvo que revele una decisión arquitectónica nueva durante su propia definición previa a implementar.
- Este ADR **no** modifica PROGRESS, XP (más allá de reutilizar su repositorio ya existente para el tipo `BONO`), inventario manual, Public Profile, ni el diseño de `reward_bundle` como configuración.

## Validación

Pendiente — este ADR precede a la implementación. Decision Gates de `BLOCK-III-DEFINITION.md` §5 que este ADR debe satisfacer con evidencia real: 2, 3, 4, 5, 6, 7, 8 (Incremento 1) y 26, 27, 28 (worker), más los cuatro gates nuevos fijados por las precisiones de esta revisión:

1. Retry verificable del cursor por cuenta — una cuenta que falla nunca queda omitida permanentemente (§1).
2. Convergencia del ciclo recompensa→BONO→evaluación — una cascada de N recompensas no produce escritura alguna a partir de la pasada N+1 (§2).
3. Máquina de estados de `reward_grant_component`/`reward_grant` — transiciones estrictas, `grantStatus` derivado, reintento parcial sin re-entregar componentes `DELIVERED` (§3).
4. Versión históricamente aplicable de logros — una cuenta con progreso ya en curso bajo V1 sigue evaluándose contra V1 tras aprobar V2; una cuenta nueva usa V2 (§4).

Ninguno ejecutado todavía — se ejecutarán como parte de la implementación de este incremento, dentro del Bloque III.
