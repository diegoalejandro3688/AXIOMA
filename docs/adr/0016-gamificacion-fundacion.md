# ADR 0016 — Gamificación: Fundación (Bloque I, Learning Experience Foundation)

- **Estado**: Aprobada como decisión de arquitectura — pendiente de implementación y de gate de validación (ver "Validación"). No incluye código todavía.
- **Fecha**: 2026-08-03
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation, Bloque I (Roadmap Learning Experience Foundation, 8 bloques)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce un dominio nuevo (GAMIFICATION), convierte a PROGRESS en productor del Outbox de plataforma (hasta ahora solo AUTH/PRIVACY publicaban) y establece el mecanismo de comunicación entre ambos dominios para el resto de la fase.

## Contexto

El Kickoff de Learning Experience Foundation (Bloque V, §5.2) define Gamificación Avanzada y Competir como capacidades estratégicas que requieren, como base común, un registro autoritativo de actividad académica validada y XP (Data Model, Bloque 16). El roadmap de 8 bloques ya aprobado sitúa esta fundación como Bloque I, antes de cualquier capacidad visible al estudiante (ligas, insignias, títulos), siguiendo el principio del Kickoff §5.4: lo que genera información antes que lo que la visualiza.

ADR-0014 (Progress Foundation) dejó "gamificación" explícitamente fuera de su alcance y no da a PROGRESS ningún mecanismo de emisión de eventos hacia otros dominios. El único precedente de comunicación asíncrona entre dominios en el proyecto es el Outbox de plataforma introducido en ADR-0006: una infraestructura compartida (`platform/outbox/`, tabla `outbox_event`), explícitamente diseñada para admitir múltiples productores y consumidores futuros — el propio ADR-0006 nombra **Gamification** entre los consumidores previstos desde su redacción original. Este ADR resuelve cómo PROGRESS y GAMIFICATION se comunican, usando esa infraestructura ya construida y auditada (Architecture Review 1.0) en vez de diseñar un mecanismo nuevo.

## Decisión

### Mecanismo elegido: Evento, reutilizando el Outbox de plataforma de ADR-0006

PROGRESS se convierte en un nuevo **productor** del Outbox de plataforma ya existente. GAMIFICATION se incorpora como un nuevo **consumidor**, con su propio cursor sobre `outbox_event` — exactamente el patrón que ADR-0006 ya preveía ("cada uno leyendo la misma tabla con su propio cursor/criterio, sin que esto implique ningún cambio de esquema"). No se crea infraestructura nueva de mensajería; se reutiliza la existente sin modificarla.

**Eventos publicados por PROGRESS** (limitados a los hechos que PROGRESS ya produce hoy, mismo criterio de alcance mínimo que ADR-0006 aplicó a los 5 eventos reales de ANALYTICS):

- `student_response_recorded.v1` — payload mínimo: `{ accountId, questionVersionId, curriculumTopicId, isCorrect, respondedAt }`. Se publica al confirmar `StudentResponse` (ADR-0014).
- `curriculum_topic_completed.v1` — payload mínimo: `{ accountId, curriculumTopicId, completedAt }`. Se publica al transicionar `CurriculumTopicProgress.status` a `COMPLETED`.

Ambos con `schemaVersion = "v1"`, validación `.strict()` (mismo principio de payload mínimo de ADR-0006: nunca un DTO completo, nunca PII más allá de `accountId`).

**Actividades elegibles de Data Model §16.6 que NO tienen evento hoy** (completar un recurso, realizar un ensayo, completar un desafío, participar en una competencia, alcanzar un hito) quedan explícitamente fuera de este bloque: ninguno de esos hechos existe todavía como dato real producido por un dominio (Recurso/Ensayo/Desafío no están implementados). Se incorporarán como nuevos `eventKey` al mismo Outbox cuando el dominio que los produce exista — sin cambio de arquitectura, mismo mecanismo.

**`GamificationRelayWorker`** (análogo a `AnalyticsRelayWorker`, ADR-0006): cron periódico (`@nestjs/schedule`) + endpoint manual `POST /gamification/_internal/relay` (protegido por `InternalOpsGuard`, reutilizado de `platform/internal-ops/`, sin duplicar la clase). Por cada evento `PENDING` con `eventKey` reconocido:
1. Aplica las reglas de elegibilidad de Data Model §16.6 (excluye explícitamente los casos de no-elegibilidad ya listados: aperturas repetidas, eventos de prueba, etc. — no aplica en la práctica a estos dos eventos, que ya son hechos validados por PROGRESS, pero la regla se deja activa para futuros `eventKey` menos confiables).
2. Crea `validated_gamification_activity` con `source_domain = PROGRESS`, `source_entity_id` apuntando al hecho original, y `deduplication_key` derivado del `outbox_event.id` (evita doble procesamiento si el relay se ejecuta dos veces sobre la misma fila).
3. Calcula el `xp_amount` según `xp_rule` vigente (§16.9) y crea una `xp_ledger_entry` (`entry_type: otorgamiento`).
4. Actualiza `xp_balance` de forma incremental.

Un fallo en una fila no detiene el lote — mismo patrón exacto de `AnalyticsRelayWorker` (ADR-0006): la fila queda marcada para reintento, el resto del lote continúa.

### Semántica de entrega: best-effort, igual que ANALYTICS — decisión explícita

`ProgressService` publica al Outbox **después** de confirmar su propia transacción, nunca dentro de ella (mismo patrón de ADR-0006). Se acepta la misma pérdida ocasional puntual (crash entre el commit de PROGRESS y el insert en `outbox_event`) que ANALYTICS ya acepta, por la misma razón de fondo: GAMIFICATION no es ni debe ser un sistema de verdad operacional — la actividad académica real vive en PROGRESS, no en GAMIFICATION. Esto es consistente con Data Model §4.24 ("si Gamification falla, la actividad académica permanece válida") y con el propio principio de este bloque: la ausencia ocasional de una entrada de XP es tolerable; la corrupción o pérdida de un `StudentResponse` no lo sería, y este diseño no toca ese camino en absoluto.

### "Reversible" significa exclusivamente entrada compensatoria

Toda corrección sobre `xp_ledger_entry` se realiza mediante una nueva fila con `entry_type: reverso` y `reverses_entry_id` apuntando a la entrada original. Quedan excluidas por diseño: `UPDATE` sobre una fila existente, `DELETE` (lógico o físico), y cualquier forma de anulación in situ. La entrada original permanece intacta, visible y auditable en el historial; `xp_balance` se corrige únicamente por la suma neta de entradas (otorgamiento + reverso), nunca por alteración de una fila existente. Esta es la única definición de "reversible" válida para este bloque — no admite variantes de implementación.

### No-autoridad académica y no-autoridad de dominio (Data Model §4.20–4.21)

`GamificationRelayWorker` solo lee de `outbox_event` y solo escribe dentro de sus propias tablas (`validated_gamification_activity`, `xp_ledger_entry`, `xp_balance`). No existe, en ningún punto de este diseño, una escritura de GAMIFICATION hacia `StudentResponse` o `CurriculumTopicProgress`, ni un cálculo de dominio/mastery — ambas relaciones prohibidas explícitamente en Data Model §4.21 ("Gamification determine dominio") quedan estructuralmente imposibles, no solo evitadas por disciplina.

## Alternativas descartadas

- **Comando (llamada síncrona de PROGRESS a GAMIFICATION al confirmar una respuesta)** — descartado. Acopla la disponibilidad de PROGRESS a la de GAMIFICATION en el camino crítico de envío de respuestas, exactamente lo que Data Model §4.24 prohíbe evitar ("si Gamification falla, la actividad académica permanece válida"). Hacerlo "fire-and-forget" sin cola ni reintento reintroduce, sin sus garantías, el mismo problema que el Outbox ya resuelve — y hacerlo con cola/reintento propio duplicaría infraestructura ya construida y auditada (Architecture Review 1.0), violando el principio de simplicidad del Kickoff (§3.6: "cuando dos soluciones produzcan resultados equivalentes... se adoptará la alternativa de menor complejidad arquitectónica").
- **Consulta autorizada (GAMIFICATION solicita bajo demanda el estado de PROGRESS)** — descartado. Requeriría que PROGRESS exponga una superficie de consulta nueva basada en cursor/marca de tiempo ("responses desde X") que hoy no existe, para resolver un problema — enterarse de hechos ya ocurridos — que el Outbox ya resuelve con garantías de idempotencia y reintento ya probadas. Además, Data Model §16.5 describe explícitamente que GAMIFICATION "consumirá hechos **publicados** por los dominios propietarios" — lenguaje que ya apunta a un mecanismo de publicación, no de consulta activa.
- **Outbox transaccional estricto (publicación en la misma transacción que `StudentResponse`)** — descartado por el mismo motivo que ADR-0006 lo descartó para ANALYTICS: exigiría reabrir las transacciones ya aprobadas y validadas de PROGRESS (ADR-0014) sin que exista una necesidad real de entrega garantizada para un dominio que, por diseño, no tiene autoridad académica.
- **Tabla de outbox propia de GAMIFICATION, separada de `outbox_event`** — descartada: `outbox_event` ya es infraestructura de plataforma explícitamente diseñada para múltiples productores/consumidores; crear una tabla paralela duplicaría un mecanismo ya existente sin ningún beneficio.

## Consecuencias

- `ProgressService` gana una dependencia nueva hacia `OutboxService` (plataforma), no hacia `analytics/` ni hacia `gamification/` — misma relación de dependencia que ya tienen `AuthService`/`PrivacyService`, sin comprometer Master Context §4.20 (ninguna regla de dependencia existente se rompe: PROGRESS sigue sin depender de GAMIFICATION).
- Cualquier futuro productor de actividad elegible (Recurso, Ensayo, Desafío, cuando existan) sigue el mismo patrón: publicar al mismo `outbox_event`, sin infraestructura nueva. `GamificationRelayWorker` solo necesita reconocer el `eventKey` nuevo.
- Un dominio futuro que sí requiera entrega garantizada de sus eventos (no aplica a GAMIFICATION bajo este diseño) tendría que mover su publicación dentro de su propia transacción — decisión de ese dominio, no de este ADR, exactamente como ya lo dejó dicho ADR-0006.
- `xp_ledger_entry` queda, por diseño, como un libro contable append-only: ninguna herramienta operativa ni administrativa de bloques posteriores (Bloque VII, Plataforma Editorial) podrá editar ni borrar una entrada — solo compensar.
- El Bloque III (Gamificación Avanzada) y el Bloque II (Competir) heredan `validated_gamification_activity`/`xp_ledger_entry`/`xp_balance` como su única fuente de datos — no deberán, en ningún caso, leer `StudentResponse`/`CurriculumTopicProgress` directamente.

## Validación

**Pendiente.** Este ADR fija la decisión de arquitectura; no se ha iniciado implementación. El gate de este bloque (`GAMIFICATION-CORE`, ver definición formal del Bloque I) se ejecutará y documentará aquí una vez completados los pasos 6–8 del ciclo de bloque (Kickoff §4.2): implementación, validación técnica y actualización documental, antes del cierre formal del Bloque I.

## Enmienda (ver ADR-0017, 2026-08-03)

La sección "Mecanismo elegido" de este ADR asumía, citando a ADR-0006, que GAMIFICATION podía incorporarse como consumidor del Outbox de plataforma **"sin infraestructura nueva"**. Esa premisa era incorrecta: el esquema real de `outbox_event` no admite múltiples consumidores concurrentes (ver ADR-0017 para la demostración del fallo). La decisión de fondo de este ADR —Evento como mecanismo, sobre Comando y Consulta autorizada, con `GamificationRelayWorker` análogo a `AnalyticsRelayWorker`, semántica best-effort, y la definición de "reversible" como entrada compensatoria— **permanece vigente sin cambios**. Lo único que cambia es la infraestructura de entrega subyacente: `GamificationRelayWorker` se implementará desde el inicio contra `outbox_event_delivery` (ADR-0017), no contra `OutboxEventRepository.findPending()`/`markProcessed()`.

La reanudación de la implementación del Bloque I queda condicionada a que el Paso 1 de ADR-0017 (adaptación de ANALYTICS a `outbox_event_delivery`, con su gate de 38 comprobaciones sin regresiones) esté cerrado primero.
