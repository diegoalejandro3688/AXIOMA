# ADR 0014 — Progress Foundation (Bloque III, Vertical Slice M1)

- **Estado**: **Aprobada formalmente** — gate completo ejecutado y verificado (2026-08-02): 34 comprobaciones de `verify-progress-gate.ts` en verde, recorrido real en navegador (Browser tool) contra el backend real, y regresión completa de EDUCATION/USER/PRIVACY/OFFLINE-OUTBOX sin hallazgos. Incluye los 8 ajustes obligatorios sobre la propuesta inicial, las 2 precisiones finales (404 vs. `NOT_STARTED`, disparadores del worker offline), y un hallazgo real corregido durante la verificación (ver "Hallazgo durante la verificación"). Ver "Validación" para el detalle.
- **Fecha**: 2026-08-02
- **Fase de aplicación**: Fase 1 — Vertical Slice M1, Bloque III (Roadmap AXIOMA Phase 1 Kickoff, §7.3)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce estructuras de persistencia nuevas, el primer endpoint de escritura de PROGRESS, y el primer consumidor real de la infraestructura offline de ADR-0011.

## Contexto

El Phase 1 Kickoff define Bloque III como: *"Registrar automáticamente el avance del estudiante durante una sesión de estudio"*, resultado esperado *"el progreso deja de ser temporal y pasa a formar parte permanente de la experiencia"*. PROGRESS-001 (PRD) ya distingue explícitamente **avance de contenido** de **evidencia académica** y **dominio estimado** (Data Model Bloques 12 y 13) — este bloque construye solo lo primero.

Este documento incorpora ocho ajustes obligatorios sobre la propuesta inicial, decididos por el usuario tras su revisión.

## Decisión

### 1. Renombrado: `CurriculumTopicProgress` (no `StudySession`)

La entidad representa avance acumulado por cuenta y tema, no una sesión delimitada. Se reserva `StudySession` para cuando exista una sesión real, cronometrada o reanudable (fuera de alcance hoy, sin necesidad demostrada — Data Model 11.14 la modela para exámenes, no para práctica libre).

```
CurriculumTopicProgress
  id                UUID
  accountId         UUID
  curriculumTopicId UUID
  status            IN_PROGRESS | COMPLETED   -- NOT_STARTED = ausencia de fila
  startedAt         timestamp
  lastActivityAt    timestamp
  completedAt       timestamp?

  @@unique(accountId, curriculumTopicId)
```

### 2. Integración obligatoria con PRIVACY

PROGRESS almacena actividad vinculada a `accountId` — impacto cruzado real sobre PRIVACY, reconocido explícitamente (ver "Impacto cruzado").

`ProgressService.deleteProgressForAccountClosure(accountId)`:
- `deleteMany` sobre `StudentResponse` y `CurriculumTopicProgress` filtrando por `accountId` — nunca lanza si no hay filas (mismo criterio que `UserService.deleteProfileForAccountClosure`, ADR-0008).
- Invocada desde `PrivacyService.runAccountDeletionSweep()`, dentro del mismo bloque `try` que ya invoca `authService.finalizeAccountClosure()` y `userService.deleteProfileForAccountClosure()`, **antes** de `markCompleted()`.
- Si falla, la excepción se propaga al mismo `catch` ya existente — la solicitud queda `PROCESSING` para reintento (patrón ya establecido desde ADR-0005), **nunca** se marca `COMPLETED` con una eliminación parcial.
- `PrivacyModule` pasa a importar `ProgressModule`, igual que ya importa `UserModule` (ADR-0008).

Los gates de PRIVACY (34 comprobaciones) se re-ejecutan como parte del gate de este bloque (ver "Validación", ítems 18-20).

### 3. API mínima de lectura — separación de responsabilidad explícita

**EDUCATION sirve contenido. PROGRESS sirve el estado particular del estudiante.** Ningún endpoint de EDUCATION cambia; PROGRESS expone su propio controlador, nunca mezclado con `/education/*`.

```
GET  /progress/topics/:topicId
POST /progress/topics/:topicId/responses
```

`GET /progress/topics/:topicId` distingue explícitamente dos estados que no deben confundirse:

- **`404`** — el `curriculumTopicId` no existe (verificado contra `CurriculumTopicRepository`, mismo patrón que `EducationService.getTopicOrThrow`). Un identificador inválido nunca debe leerse como "tema válido sin progreso" — son errores de naturaleza distinta (uno es un dato malformado o un tema retirado; el otro es un estado legítimo de un estudiante real).
- **`200`** — el tema existe. Si el estudiante todavía no tiene una fila de `CurriculumTopicProgress`, el cuerpo representa `NOT_STARTED` explícitamente (no es un caso de error, es el estado inicial esperado de cualquier tema no comenzado):

```json
{
  "curriculumTopicId": "...",
  "status": "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
  "startedAt": "...|null",
  "lastActivityAt": "...|null",
  "completedAt": "...|null",
  "responses": [
    { "questionVersionId": "...", "answerOptionId": "...", "isCorrect": true, "respondedAt": "..." }
  ]
}
```

Esto resuelve continuidad real: el cliente reconstruye qué se respondió, con qué alternativa, si fue correcto, y el estado de la unidad — sin que EDUCATION conozca nunca un `accountId`.

### 4. Idempotencia condicionada en el envío de respuestas

Orden de resolución en `ProgressService.submitResponse()`:

1. Buscar `StudentResponse` por `operationId` (clave de idempotencia transaccional, ver punto 5) → si existe, devolver esa fila tal cual (`200`), sin más validación.
2. Buscar por `(accountId, questionVersionId)` (invariante de negocio real) →
   - misma `answerOptionId` → `200`, devuelve la fila existente, no crea nada.
   - `answerOptionId` distinta → `409 Conflict`, cuerpo incluye la respuesta ya almacenada para que el cliente reconcilie su estado local — **nunca** se modifica la fila existente.
3. Si no existe ninguna → validar (ver punto 7), calcular `isCorrect`, crear `StudentResponse` (`201`).

**Unicidad en base de datos sobre `(accountId, questionVersionId)`** — autoridad real, no solo aplicación. Concurrencia: dos requests simultáneos que superan la comprobación inicial y ambos intentan `create()` → Postgres deja pasar solo un `INSERT`; el otro recibe `P2002`, se captura explícitamente (mismo patrón que `UserService.initializeProfile`, ADR-0008), se re-consulta la fila ganadora y se aplica la misma lógica de los puntos 1-2 contra ella — **nunca un 500**.

`student_response` es **inmutable tras crearse** — reforzado con un trigger de Postgres (`BEFORE UPDATE ON student_response` → `RAISE EXCEPTION`), mismo criterio que ADR-0012 usó para invariantes que Prisma no puede representar (ADR-0001: "PostgreSQL... autoridad de integridad").

### 5. Primer consumidor real de la Client Outbox (ADR-0011) — Opción B del Decision Gate 8.1

Protocolo offline **mínimo**, no el protocolo completo de Master Context §8.9:

- El cliente **siempre encola primero**: `OutboxRepository.enqueue({ operationType: 'submit_response', aggregateType: 'question_version', aggregateId: questionVersionId, payload: { curriculumTopicId, questionVersionId, answerOptionId } })`. El `id` que el repositorio genera (estable en reintentos, ya validado en ADR-0011) **es** el `operationId` — no se genera un campo separado.
- Inmediatamente después de encolar, se intenta un envío directo (`flushOperation`). Si hay red y el backend confirma → `markSynced()` de inmediato; la UI nunca percibe latencia de cola en el camino feliz.
- Si falla (sin red, error 5xx, timeout) → la fila queda `PENDING`; un worker mínimo (`syncPendingOperations()`, que drena `listPending()` en orden) se dispara ante estos eventos concretos — sin `NetInfo`, sin dependencia nueva, sin sync en segundo plano del sistema operativo:
  1. **Justo después de encolar** una operación nueva (intento inmediato, ya descrito arriba).
  2. **`AppState` pasa a `active`** (la app vuelve a primer plano) — cubre el caso "sin red al responder, con red al reabrir la app".
  3. **Al montar `estudio/[topicId].tsx`** (abrir la pantalla de una unidad) — antes de pedir `GET /progress/topics/:topicId`, se dispara un drenado best-effort; así una respuesta pendiente de una visita anterior se sincroniza antes de que la pantalla muestre el estado "oficial" del servidor, evitando una lectura que parezca ignorar una respuesta ya dada localmente.
  4. **Acción explícita del usuario**: el mismo botón "Reintentar" de `ErrorState` (ya construido en Bloque II) invoca el worker antes de reintentar la lectura, cuando la pantalla detecta operaciones `PENDING`/`FAILED` propias.
  No hay temporizador ni polling periódico — los cuatro disparadores son eventos concretos del ciclo de vida de la app o de la interacción del usuario, nunca "cada N segundos".
- El backend usa `operationId` (= `id` de la operación encolada) como clave de idempotencia — ver punto 4, paso 1.
- El servidor sigue siendo la única autoridad de `isCorrect`, `respondedAt` y el estado de `CurriculumTopicProgress` — el payload encolado nunca los incluye.
- Una respuesta `409` (conflicto real, no reintento) o `400` (validación) desde el backend es un **fallo permanente** → `markFailed()`, diagnosticable vía `last_error` (ya existente en el esquema de ADR-0011). Un fallo de red/`5xx` es **transitorio** → la fila permanece `PENDING`, sin tocar `sync_status`, para reintento en la siguiente pasada del worker.

**Explícitamente fuera de alcance** (tal como se pidió): cursores, reconciliación bidireccional, conflictos complejos más allá del 409 simple, background sync del sistema operativo, batches, resultados parciales, reordenamiento.

### 6. `COMPLETED` monotónico

Tras registrar una `StudentResponse` válida, el servicio cuenta preguntas publicadas del tema vs. preguntas distintas respondidas por la cuenta en ese tema. Si coinciden y el estado actual no es ya `COMPLETED` → transición a `COMPLETED`, `completedAt = now()`. La transición es **estrictamente hacia adelante**: no existe ninguna ruta de código que reevalúe "¿sigue completo?" y downgrade — reforzado con un trigger (`BEFORE UPDATE ON curriculum_topic_progress` → rechaza `OLD.status = 'COMPLETED' AND NEW.status = 'IN_PROGRESS'`). Publicar una pregunta nueva en el tema no dispara ningún recálculo retroactivo. `REQUIERE_REPASO` y `ACTUALIZADA_CON_CONTENIDO_NUEVO` (PROGRESS-003) siguen diferidos — necesitan evidencia/versionado que no existe en M1.

### 7. Validaciones de servidor antes de registrar una respuesta

En `ProgressService.submitResponse(accountId, topicId, { questionVersionId, answerOptionId, operationId })`:

1. `QuestionVersion.editorialStatus === 'PUBLISHED'` (join a `question_version`).
2. `Question.status === 'ACTIVE'` (identidad lógica no retirada — join a `question` vía `questionVersion.questionId`).
3. `AnswerOption.questionVersionId === questionVersionId` recibido (la alternativa pertenece de verdad a esa versión).
4. `QuestionVersion.curriculumTopicId === topicId` (parámetro de ruta) — la pregunta pertenece al tema cuyo progreso se actualiza.
5. `accountId` viene exclusivamente de `AuthGuard`/`request.accountId` — nunca del cuerpo.
6. El esquema Zod de la petición (`submitResponseRequestSchema`) **no declara** `isCorrect`, `respondedAt` ni estado de la unidad — no es posible enviarlos; el servidor los calcula siempre.

Cualquier fallo de 1-4 → `400`/`404` explícito, sin crear fila.

## Entidades mínimas (resumen)

| Entidad | Campos | Dominio |
|---|---|---|
| `CurriculumTopicProgress` | `id, accountId, curriculumTopicId, status, startedAt, lastActivityAt, completedAt` | PROGRESS |
| `StudentResponse` | `id, accountId, questionVersionId, answerOptionId, isCorrect, respondedAt, operationId` | PROGRESS |

Ambas referencian entidades de EDUCATION (`questionVersionId`, `curriculumTopicId`, `answerOptionId`) — consistente con la regla ya fijada: *"Progress podrá depender de Education y User"* (Master Context §6.21). Ninguna entidad ni endpoint de EDUCATION se modifica.

## Explícitamente fuera de alcance

- `academic_evidence` (Data Model Bloque 12) y todo el sistema de dominio/mastery (Bloque 13).
- Estados `REQUIERE_REPASO` / `ACTUALIZADA_CON_CONTENIDO_NUEVO`.
- Ensayos, cronometraje, pausas, adaptaciones — `StudySession` real queda para cuando exista esa necesidad.
- Motor de recomendaciones, repaso basado en errores, gamificación.
- Reintento/edición de una respuesta ya enviada (409 explícito, no modificación).
- Progreso agregado por materia/eje (`subject_progress_state`).
- Protocolo completo de sincronización (cursores, reconciliación bidireccional, batches) — ver punto 5.

## Impacto cruzado sobre dominios existentes

- **EDUCATION**: sin cambios de esquema ni de endpoints. `ProgressService` lee (nunca escribe) `QuestionVersion`/`Question`/`AnswerOption` vía los repositorios ya existentes de Bloque I, más un método de lectura puntual por id que hoy no existe (`AnswerOptionRepository.findById`, `QuestionVersionRepository.findById`).
- **PRIVACY**: impacto real y reconocido — ver punto 2. `PrivacyModule` gana una dependencia nueva (`ProgressModule`).
- **AUTH**: consumidor estándar de `AuthGuard`, sin cambios.
- **OFFLINE-OUTBOX (ADR-0011)**: primer consumidor real — ver punto 5. Sin cambios de esquema en `outbox_operation` (el `payload` genérico ya lo soporta).
- **Mobile (Bloque II)**: `estudio/[topicId].tsx` pasa de mostrar alternativas como texto a botones interactivos con feedback inmediato; nuevo `lib/api/progress.ts`; el worker de sincronización se integra junto al `AuthProvider`.
- Sin impacto sobre ANALYTICS, OBSERVABILITY, OBJECT-STORAGE.

## Alternativas descartadas

- **Modelar `assessment_definition`/`version`/`form`/`attempt`/`session` completos (Data Model Bloque 11)** — descartado: esa capa resuelve exámenes versionados, adaptativos y cronometrados; ninguna necesidad existe en M1.
- **`StudySession` como nombre de la entidad de avance** — descartado por el usuario: no representa una sesión real, confundiría el vocabulario del dominio.
- **Aceptar cualquier segundo envío como error genérico** — descartado: se pidió idempotencia condicionada (mismo valor → éxito silencioso; valor distinto → conflicto explícito).
- **Protocolo de sincronización completo (§8.9) ahora** — descartado explícitamente por el usuario: cursores/reconciliación/batches quedan fuera hasta que haya evidencia real de necesidad.
- **`NetInfo` u otra detección de conectividad dedicada** — descartado por ahora: `AppState` (núcleo de React Native, sin dependencia nueva) alcanza para disparar el worker; se reevalúa si resulta insuficiente.
- **Devolver la explicación (`explanationContent`) en la respuesta de `POST /progress/responses`** — descartado: el cliente ya la tiene desde `GET /education/topics/:topicId/questions` (Bloque I/II); duplicarla en PROGRESS mezclaría contenido con estado del estudiante, exactamente lo que el punto 3 pide mantener separado.

## Consecuencias

- Cualquier extensión futura de tipos de operación en la outbox (progreso de otro tipo, ej. lectura de recurso) reutiliza el mismo worker y el mismo patrón de `operationId`, no uno nuevo por tipo.
- `PrivacyService.runAccountDeletionSweep()` gana una tercera llamada de limpieza por dominio (AUTH, USER, ahora PROGRESS) — cualquier dominio futuro con datos personales sigue el mismo patrón.
- Si en el futuro se necesita una `StudySession` real (cronometrada, reanudable), es una entidad nueva y explícita — no una extensión retroactiva de `CurriculumTopicProgress`.
- El worker de sincronización mínimo (sin `NetInfo`, sin background sync del SO) puede demostrarse insuficiente en dispositivos reales — evaluación explícita pendiente si ocurre, no resuelta preventivamente aquí.

## Hallazgo durante la verificación: `expo-sqlite` en Web no completa escrituras -- se ajusta el camino de envío por plataforma

Verificado empíricamente con el Browser tool: en el target Web, `getOutboxRepository()` (abrir la base + `runMigrations`) puede completar, pero la operación de `enqueue()` (un `INSERT` real) se queda esperando indefinidamente al *worker* de `expo-sqlite` para Web -- exactamente la limitación que ADR-0011 ya documentó ("el pedido del worker... quedó pendiente sin completar en la verificación realizada") pero que hasta ahora nunca había sido *ejercitada* por una escritura real, porque ADR-0011 solo probó la lógica contra `node:sqlite`, nunca contra el binding web real. Bloque III es el primer bloque que de verdad intenta escribir en la cola desde una pantalla de producto, y expuso el problema.

**Corrección**: `submitResponseViaOutbox()` y `syncPendingOperations()` verifican `Platform.OS` (núcleo de React Native, sin dependencia nueva):

- **Nativo (iOS/Android)**: sin cambios respecto al diseño aprobado -- encola siempre, intenta un envío inmediato, el worker drena `PENDING` en los disparadores documentados.
- **Web**: se omite la cola por completo. `submitResponseViaOutbox()` llama directo a `POST /progress/topics/:topicId/responses` (con un `operationId` generado igual, vía `expo-crypto`, que sí funciona en Web); `syncPendingOperations()` es un no-op inmediato.

Esto obligó a un segundo ajuste en la pantalla (`estudio/[topicId].tsx`): el manejo de un fallo de red ya NO puede tratarse igual en las dos plataformas. En nativo, un fallo de red tras encolar significa "ya está guardado localmente, se sincronizará solo" (`isCorrect: null`, UI bloqueada esperando sync). En Web, como nunca se encoló nada, un fallo de red significa que la respuesta **no quedó guardada en ningún lado** -- la pregunta permanece respondible y se muestra un mensaje de error explícito, en vez de simular una cola que no existe en ese target. Verificado en el Browser tool: backend detenido → error visible, pregunta sigue habilitada → backend restaurado → reintento exitoso con el mismo resultado real (`isCorrect`, explicación, estado de la unidad).

Esto no cambia el diseño aprobado para nativo (que sigue sin verificarse en un dispositivo/emulador físico -- mismo pendiente no bloqueante que ADR-0011 dejó para su propio gate), pero deja Web -- la superficie que este proyecto usa para iterar y verificar rápido -- completamente funcional sin depender de una pieza que no funciona ahí.

## Validación (resultado real, 2026-08-02 — 34 comprobaciones)

**Funcional — respuesta y retroalimentación**
1. Responder correctamente → `isCorrect: true` + estado de la unidad actualizado.
2. Responder incorrectamente → `isCorrect: false`.
3. `isCorrect` nunca aparece en ningún endpoint de EDUCATION antes del envío (regresión del gate de Bloque I).

**Lectura: tema inexistente vs. sin progreso**
3a. `GET /progress/topics/:topicId` sobre un `topicId` inexistente → `404`.
3b. `GET /progress/topics/:topicId` sobre un tema existente sin ninguna respuesta registrada → `200`, `status: "NOT_STARTED"`, `responses: []`.

**Idempotencia y concurrencia**
4. Dos envíos concurrentes (`Promise.all`) para la misma `(accountId, questionVersionId)` con la misma alternativa → una sola `StudentResponse`, ningún `500`.
5. Segundo envío con la misma `answerOptionId` → `200`, devuelve la fila existente, no crea una nueva.
6. Segundo envío con `answerOptionId` distinta → `409`, la fila original no cambia.

**Validaciones de servidor**
7. `answerOptionId` que no pertenece a la `questionVersionId` → rechazado.
8. `QuestionVersion` no publicada → no puede responderse.
9. `Question` con identidad retirada → no puede responderse.

**Estado de la unidad**
10. Responder todas las preguntas publicadas de un tema → `CurriculumTopicProgress.status = COMPLETED`.
11. Publicar una pregunta nueva después de completar → el estado sigue `COMPLETED` (verificado también a nivel de trigger, intentando el `UPDATE` prohibido directamente por SQL).

**Continuidad**
12. Cerrar y reabrir (simulado: nueva sesión HTTP, mismo `accountId`) → `GET /progress/topics/:topicId` devuelve la alternativa seleccionada, `isCorrect` y el estado de la unidad, coincidentes con lo enviado.

**Separación de dominio**
13. Ningún endpoint de `/education/*` expone `accountId`, respuestas ni estado de progreso (regresión del gate de Bloque I/II).

**Client Outbox / comportamiento sin red** (ver "Hallazgo durante la verificación" -- el camino difiere por plataforma)
14. **Web** (Browser tool, backend detenido): la respuesta NO se guarda en ningún lado (no hay cola en ese target) -- se muestra un error explícito, la pregunta permanece respondible, sin marcar un `isCorrect` inventado. Verificado real.
15. **Web**, backend restaurado → reintentar el mismo tap tiene éxito, con el resultado real (`isCorrect`, explicación, estado de la unidad). Verificado real.
16. `operationId` como clave de idempotencia de transporte: reenviar la misma petición HTTP con el mismo `operationId` devuelve la misma respuesta sin duplicar -- verificado a nivel de servidor (gate, punto 16 numerado arriba).
17. **Nativo** (iOS/Android): el diseño de encolar/drenar/`markSynced`/`markFailed` no cambió -- sigue verificado a nivel de lógica por el gate de OFFLINE-OUTBOX (24 comprobaciones, `node:sqlite`) sin regresión, pero **no se ejercitó de punta a punta en un dispositivo/emulador físico** -- mismo pendiente no bloqueante que ADR-0011 ya dejó para su propio gate (sin SDK de Android en este entorno).

**Privacy**
18. Cierre definitivo de cuenta → `StudentResponse` y `CurriculumTopicProgress` de esa cuenta eliminados por completo.
19. Si `deleteProgressForAccountClosure` falla (fixture forzado), la solicitud de privacidad **no** se marca `COMPLETED` — queda `PROCESSING` para reintento.
20. Gates de EDUCATION (32), USER (40), OFFLINE-OUTBOX (24) y **PRIVACY (34, re-ejecutado)** sin regresión.

**Regresión general**
21. `pnpm -r run typecheck/lint`, build de los 4 paquetes, `expo export --platform android`, y verificación real en navegador (Browser tool) — recorrido completo con respuesta, feedback, estado de unidad y reintento tras caída de red — en verde.

## Resultado del gate

Las 23 comprobaciones originales (más las subdivisiones 3a/3b) se ejecutaron como 34 aserciones individuales en `scripts/verify-progress-gate.ts`, todas en verde, contra Postgres real (datos reales de Fase 0/Bloque I) — incluyendo la inyección de fallos real para el punto 19 (un trigger temporal que bloquea `DELETE` sobre `curriculum_topic_progress`, no `REVOKE`: el rol `axioma` es dueño de las tablas y los dueños ignoran `GRANT`/`REVOKE` en Postgres). El recorrido completo (responder correcto/incorrecto, completar la unidad, cerrar sesión y recuperar el estado exacto al volver a entrar, sin red y reintento) se verificó además de forma real en navegador. Regresión sin hallazgos en EDUCATION (32), USER (40), PRIVACY (34) y OFFLINE-OUTBOX (24).

---

**Bloque III -- Progress Foundation: implementado, validado y cerrado (2026-08-02).**
