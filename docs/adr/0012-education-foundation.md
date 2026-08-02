# ADR 0012 — Education Foundation (Bloque I, Vertical Slice M1)

- **Estado**: **Aprobada formalmente** — gate completo ejecutado y verificado (2026-08-01): migraciones aplicadas contra los datos reales de Fase 0 y, por separado, contra una base efímera desde cero; 32 comprobaciones del gate de EDUCATION en verde (invariante de materia en creación y en `UPDATE`, ciclos, huérfanos, backfill reproducible en ambos escenarios, ausencia de `isCorrect`); regresión completa de `pnpm -r run typecheck/lint`, build de los 4 paquetes, y gate de USER re-ejecutado sin regresiones en una instancia limpia. Ver "Validación" para el detalle.
- **Fecha**: 2026-08-01
- **Fase de aplicación**: Fase 1 — Vertical Slice M1, Bloque I (Roadmap AXIOMA Phase 1 Kickoff, §7.1)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce estructuras de persistencia nuevas y fija el límite práctico entre EDUCATION y PROGRESS.

## Enmienda (2026-08-02, ver ADR-0013)

Al proponer Bloque II se detectó una contradicción real entre este ADR y **ADR-0002** (arquitectura oficial de renderizado matemático, aprobada y cerrada formalmente antes de este ADR): ADR-0002 exige que toda fórmula lleve, desde el diseño de sus entidades, tanto el LaTeX fuente como el SVG generado en el momento de publicación, versionados juntos — el `formulaBlockSchema` original de este ADR solo tenía `latex`. Por decisión explícita del usuario, **ADR-0002 no se reabre**; se corrige este ADR para ser coherente con él:

- `formulaBlockSchema` (`packages/contracts/src/education.ts`) ahora incluye `svg: string` obligatorio junto a `latex`.
- Infraestructura mínima agregada (`apps/backend/src/education/formula-rendering.ts`, función pura `renderLatexToSvg()` con `mathjax-full`, mismo patrón validado en el spike de ADR-0002) — **no** el pipeline editorial completo, que sigue fuera de alcance. Hoy la invoca únicamente `prisma/seed.ts`, el único punto que "publica" contenido en M1.
- Adicionalmente (ADR-0013, punto 4): los bloques `image` ya no exponen `objectKey` en la respuesta de la API — `EducationService` lo resuelve a una URL firmada vía `ObjectStorageService` (ADR-0010) antes de responder. `imageBlockSchema` (almacenamiento, con `objectKey`) y `imageBlockResponseSchema` (respuesta, con `url`) quedan como esquemas separados.

Ninguna entidad ni el modelo identidad/versión cambia — es una corrección de forma dentro de los campos `Json` ya existentes (`contentBlocks`/`stemContent`/`explanationContent`), sin migración de esquema Prisma. El gate de EDUCATION se amplió con comprobaciones para ambos puntos (ver ADR-0013).

## Contexto

El Phase 1 Kickoff (2026-08-01) abre la Vertical Slice M1 y define su Bloque I como "construir el dominio Education mínimo que permita representar materias, unidades, recursos educativos y preguntas dentro del sistema". Fase 0 dejó únicamente el andamiaje mínimo de `CurriculumTopic` (ADR-0003: `id, code, name, order, parentId`, sin materia, sin recursos, sin preguntas) y la infraestructura de almacenamiento de objetos (ADR-0010, `ObjectStorageService`) que este bloque debe reutilizar sin extender.

Este ADR es resultado de un proceso de propuesta y ajuste iterativo con el usuario, aplicando el principio del Kickoff "construir la menor cantidad de arquitectura necesaria para demostrar el primer ciclo completo de aprendizaje" y el test explícito de necesidad: *¿es imprescindible para que un estudiante seleccione una materia, lea un recurso, responda preguntas y reciba retroalimentación?* Ese proceso descartó varias entidades del Data Model canónico (Bloques 8, 9 y 10) por no superar el test, y ajustó la ubicación de otras para respetar el principio "la identidad lógica representa aquello que permanece estable en el tiempo; la versión representa aquello que puede evolucionar sin perder trazabilidad".

## Decisión

### Entidades mínimas y separación identidad/versión

| Entidad | Identidad (estable) | Versión (evoluciona con trazabilidad) |
|---|---|---|
| `Subject` | `id, subjectKey, name, shortName, status, displayOrder` | *(sin versión — categoría disciplinaria estable, no contenido; consistente con Data Model 8.11, que tampoco versiona `subject`)* |
| `CurriculumTopic` | `id, code, name, order, parentId, subjectId` *(campo nuevo, ver "Migración")* | *(sin versión — divergencia deliberada del Data Model canónico, confirmada; ver "Alternativas")* |
| `LearningResource` | `id, resourceKey, primarySubjectId, resourceType, status` | — |
| `LearningResourceVersion` | — | `id, learningResourceId, curriculumTopicId, title, contentBlocks, editorialStatus, publishedAt` |
| `Question` | `id, questionKey, primarySubjectId, questionType, status` | — |
| `QuestionVersion` | — | `id, questionId, curriculumTopicId, stemContent, explanationContent, editorialStatus, publishedAt` |
| `AnswerOption` | — | `id, questionVersionId, content, displayOrder, isCorrect` |

Quedan explícitamente descartadas como entidades propias, por no superar el test de necesidad del primer ciclo: `answer_key` (absorbida en `AnswerOption.isCorrect`), `answer_explanation` como tabla independiente con tipificación por alternativa (absorbida en `QuestionVersion.explanationContent`), las tablas puente `curriculum_topic_resource`/`curriculum_topic_question` (reemplazadas por FK directa), y `educational_asset`/`educational_asset_version` (las imágenes viajan como bloque `image` dentro de `contentBlocks`, resuelto vía `ObjectStorageService`).

**Regla general de ubicación**: un campo pertenece a la identidad cuando su cambio implicaría, conceptualmente, que se trata de otra entidad (materia, tipo de recurso, tipo de pregunta); pertenece a la versión cuando su cambio es una revisión editorial legítima del mismo concepto (contenido, mapeo curricular fino, estado de aprobación).

### Invariante 1 — Consistencia de materia entre identidad y versión

`primarySubjectId` (identidad) y `curriculumTopicId` (versión) deben referirse siempre a la **misma materia**. Dos reglas concretas:

1. **`version.curriculumTopic.subjectId` debe coincidir siempre con `identity.primarySubjectId`.** Al publicar o actualizar `LearningResourceVersion`/`QuestionVersion`, el `subjectId` del `CurriculumTopic` referenciado por `curriculumTopicId` debe ser idéntico al `primarySubjectId` de la `LearningResource`/`Question` propietaria.
2. **Un `CurriculumTopic` hijo no puede pertenecer a una materia distinta de su padre.** Al insertar o actualizar un `CurriculumTopic` con `parentId` no nulo, su `subjectId` debe coincidir con el `subjectId` del padre.

**Mecanismo de aplicación**: ambas reglas se implementan como *triggers* de PostgreSQL (`BEFORE INSERT OR UPDATE`), no solo como validación en la capa de servicio. Justificación directa de ADR-0001: "PostgreSQL como motor de base de datos y autoridad de integridad, incluso con ORM de por medio: las invariantes que Prisma no pueda representar adecuadamente se implementan mediante migraciones SQL personalizadas y revisadas manualmente". Ninguna de las dos reglas es expresable como `CHECK`/`FOREIGN KEY` simple de Postgres porque ambas requieren comparar una columna contra el resultado de un `JOIN` a otra fila (padre, o identidad vía versión) — de ahí la necesidad de trigger. La validación en la capa de servicio (Zod/Nest) se mantiene como primera línea (mejor mensaje de error, falla rápido), pero el trigger es la autoridad final — protege incluso ante un script de backfill con un error, una migración manual futura, o un acceso directo a la base.

Triggers propuestos (nombre, no implementación):
- `enforce_curriculum_topic_subject_consistency` sobre `curriculum_topic`.
- `enforce_learning_resource_version_subject_consistency` sobre `learning_resource_version`.
- `enforce_question_version_subject_consistency` sobre `question_version`.

### `explanationContent` usa el mismo contrato de bloques que `contentBlocks`

`QuestionVersion.explanationContent` no es texto libre. Usa la misma estructura `ContentBlock[]` ya definida para `LearningResourceVersion.contentBlocks`, pero con un subconjunto explícitamente más pequeño de tipos permitidos: **`paragraph`, `formula`, `image`** (sin `heading` — una explicación de pregunta no necesita subtítulos propios; si se necesitara en el futuro, es una ampliación explícita del subconjunto, no una excepción silenciosa). Esto evita introducir un segundo formato de contenido paralelo (Markdown, HTML, texto plano) que tendría que sanitizarse, renderizarse y versionarse de forma distinta al resto del dominio — exactamente el tipo de camino paralelo que el Kickoff pide evitar. El validador de contenido estructurado (Zod, en `packages/contracts`) se parametriza por los tipos de bloque permitidos según el campo (`contentBlocks`: 4 tipos; `explanationContent`: 3 tipos), reutilizando el mismo esquema base.

### `questionType` permanece en la identidad, deliberadamente

`questionType` vive en `Question` (identidad), no en `QuestionVersion`. Esto es consistente con la regla general de ubicación: el tipo de una pregunta (`single_choice` vs. `numeric_response`, etc.) no es una revisión editorial del mismo concepto — es una propiedad estructural de qué significa "responder" esa pregunta (alternativas vs. valor numérico vs. texto). Cambiarlo no es publicar una nueva versión; es, conceptualmente, crear una pregunta distinta.

**Restricción explícita de M1**: el único valor válido de `questionType` en este bloque es `single_choice` (PRD §11.6.1, DM-D124). No se implementa la enumeración completa del Data Model — el campo existe y se fija a ese único valor mediante `CHECK` o enum de un solo miembro, para no bloquear la extensión futura sin sobre-construir hoy. **Una pregunta no puede cambiar de tipo mediante versionado.** Si en una fase posterior se habilitan otros tipos, esa es una decisión Nivel 2/3 explícita y separada (afecta a `AnswerOption`, `answer_key` equivalente, y probablemente reintroduce alguna forma de pauta estructurada más allá de un booleano) — no se resuelve de forma anticipada en este ADR ni se deja una puerta implícita abierta en el esquema actual.

### Migración segura del `CurriculumTopic` existente

`CurriculumTopic` (ADR-0003) ya tiene filas reales en producción/desarrollo (la unidad sembrada "Porcentajes y proporcionalidad" y sus 3 subtemas). Se necesita `subjectId` sin intervención manual y sin dejar una ventana de inconsistencia. Secuencia propuesta, en una única migración Prisma más un script de backfill idempotente (mismo patrón que `prisma/seed.ts` de ADR-0003, ejecutado vía `tsx`):

1. **Crear `Subject`** (tabla nueva) mediante la migración estándar de Prisma.
2. **Asegurar el `Subject` requerido por los datos existentes** de forma idempotente (`upsert` por `subjectKey`, igual que el seed de ADR-0003 usa `upsert` por `code`): el contenido sembrado en Fase 0 pertenece a Matemática, así que el backfill garantiza una fila `Subject { subjectKey: "matematica", ... }` antes de continuar. Si en el futuro hay más materias con datos preexistentes, el mismo script se extiende — no se asume que "matematica" sea la única para siempre, solo que es la única necesaria para los datos que hoy existen.
3. **Agregar `subject_id` a `curriculum_topic` como columna nullable** en la misma migración (no se puede agregar `NOT NULL` directamente sobre una tabla con filas existentes sin backfill previo).
4. **Backfill por script, no por SQL manual**: recorre `curriculum_topic` en orden topológico (raíces primero, `parentId IS NULL`), asigna `subjectId` explícito a las raíces según una tabla de mapeo controlada por código (no inferencia), y luego propaga a cada hijo el `subjectId` de su padre hasta que no queden filas con `subject_id IS NULL`. El script es idempotente: correrlo de nuevo sobre datos ya migrados no cambia nada (mismo criterio de verificación que ADR-0003 aplicó a su propio seed).
5. **Verificación de completitud**: el script falla explícitamente (no continúa en silencio) si, al terminar, queda alguna fila con `subject_id IS NULL` — señal de un nodo huérfano o de un caso no cubierto por el mapeo de raíces.
6. **Segunda migración**: una vez verificado que el backfill dejó 0 filas nulas (verificación ejecutada como parte del pipeline, igual que ADR-0003 verifica el conteo de filas del seed), se aplica `ALTER COLUMN subject_id SET NOT NULL`, se agrega la `FOREIGN KEY` hacia `subject(id)` (`ON DELETE RESTRICT`, mismo criterio que la FK auto-referencial ya existente de `parentId`), y un índice sobre `subject_id`.
7. **Los triggers del Invariante 1** se crean después de que el backfill garantiza consistencia total — así el propio despliegue de los triggers no puede fallar contra datos ya inconsistentes.

Todo el proceso corre en CI de la misma forma que ADR-0003 valida su propia tubería: contra una base efímera desde cero (donde el backfill no tiene nada que hacer, gate trivial) y, si aplica, contra una base con los datos de Fase 0 ya sembrados (donde el backfill sí actúa) para probar la migración real, no solo el caso vacío.

## Precisiones finales de aprobación

### 1-2. Todas las rutas de escritura que podrían romper los invariantes, cerradas por inmutabilidad

En vez de validar la consistencia de materia solo en el momento de creación de una versión (dejando abiertas rutas de `UPDATE` posteriores que dependerían de un orden correcto de operaciones), la política para M1 es **impedir directamente cualquier cambio de materia una vez fijada**, en lugar de intentar propagar o revalidar una reclasificación. Esto cierra todas las rutas de una sola vez:

| Ruta | Mecanismo de cierre |
|---|---|
| `INSERT`/`UPDATE` de `LearningResourceVersion`/`QuestionVersion` | Trigger de consistencia (join identidad↔versión↔tema) en cada `INSERT` y `UPDATE`. |
| `UPDATE` de `LearningResource.primarySubjectId` / `Question.primarySubjectId` | Trigger que **rechaza cualquier cambio** de `primary_subject_id` una vez creada la fila — no hay ninguna ruta legítima de reclasificación de materia para un recurso o pregunta ya existente en M1. Si una reclasificación fuera realmente necesaria, la operación correcta es crear una nueva identidad, no mutar la existente. |
| `UPDATE` de `CurriculumTopic.subjectId` | Trigger que permite la transición inicial `NULL → valor` (la que hace el backfill de esta misma migración) pero **rechaza cualquier cambio posterior** de un valor a otro distinto. |
| `INSERT`/`UPDATE` de `CurriculumTopic.parentId` | Trigger que exige que `NEW.subject_id` coincida con `parent.subject_id` cuando `parent_id` no es nulo, y que además rechaza ciclos (verifica que `NEW.parent_id` no sea el propio nodo ni ninguno de sus descendientes, vía `WITH RECURSIVE`). |
| Cambios en la materia del padre de un `CurriculumTopic` | **Cerrada estructuralmente, sin trigger adicional**: como `CurriculumTopic.subjectId` es inmutable una vez fijado (regla de arriba), la materia de un padre nunca puede cambiar después de asignada — no existe el caso "el padre cambió de materia" que propagar. |

Esta es la razón concreta por la que se prefiere inmutabilidad a "orden correcto de updates": no hay orden que preservar porque, salvo el backfill inicial (`NULL → valor`, una sola vez, dentro de la propia migración), **no existe ninguna operación de escritura legítima en M1 que cambie una materia ya asignada**. Cualquier intento de hacerlo es, por definición, un error de la capa que lo intenta — el trigger lo rechaza con una excepción, nunca lo aplica parcialmente ni depende de que el llamador actualice las tablas en un orden particular.

### 3. Migración expand/backfill/contract, completamente automatizada

Se implementa como dos migraciones de Prisma reales (no un paso manual documentado en prosa):

- **Migración 1 (`..._education_foundation_expand`)**: generada por `prisma migrate dev --create-only` a partir del `schema.prisma` con `CurriculumTopic.subjectId` todavía **opcional** — Prisma emite automáticamente el `CREATE TABLE subject`, las tablas nuevas de contenido, y `ALTER TABLE curriculum_topic ADD COLUMN subject_id UUID` (nullable). A ese archivo generado se le añade, a mano pero dentro del mismo `migration.sql` versionado (no en un paso separado ni en un script externo a ejecutar "cuando alguien se acuerde"): el `INSERT` idempotente del `Subject` requerido por los datos de Fase 0, el backfill recursivo (`DO $$ ... LOOP ...`, raíces primero, luego propagación padre→hijo hasta que no queden `NULL`), un bloque de verificación que **lanza excepción y aborta la migración completa** si queda algún `subject_id` nulo al terminar, y la creación de los triggers de invariantes (después del backfill verificado, nunca antes).
- **Migración 2 (`..._education_foundation_contract`)**: generada de la misma forma tras cambiar `CurriculumTopic.subjectId` a **obligatorio** en `schema.prisma` — Prisma emite `ALTER COLUMN ... SET NOT NULL`, la `FOREIGN KEY` y el índice automáticamente.

Ambas migraciones se aplican con `prisma migrate deploy`, exactamente igual que el resto de la serie (ADR-0003/0004/.../0011) — sin ningún paso fuera de la tubería estándar de Prisma, y sin ninguna ventana en la que un desarrollador tenga que acordarse de correr algo manualmente entre una migración y otra.

### 4. Postgres protege relaciones; Zod protege la forma del JSON

División de responsabilidades explícita, sin solaparse:

- **PostgreSQL** es la autoridad de las invariantes **relacionales**: unicidad, claves foráneas, y los tres triggers de consistencia de materia/jerarquía descritos arriba. Esto es verdad sin importar por dónde se escriba (API, script de backfill, acceso directo).
- **Zod** (`packages/contracts`) es la autoridad de la **forma interna** de los campos `Json` (`contentBlocks`, `explanationContent`, `content` de `AnswerOption`) — Postgres no sabe ni le corresponde saber qué tipos de bloque son válidos dentro de esas columnas. La validación Zod se ejecuta:
  - en toda escritura desde la API (antes de persistir);
  - en el script de seed (antes de cada `upsert`/`create` de contenido real);
  - al leer desde el repositorio, antes de servir la respuesta — defensa en profundidad ante la posibilidad de que una fila llegue a existir con una forma inválida (p. ej. escrita antes de un cambio de esquema de contratos), para no propagar contenido corrupto al cliente sin darse cuenta.

Ninguna de las dos capas sustituye a la otra: un `JSON` con la forma correcta pero que combina una materia incompatible pasaría Zod y fallaría en Postgres; un `JSON` con la materia correcta pero un tipo de bloque no permitido pasaría las FK de Postgres y fallaría en Zod.

## Alternativas consideradas

- **Mantener `curriculumTopicId` en la identidad de `LearningResource`/`Question`** (propuesta anterior) — descartado: viola el principio identidad/versión, porque una reclasificación curricular mutaría la identidad en sitio y perdería trazabilidad de a qué tema estaba mapeada la versión que un estudiante efectivamente vio.
- **Migrar `CurriculumTopic` a `curriculum_node_version`** (jerarquía versionada del Data Model canónico) — descartado, confirmado por el usuario: el modelo plano de ADR-0003 se mantiene; la divergencia queda documentada, no reconciliada, hasta que exista necesidad real (p. ej. más de un marco curricular oficial vigente simultáneamente).
- **Validar la consistencia de materia solo en la capa de servicio (Zod/Nest), sin trigger de base de datos** — descartado: Postgres es la autoridad de integridad declarada desde ADR-0001; un backfill futuro, una migración de datos, o un acceso directo por script quedarían sin protección si la única barrera fuera la aplicación.
- **`explanationContent` como texto Markdown o HTML** — descartado: introduce un segundo formato de contenido con su propio sanitizado y renderizado, exactamente el tipo de camino paralelo que DM-D104 prohíbe para el contenido educativo en general.
- **Habilitar más de un `questionType` en el esquema desde ya "por si acaso"** — descartado explícitamente: es la clase de complejidad anticipatoria que el Kickoff pide evitar; se define un único valor válido y se revisita cuando haya necesidad real y aprobada.
- **Tablas puente `curriculum_topic_resource`/`curriculum_topic_question` (N:N)** — descartadas: el caso de uso que justifican (un recurso reutilizado en varios temas) no existe en M1; FK directa desde la versión es suficiente y más simple.

## Consecuencias

- Bloque II (Integración Mobile ↔ Backend) consumirá exclusivamente las versiones publicadas (`editorialStatus = published`) de `LearningResourceVersion`/`QuestionVersion` — nunca borradores, y nunca `AnswerOption.isCorrect` antes de que el estudiante responda.
- Bloque III (Progress) referenciará `learningResourceVersionId`/`questionVersionId` (no solo la identidad) para conservar exactamente el contenido que el estudiante vio, consistente con CONTENT-006 y PRD-D004.
- Cualquier extensión futura de `questionType` más allá de `single_choice` requiere una decisión Nivel 2/3 explícita y separada — no se resuelve por defecto extendiendo el enum existente sin revisión.
- Si en el futuro se necesita reutilizar un recurso en múltiples temas, o versionar la jerarquía curricular completa, ambas son decisiones arquitectónicas nuevas y explícitas — este ADR no deja una ruta implícita para ninguna de las dos.
- Los tres triggers de consistencia de materia pasan a ser parte del contrato de integridad del dominio EDUCATION: cualquier nueva entidad que combine `primarySubjectId` (identidad) y `curriculumTopicId` (versión) en el futuro debe replicar el mismo mecanismo, no asumir que la validación de aplicación basta.

## Validación (gate ejecutado, 2026-08-01)

Ejecutado contra Postgres real (Docker), dos veces: contra la base de desarrollo con los datos reales de Fase 0 ya sembrados, y contra una base efímera (`axioma_gate_fresh`) creada desde cero y descartada al finalizar. `scripts/verify-education-gate.ts` (32 comprobaciones) en verde en ambos casos; ver `apps/backend/scripts/verify-education-gate.ts` para el detalle ejecutable.

**Funcional — dominio**
- Lectura completa del recorrido: materias → temas de una materia → versión publicada de un recurso → sus preguntas publicadas.
- `AnswerOption.isCorrect` ausente de cualquier respuesta de API antes de que el estudiante responda (verificación estática de la serialización + funcional).
- Contenido en `draft`/`in_review` nunca aparece en un endpoint ordinario.
- `explanationContent` rechaza tipos de bloque fuera de `paragraph/formula/image` (validación Zod) — verificado con un caso que intenta colar `heading`.
- Intentar crear/publicar una `Question` con `questionType` distinto de `single_choice` es rechazado.

**Invariante 1 — consistencia de materia (creación)**
- Insertar/actualizar un `LearningResourceVersion`/`QuestionVersion` cuyo `curriculumTopic.subjectId` no coincide con `primarySubjectId` de la identidad → rechazado por el trigger, no solo por la validación de aplicación (probar también vía SQL directo, no solo vía API, para confirmar que el trigger es la barrera real).
- Insertar/actualizar un `CurriculumTopic` hijo con `subjectId` distinto al de su padre → rechazado por el trigger.
- Caso positivo: jerarquía de 3 niveles con `subjectId` consistente de raíz a hoja se acepta sin error.

**Invariante 1 — protección contra `UPDATE` posteriores (no solo contra `INSERT`)**
- Crear un `LearningResource`/`Question` válido y luego intentar un `UPDATE` que cambie su `primarySubjectId` a otra materia existente → rechazado por el trigger.
- Crear un `CurriculumTopic` con `subjectId` ya asignado y luego intentar un `UPDATE` que lo cambie a otra materia → rechazado por el trigger.
- Crear una jerarquía padre→hijo consistente y luego intentar reasignar el `parentId` de un nodo hacia otro padre de materia distinta → rechazado por el trigger.

**Jerarquía de `CurriculumTopic`**
- Rechazo de ciclos: intentar que un nodo sea su propio padre (`parent_id = id`) → rechazado. Intentar que un nodo tome como padre a uno de sus propios descendientes (ciclo indirecto de 3 niveles) → rechazado.
- Rechazo de nodos huérfanos en el backfill: fixture con un `CurriculumTopic` cuyo padre no tiene `subject_id` resoluble (ninguna raíz mapeada en la cadena) → el script de backfill falla explícitamente en vez de dejarlo con `subject_id` nulo o asignado por defecto.
- Rechazo de `subjectId` incompatible entre padre e hijo también en el caso de creación directa (sin pasar por backfill): crear un hijo con `subjectId` distinto al del padre ya existente → rechazado por el trigger.

**Migración — reproducibilidad**
- El backfill se ejecuta y se verifica **dos veces** en el gate: una vez contra una base completamente vacía (caso trivial, nada que hacer, `subject_id IS NULL` count = 0 antes y después) y otra vez contra una base con los datos de Fase 0 ya sembrados (`curriculum_topic` con la unidad "Porcentajes y proporcionalidad" y sus 3 subtemas) — confirmando en ambos casos 0 filas con `subject_id` nulo al finalizar y el mismo resultado si se aplica dos veces seguidas (idempotencia de la migración completa, no solo del seed).

**Migración del `CurriculumTopic` existente**
- Ejecutada sobre una copia de los datos reales de Fase 0 (la unidad "Porcentajes y proporcionalidad" + 3 subtemas): al finalizar, 0 filas con `subject_id IS NULL`, y el `subjectId` de los 3 subtemas coincide exactamente con el de su padre.
- El script de backfill es idempotente: corrido dos veces sobre el mismo estado, produce el mismo resultado (mismo criterio que el seed de ADR-0003).
- El script falla explícitamente (no continúa) si se le presenta un nodo huérfano sin mapeo de materia conocido — probado deliberadamente con un fixture que introduce ese caso.
- La migración completa (agregar columna nullable → backfill → `NOT NULL` + FK + índice → crear triggers) se replica desde cero en CI sin intervención manual.

**Regresión**
- `pnpm -r run typecheck/lint` (4 paquetes) y build de `contracts`/`backend`: verde.
- Gate de USER (40 comprobaciones) re-ejecutado en una instancia limpia sobre la base efímera desde cero: verde, sin regresiones. (Los gates de AUTH/PRIVACY/ANALYTICS/OBSERVABILITY/OBJECT-STORAGE no se modificaron en este bloque -- EDUCATION es aditivo puro, ver "Impacto cruzado sobre dominios existentes"; se re-ejecutarán en conjunto en el próximo Architecture Review o antes del cierre de la Vertical Slice M1.)
- Seed idempotente confirmado en ambos escenarios: correr `prisma/seed.ts` dos veces produce el mismo conteo (`curriculum_topic`: 4, `question`: 2, `answer_option`: 8, `learning_resource_version`: 1) sin duplicar filas.

## Resultado del gate

Los 32 casos del gate de EDUCATION pasaron, incluyendo explícitamente los cinco puntos pedidos en la aprobación final: rechazo de ciclos (directo e indirecto), rechazo de nodos huérfanos (estructural, vía `NOT NULL`), rechazo de `subjectId` incompatible entre padre e hijo, pruebas de `UPDATE` que intentan romper los cuatro invariantes después de creados los datos (no solo `INSERT`), y reproducibilidad del backfill verificada tanto contra la base con datos preexistentes de Fase 0 como contra una base efímera desde cero.

---

**Bloque I -- Education Foundation: implementado, validado y cerrado (2026-08-01).**
