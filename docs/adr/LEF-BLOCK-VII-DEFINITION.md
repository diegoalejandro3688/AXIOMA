# Bloque VII — Definición Formal: Plataforma Editorial

**Fecha**: 2026-08-15
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: VII de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-VII-EDITORIAL-AUDIT.md` (auditoría canónica y fuente principal de evidencia de este documento — todas las citas `archivo:línea` de aquí provienen de allí y no se reinventan), `docs/adr/LEF-BLOCK-VII-AUDIT.md` (registro histórico de qué **no** es el Bloque VII — rama Premium/Entitlements descartada en su Decision Gate 1; **no se reabre**), `docs/adr/0012-education-foundation.md`, `docs/adr/0014-progress-foundation.md`, `docs/adr/0004-identity-authentication-foundation.md`, `docs/adr/0005-privacy-foundation.md`, `docs/adr/0001-stack-inicial.md`, `docs/adr/0002-renderizador-matematico.md`, `docs/adr/0010-almacenamiento-de-contenido.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0019-reward-evaluation-delivery-mechanism.md`, `docs/adr/LEF-BLOCK-VI-DEFINITION.md`/`LEF-BLOCK-VI-CLOSURE-REPORT.md` (bloque anterior, cerrado), `docs/PHASE-2-KICKOFF-INVENTORY.md`, PRD §11.3 (`CONTENT-001..014`) y §17 completo (`ADMIN-*`/`CMS-*`, criterios 259-272, `PRD-D051..D060`), Data Model §8.26-8.27/§9.21-9.23/§10.16-10.20 (`DM-D101`/`DM-D102`/`DM-D113`/`DM-D114`), Master Context §6.17/§6.24/§6.29/§8.14/§8.19.

**Estado**: **DEFINIDO — SIN DECISION GATES ABIERTOS — NO AUTORIZADO A IMPLEMENTAR.** Este documento es exclusivamente contractual: no se escribió código, no se creó ninguna migración, no se tocó `packages/contracts`, no se tocó `apps/mobile`, no se creó ningún gate, no hay commit, tag ni push. Las cinco resoluciones originales del Product Owner (§4, decisiones A-E, primera ronda) están incorporadas tal cual fueron dictadas. **Los cinco Decision Gates que quedaron abiertos en la primera versión de este documento (DG-7 a DG-11) fueron RESUELTOS por el Product Owner en una segunda ronda (2026-08-15) y están incorporados en las secciones correspondientes; §14 conserva el registro completo de cada resolución y el mapa de dónde quedó incorporada.** Ningún incremento de §12 queda bloqueado por un Decision Gate abierto. **La autorización para implementar sigue siendo un acto separado del Product Owner y este documento no la otorga.**

**Nota de versionado del documento**: la primera versión (2026-08-15) incorporó las decisiones A-E y abrió DG-7 a DG-11. Esta segunda versión (2026-08-15, misma fecha, ronda posterior) incorpora las cinco resoluciones de esos gates. Se sigue el criterio editorial de `LEF-BLOCK-VI-DEFINITION.md` §29/§30 (*addenda* de resolución fechados y atribuidos), pero, por ser este documento todavía inédito como definición cerrada, las resoluciones se **integran en su sección natural** en vez de acumularse al final; la trazabilidad de que fueron una ronda posterior vive en §14 y en esta nota. Cada punto del documento tocado por una de las cinco resoluciones lo indica con la etiqueta **(DG-N resuelto)**.

**Nota de nomenclatura**: igual que Bloque VI, **no existe colisión** con el roadmap de Fase 1 (Vertical Slice M1), que solo llegó hasta "Bloque V de V" (`docs/adr/BLOCK-V-CLOSURE-REPORT.md`). Se usa el prefijo `LEF-` por consistencia con `LEF-BLOCK-II-DEFINITION.md`…`LEF-BLOCK-VI-DEFINITION.md`.

**Nota de reconciliación con la auditoría descartada**: `docs/adr/LEF-BLOCK-VII-AUDIT.md` partió de la premisa "Bloque VII = Premium/Entitlements", descartada formalmente por el Product Owner en su propio Decision Gate 1, ya resuelto y anotado en ese documento. Ese archivo permanece **byte-idéntico, sin modificar**, como registro histórico de una rama cerrada. Toda referencia a "Bloque VII" en documentos anteriores debe leerse, hacia adelante, como referencia a **Plataforma Editorial**, tal como este documento la define. La reconciliación vive únicamente en notas como esta — no se reescribe ningún documento histórico.

**Nota de numeración de Decision Gates**: la auditoría descartada usó DG-1; la auditoría editorial usó DG-2 a DG-6. Este documento continuó la serie con **DG-7 a DG-11** (§14), sin reutilizar ningún número previo, para que cada gate tenga un identificador único y estable en todo el proyecto. Los cinco están **resueltos**. Si un gate nuevo apareciera más adelante en este bloque, tomaría el número **DG-12**; a la fecha de esta versión **no existe ninguno**, y §14.4 documenta explícitamente la revisión de coherencia que lo confirma.

---

## 1. Estado

Ver la línea "Estado" arriba. La base de evidencia es `docs/adr/LEF-BLOCK-VII-EDITORIAL-AUDIT.md` (auditoría contractual y de código completa, 2026-08-15), más las verificaciones puntuales de código real reproducidas para escribir este documento: `apps/backend/prisma/schema.prisma` (enum `EditorialStatus` `:78-87`, `LearningResourceVersion` `:119-138`, `QuestionVersion` `:172-201`, `AnswerOption` `:209-225`), `apps/backend/prisma/migrations/20260802205740_progress_foundation/migration.sql:55-95` (patrón exacto de `enforce_student_response_immutable`), `apps/backend/src/platform/internal-ops/internal-ops.guard.ts` (completo), `docs/adr/0004-identity-authentication-foundation.md` (mecanismo `IdentityProvider`/`StubIdentityProvider`/Firebase), `package.json` y `scripts/` (convención de nombres de gates).

Bloques I-VI permanecen **cerrados e intactos**. Ninguna sección de este documento los reinterpreta, reabre ni modifica. El más reciente, Bloque VI — Tutor IA, `APROBADO/CERRADO`, tag `lef-block-6-tutor-ia-complete`.

## 2. Objetivo del bloque

Hacer que el contenido académico de Axioma pueda **crearse, revisarse, aprobarse, publicarse, corregirse y retirarse** por un actor administrativo identificable, con auditoría atribuible, **sin editar código, sin ejecutar SQL manual contra producción y sin desplegar una nueva versión de la aplicación móvil** — y hacerlo sobre una base en la que la inmutabilidad de la versión publicada esté **aplicada por PostgreSQL**, no solo declarada en prosa.

**Fuente de la definición de "Plataforma Editorial"** (Kickoff de Fase 2 §2.2, citado en `LEF-BLOCK-VII-EDITORIAL-AUDIT.md` §1.2): *"Herramientas destinadas a facilitar la administración y evolución del contenido educativo, permitiendo mantener la calidad del material sin modificar la arquitectura central construida durante M1."* Y §5.2: *"Estas capacidades estarán orientadas al equipo de desarrollo y administración, no al usuario final."*

**Encuadre de tamaño, no negociable** (Master Context §8.14, `master_context.txt:6162`): *"La primera herramienta administrativa deberá ser pequeña y controlada. No necesita convertirse en un CMS completo. Nunca deberá requerir modificación directa de la base de producción para publicar contenido."* Y PRD §17.1 (`prd.txt:7583`): *"No se construirá inicialmente una plataforma administrativa más compleja de lo necesario."*

El objetivo **no** es cubrir §17 completo del PRD (~60 requisitos). Es cubrir el subconjunto que hace verdadero el ciclo de vida unitario del contenido, dejando el resto formalmente diferido con la fuente que autoriza cada diferimiento (§5.3).

## 3. Alcance

**Dentro de alcance** (derivado exclusivamente de las decisiones A-E del Product Owner, §4):

- **Inmutabilidad de versión publicada aplicada por PostgreSQL** — triggers sobre `question_version`, `learning_resource_version` y `answer_option` (decisión C). Es el primer incremento, obligatorio y bloqueante (§10).
- **Unicidad de versión publicada por identidad aplicada por PostgreSQL** — índices únicos **parciales** sobre `question_version(question_id) WHERE editorial_status = 'PUBLISHED'` y `learning_resource_version(learning_resource_id) WHERE editorial_status = 'PUBLISHED'` (**DG-11 resuelto**). Va en la **misma migración y el mismo Incremento 1** que la inmutabilidad, como la misma condición previa absoluta antes de cualquier endpoint editorial de escritura (§10, §12.1).
- **Actor administrativo propio** (`AdminActor` o equivalente), identidad individual, separado de `Account`, con **dos roles V1**: Autor y Publicador (decisión B), autenticado por **token personal por actor, nunca compartido**, almacenado hasheado, revocable y expirable, con el **backend como única autoridad de identidad y rol** (**DG-7 resuelto**, §9.5).
- **Desactivación/revocación de acceso del `AdminActor` sin hard-delete**, preservando la atribución histórica de auditoría (**DG-9 resuelto**, §11.4).
- **Excepción registrada de `CMS-018`** para operación con un equipo de una sola persona: **no es el comportamiento por defecto**, exige activación deliberada, registro del actor y motivo por cada uso (**DG-10 resuelto**, §8.5).
- **Auditoría atribuible** de toda acción editorial: quién, cuándo, sobre qué objeto, qué transición, con qué motivo (decisión B, derivado de `ADMIN-002`/`ADMIN-004`/`PRD-D059`).
- **Máquina de estados editorial** `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`, con `CMS-018` (el autor no se auto-aprueba) **aplicado por el sistema, no por convención** (decisión A).
- **Retiro/despublicación** de contenido por operación autorizada, auditada e idempotente, sin destruir historial (`CMS-016`, `CONTENT-008`, criterio 272).
- **Autoría**: crear borradores de `Question`/`QuestionVersion`/`AnswerOption` y `LearningResource`/`LearningResourceVersion`, validar contenido, y **corregir publicando una versión NUEVA** — jamás mutando la publicada.
- **Superficie**: API administrativa en el backend + **CLI interna**, operando bajo el actor administrativo, **nunca bajo `InternalOpsGuard`** (decisión D).
- **Content Coverage Matrix** (`CMS-002`, `PRD-D057`, criterio 267) como capacidad de **solo lectura**, sobre entidades existentes, reutilizando el precedente `countPublishedByTopicId` (`question-version.repository.ts:82`) — decisión E.
- **Idempotencia de operación editorial** (Master Context §8.19, `master_context.txt:5147`), reutilizando el patrón `operationId` ya existente (`schema.prisma:268`).

**Fuera de alcance** (cada exclusión con la fuente que la autoriza — ninguna por preferencia):

- **Aplicación web administrativa nueva** en el monorepo (decisión D → Opción A de DG-2). `apps/` sigue conteniendo exactamente `backend` y `mobile`.
- **`CMS-007` — vista previa** cercana a la app real (claro/oscuro, tamaños, offline). **Diferido formalmente y registrado como fuera de alcance** por decisión D.
- **`SCHEDULED` / `CMS-021` / publicación programada** y `catalog_availability` (DM §8.27) — fuera por decisión A. El enum real ni siquiera tiene el valor (`schema.prisma:78-87`).
- **`ARCHIVED`** (**DG-8 resuelto**) — el valor **permanece en el enum histórico de Prisma sin tocarse**, pero **ninguna ruta de Bloque VII lo produce ni lo alcanza en V1**. El estado terminal de V1 es `DEPRECATED`. Ver §8.1 y §8.4.
- **MFA / segundo factor / verificación adicional para operaciones críticas** (`ADMIN-002`) — **explícitamente NO diseñado ni simulado en V1**, y registrado como parte **diferida** de `ADMIN-002` (§5.2, §9.6). DG-7 autorizó el token personal, no un sistema de segundo factor.
- **Integración con un proyecto Firebase real para identidad administrativa** — DG-7 lo excluye expresamente; el Decision Gate abierto de ADR-0004 (`PHASE-2-KICKOFF-INVENTORY.md:57`) **no se toca ni se resuelve aquí**.
- **`editorial_review` / `editorial_finding`** (DM §9.22-9.23) — diferidos conforme a **DM §9.21** (*"Si estas funciones no pertenecen al alcance inicial aprobado, las entidades podrán posponerse físicamente"*), decisión A.
- **Importación masiva `CMS-026..029`** — diferida hasta validar el flujo editorial unitario en uso real y hasta que exista necesidad real de producción de contenido a escala (decisión E; `OQ-028`; MC `master_context.txt:6558`).
- **Los cuatro roles restantes de `ADMIN-003`** (Revisor académico, Editor, Soporte, Administrador) — **no se eliminan del contrato**, quedan fuera del alcance de implementación de V1 (decisión B, §9.4).
- **CMS visual/WYSIWYG** — MC §8.14, `OQ-028`, y `DM-D104` (prohíbe HTML libre; el modelo es de bloques semánticos validados por Zod).
- **Exportación de contenido** (`CMS-028`), **moderación** (`MOD-001..004`, ya excluida en `LEF-BLOCK-V-CLOSURE-REPORT.md:19`), **soporte al estudiante** (`SUPPORT-001..004`), **feature flags/kill switch/configuración académica** (`ADMIN-005..009`), **observabilidad operativa/respaldos** (`ADMIN-014..018`), **constructor de ensayos** (`EXAM-001..005`, cuyo dominio no existe — ADR-0014). Todos ya justificados en `LEF-BLOCK-VII-EDITORIAL-AUDIT.md` §9, sin cambios.
- **Cualquier modificación de `xp_ledger_entry`** — prohibido por bloque cerrado (`0016-gamificacion-fundacion.md:62`: *"solo compensar"*).
- **Concesión manual de ítems / `REVERSED` de recompensas** (`0019:15,107`) — delegado al VII por un bloque cerrado pero sin exigencia de plazo, y ajeno al contenido académico que el Kickoff §5.2 acota. Fuera de V1, sin revocar la delegación.
- **IA que cree o publique contenido** — `CONTENT-014`, MC §6.29, `datamodel.txt:6541`. Reabriría además Bloque VI, cerrado.
- **Cualquier cambio a los cuatro lectores de contenido** (§11.1). Bloque VII escribe; la ruta de lectura no cambia ni un byte.

## 4. Decisiones del Product Owner (A-E, 2026-08-15)

Las cinco resoluciones se incorporan **tal cual fueron dictadas, sin reinterpretación**. Se les asigna letra siguiendo el patrón editorial de `LEF-BLOCK-VI-DEFINITION.md` §5, conservando la trazabilidad al Decision Gate de la auditoría que cada una resuelve.

| # | Decisión | Resuelve | Contenido exacto |
|---|---|---|---|
| **A** | Alcance del flujo editorial | **DG-5 → Opción B** | V1 implementa `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`. `SCHEDULED`/`CMS-021` **fuera** de Bloque VII. `editorial_review`/`editorial_finding` **diferidos** conforme a DM §9.21. La separación de responsabilidades de `CMS-018` (el autor no se auto-aprueba) debe ser **real y verificable por el sistema**, no solo un acuerdo de proceso. |
| **B** | Actor administrativo | **DG-3 → Opción B** | Actor administrativo **separado de `Account`**, con identidad individual y auditoría atribuible (`ADMIN-002`). V1 implementa **únicamente** los roles mínimos **Autor** y **Publicador**, no los seis de `ADMIN-003`. Los demás roles de `ADMIN-003` **no se eliminan ni se redefinen**: quedan fuera del alcance inicial hasta que sus responsabilidades se implementen. **NO** reutilizar `InternalOpsGuard` como identidad administrativa. **NO** añadir roles administrativos a `Account`. |
| **C** | Inmutabilidad (`DM-D102`) | **DG-4 → Opción A** | Migración SQL con **triggers** sobre `question_version`, `learning_resource_version` y `answer_option`, de modo que **PostgreSQL sea la autoridad final** de que una versión `PUBLISHED` es inmutable — mismo patrón que `enforce_student_response_immutable` y `enforce_ai_message_immutable`. **También** debe existir validación de servicio cuando corresponda, pero Postgres es la autoridad final: **ningún `UPDATE` directo por SQL debe poder saltarse esto**. Una corrección de contenido publicado crea una **NUEVA** versión, nunca modifica destructivamente la publicada. Deben definirse explícitamente las **ÚNICAS** transiciones administrativas permitidas sobre una fila publicada — **sin abrir una excepción genérica** a la inmutabilidad. Esta protección se implementa **ANTES** de cualquier ruta editorial de escritura (primer incremento). |
| **D** | Superficie (`OQ-028`) | **DG-2 → Opción A** | Bloque VII entrega **API administrativa + CLI interna**, operando bajo el actor administrativo (decisión B), **NO** bajo `InternalOpsGuard`. **NO** se construye una aplicación web administrativa nueva en este bloque. **`CMS-007` (vista previa) queda diferido formalmente**, registrado explícitamente como fuera de alcance. La herramienta **no puede requerir** modificación SQL manual de producción ni cambios en la app móvil. |
| **E** | Importación / cobertura | **DG-6 → Opción B** | La **Content Coverage Matrix** (`CMS-002`) **SÍ** entra en Bloque VII, como capacidad de **solo lectura** (consulta agregada sobre entidades existentes; `countPublishedByTopicId`, `question-version.repository.ts:82`, es el precedente reutilizable/exponible). La **importación masiva** (`CMS-026..029`) queda **diferida** hasta validar el flujo editorial unitario en uso real y hasta que exista necesidad real de producción de contenido a escala. |

**Ninguna de estas cinco decisiones se reabre en este documento.** Los cinco Decision Gates de §14 fueron consecuencias no cubiertas por ellas, nunca cuestionamientos de ellas.

### 4.1 Resoluciones de la segunda ronda (DG-7 a DG-11, 2026-08-15)

El Product Owner resolvió los cinco Decision Gates que la primera versión de este documento dejó abiertos. Se incorporan **tal cual fueron dictadas, sin reinterpretación y sin reabrirse**. El registro completo de cada resolución, con el mapa de dónde quedó incorporada, está en §14.

| Gate | Resolución (síntesis normativa) | Dónde queda incorporada |
|---|---|---|
| **DG-7** | Actor administrativo separado + **token personal por actor, nunca compartido**: identificable hacia un único `AdminActor`, almacenado hasheado (nunca en texto plano), **revocable** y **expirable**. El **backend** es la autoridad de identidad y rol; el **CLI nunca envía ni decide un rol**, solo presenta el token. **No** se reutiliza `InternalOpsGuard`. **No** se abre integración con Firebase real. **No** se mezcla `AdminActor` con `Account`. `ADMIN-002` queda **parcialmente satisfecho**: la verificación adicional/segundo factor para operaciones críticas queda **diferida**, sin inventar ni simular un mecanismo | §9.5, §9.6, §5.2, §7 (inv. 22), §12.2, §13.2 |
| **DG-8** | **`ARCHIVED` queda fuera del flujo V1.** La máquina de estados contractual de Bloque VII es exactamente `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`. `ARCHIVED` permanece en el enum histórico (el enum de Prisma **no se toca**) pero **ninguna ruta de Bloque VII lo produce ni lo alcanza**. La mención a *"`DEPRECATED`/`ARCHIVED`"* en el texto de la resolución de `DM-D102` (decisión C) se reconcilia como **imprecisión de alcance de esa resolución original** y queda corregida: para V1, una fila `PUBLISHED` solo puede realizar la transición administrativa autorizada `PUBLISHED → DEPRECATED` | §8.1, §8.2, §8.4, §7 (inv. 21), §12.3, §13.1 |
| **DG-9** | `AdminActor` es una **clase de sujeto distinta de `Account`**. V1 implementa **desactivación/revocación de acceso** (no elimina el registro) y **preserva la atribución histórica de auditoría**: **nunca** un hard-delete que rompa el rastro de qué actor hizo qué transición. El **periodo exacto de retención administrativa queda EXPLÍCITAMENTE diferido** por falta de fuente contractual que permita fijar un número. **No** se reutilizan los 90 días del Tutor IA (Bloque VI) y **no** se asume que ADR-0005 aplique aquí sin modificación | §11.4, §9.1, §7 (inv. 23), §12.2 |
| **DG-10** | La prohibición de auto-aprobación (`CMS-018`) se mantiene como **regla NORMAL**. Se autoriza una **excepción inicial explícita y auditable** para operación con equipo de una sola persona, tal como contemplan `CMS-018`/`ADMIN-003`/`OQ-029`. La excepción exige **activación deliberada** (no es el comportamiento por defecto), **registro del actor** que la activó/usó y **motivo/justificación registrada por cada uso**. Poseer simultáneamente los roles Autor y Publicador **NO** constituye por sí solo autorización silenciosa de auto-aprobación | §8.3, §8.5, §7 (inv. 9 y 24), §9.2, §12.3, §13.3 |
| **DG-11** | Se **autoriza** una migración SQL sobre entidades de EDUCATION (Bloque I, cerrado) para añadir **índices únicos parciales** que aseguren, según las relaciones parentales reales del schema, **como máximo una versión `PUBLISHED` por `Question` y por `LearningResource`**. **PostgreSQL es la autoridad final** (índice único parcial, no solo validación de servicio). Se implementa **JUNTO CON** la migración de inmutabilidad de `DM-D102` (decisión C), como parte del **mismo Incremento 1**, **ANTES** de cualquier endpoint editorial de escritura | §7 (inv. 16), §8.6, §10, §12.1, §13.1 |

**Nota explícita del Product Owner, incorporada literalmente**: estas decisiones (DG-8 a DG-11) **NO reabren Bloque I funcionalmente** — refuerzan invariantes contractuales ya declarados (unicidad de versión publicada, inmutabilidad) antes de hacer posible su edición administrativa por primera vez. **No cambian ningún comportamiento observable actual del sistema** (hoy nada escribe en esas tablas más allá del seed).

Esta nota es verificable contra el código real y no es una afirmación de confianza: `prisma/seed.ts` se autoexcluye cuando ya existe una versión `PUBLISHED` de la misma identidad (`seed.ts:51-54` para `learningResourceVersion`, `:106-109` para `questionVersion`), de modo que los datos actuales **ya satisfacen** los índices únicos parciales de DG-11, y no existe ninguna otra ruta de escritura sobre esas tablas (audit §3, §2.3).

**Ninguna de estas cinco resoluciones se reabre en este documento.**

---

## 5. Reconciliación con las fuentes

Cada decisión A-E se reconcilia contra PRD, Data Model, Master Context, Kickoff de Fase 2 y los bloques LEF cerrados. Todas las citas provienen de `LEF-BLOCK-VII-EDITORIAL-AUDIT.md` y se reutilizan sin reinventar referencias.

### 5.1 Reconciliación decisión por decisión

**Decisión A — Flujo `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`**

| Fuente | Qué dice | Reconciliación |
|---|---|---|
| PRD `CMS-017` (audit §1.3) | Ocho estados: Borrador → En revisión académica → En revisión editorial → Aprobado → **Programado** → Publicado → Retirado → Archivado | **Subconjunto, no contradicción.** V1 colapsa las dos revisiones (académica + editorial) en un único `IN_REVIEW` y omite `Programado`. `CMS-017` no exige que los ocho existan simultáneamente en la primera herramienta; PRD §17.1 (`prd.txt:7583`) exige lo contrario (*"deberán comenzar de forma sencilla"*). |
| Data Model §8.26 (`datamodel.txt:5455`) | Estados canónicos `draft, in_review, approved, scheduled, published, deprecated, archived`; *"Un elemento `draft` o `in_review` no deberá aparecer en la experiencia pública"* | Los cinco estados de V1 son un subconjunto exacto del catálogo canónico. La segunda cláusula se convierte en **invariante 8** (§7). |
| `schema.prisma:78-87` (Bloque I, cerrado) | `DRAFT, IN_REVIEW, APPROVED, PUBLISHED, DEPRECATED, ARCHIVED` — seis valores, sin `SCHEDULED` | **Coincidencia exacta con decisión A en cinco de seis valores.** El enum **no se modifica**: excluir `SCHEDULED` no requiere ningún cambio de esquema, porque el valor nunca existió. `ARCHIVED` sí existe en el enum histórico y **queda fuera del flujo V1** (**DG-8 resuelto**): permanece como valor del enum, sin que ninguna ruta de Bloque VII lo produzca ni lo alcance. |
| `CMS-018` | *"El autor no deberá marcar su propio contenido como académicamente revisado sin una constancia explícita de excepción durante la etapa inicial"* | Decisión A **endurece** la fuente: exige verificabilidad por el sistema. La cláusula *"sin una constancia explícita de excepción"* de la propia fuente queda resuelta por **DG-10**: la prohibición de auto-aprobación es la regla normal y la excepción existe, pero **solo** con activación deliberada, actor registrado y motivo por uso (§8.5). |
| `OQ-029` (**Resuelta** en el PRD, `prd.txt:11753`) | *"Solo un rol con permiso de publicación podrá cambiar un elemento aprobado a publicado"* | **Satisfecha por primera vez.** Hoy la pregunta está resuelta contractualmente pero es inaplicable: no existe ningún rol (audit §7.1). Decisión A + B la hacen verdadera. |
| `OQ-030` (`prd.txt:11760`) | Doble aprobación obligatoria solo en alto riesgo; *"Para contenido normal bastará el flujo académico y editorial registrado"* | **Contrapeso que autoriza el alcance de A.** El flujo de cuatro transiciones con actor registrado es exactamente "el flujo académico y editorial registrado". |
| DM §9.21 (audit §1.5/§9.2) | *"Si estas funciones no pertenecen al alcance inicial aprobado, las entidades [`editorial_review`/`editorial_finding`] podrán posponerse físicamente"* | **Autoriza explícitamente el diferimiento** que decisión A ejecuta. |
| `DM-D113`/`DM-D114` (`datamodel.txt:6903`) | Todo publicado debe superar revisiones académicas/pedagógicas/lingüísticas/accesibilidad/derechos; los hallazgos bloqueantes impiden publicar | **Parcialmente satisfecho.** El estado `IN_REVIEW`/`APPROVED` con actor distinto materializa *que hubo revisión y quién la hizo*; no materializa las cinco dimensiones ni los hallazgos tipificados. Diferido por DM §9.21. |
| Kickoff Fase 2 §2.4 | Toda funcionalidad debe pasar la regla de incorporación de alcance o queda fuera de la fase | Decisión A es exactamente esa regla aplicada a `CMS-017`. |

**Decisión B — Actor administrativo separado, roles Autor/Publicador**

| Fuente | Qué dice | Reconciliación |
|---|---|---|
| `ADMIN-002` (audit §1.3, `prd.txt:7600` ss.) | Cuenta administrativa **individual**; autenticación segura; verificación adicional para operaciones críticas; sesiones con expiración; registro de accesos. *"No se utilizarán cuentas administrativas compartidas."* | **Parcialmente satisfecho, con la parte diferida nombrada con precisión** (**DG-7 resuelto**). *Satisfecho*: cuenta individual no compartida, autenticación por **token personal por actor** almacenado hasheado, revocable, expirable, y registro de accesos atribuible. *Diferido explícitamente*: **verificación adicional (MFA/segundo factor) para operaciones críticas** — DG-7 autorizó el token personal, no un sistema de segundo factor, y este documento **no inventa ni simula uno** (§9.6). |
| `ADMIN-003` | Seis roles; *"Una misma persona podrá tener varios roles durante la etapa inicial, pero las responsabilidades continuarán diferenciadas en el sistema"* | **Parcialmente satisfecho por diseño y de forma explícita.** V1 implementa dos de los seis. Los cuatro restantes **permanecen en el contrato** (§6, §9.4). La licencia de acumulación de roles de esta misma fuente se reconcilia con la exigencia de verificabilidad de decisión A por la vía de **DG-10**: acumular roles es lícito, pero **tener ambos roles no autoriza por sí solo la auto-aprobación** — la excepción debe activarse y justificarse cada vez (§8.5). |
| `ADMIN-004` / `PRD-D059` | Menor privilegio | **Satisfecho por construcción**: un rol Autor no puede publicar; un rol Publicador no crea contenido en nombre del Autor. Es lo contrario de `InternalOpsGuard`, que la auditoría califica de "todo-o-nada" (§7.2). |
| `ADMIN-001` | *"Panel administrativo web **o herramienta interna equivalente**, separado de la aplicación de estudiantes"* | **Satisfecho** por la vía de la disyunción explícita, combinada con decisión D. La separación es real: identidad distinta, guard distinto, superficie distinta. |
| Master Context §6.17 (`master_context.txt:4404`) | Administration posee "actor administrativo; rol; permiso; acción administrativa" | **Confirmación arquitectónica directa**: el actor administrativo es información propia del dominio ADMINISTRATION, ya canónico (`master_context.txt:3859`). No se crea un dominio nuevo. |
| Master Context `:5028-5034` | Contra estados implícitos/booleanos sobre una entidad ya cargada de semántica | **Sostiene el "NO añadir roles a `Account`"** de decisión B (opción C de DG-3, descartada). |
| `internal-ops.guard.ts:5,21-32` + docstring `:7-16` | Clave compartida por cabecera; *"no es autenticación de usuario"* | **Sostiene el "NO reutilizar `InternalOpsGuard`"** de decisión B. La auditoría §7.2 documenta la contradicción directa con `ADMIN-002`. `InternalOpsGuard` **sigue vigente y sin cambios** para sus seis usos actuales; simplemente no se extiende a lo editorial. |
| `datamodel.txt:6875` | Open Question sin resolver: *"¿Qué roles pueden aprobar exactitud académica y accesibilidad?"* | **Permanece abierta**, y decisión B no la cierra: V1 no implementa Revisor académico. Se registra como diferida (§5.3). |

**Decisión C — `DM-D102` por trigger de PostgreSQL**

| Fuente | Qué dice | Reconciliación |
|---|---|---|
| `DM-D102` (`datamodel.txt:6890`) | *"Toda versión publicada será inmutable."* | **Satisfecho por primera vez de forma aplicada.** Hoy solo está declarado en prosa (`schema.prisma:116`, `:168`) y **ningún mecanismo lo aplica** (audit §5.1, hallazgo G1). |
| `PRD-D004` | *"Toda sesión conservará las versiones de contenido con las que comenzó. Una actualización editorial no reemplazará silenciosamente preguntas dentro de una actividad activa."* | **Satisfecho.** Si la versión publicada no puede mutar, ninguna sesión puede ver su contenido cambiar bajo los pies. |
| `PRD-D053` / `PRD-D055` | Identificador y versión estables; los intentos conservan la versión utilizada | **Satisfechos y reforzados.** `StudentResponse.questionVersionId` con FK `Restrict` (`schema.prisma:270`) ya lo garantiza referencialmente; el trigger lo garantiza además en contenido. |
| `CMS-016` / `CMS-023` / criterio 264 / `prd.txt:5077` | Retiro sin eliminar intentos; sesiones con versión estable; *"Una corrección editorial no reescribe el historial"* | **Satisfechos.** La lista cerrada de transiciones permitidas (§8.4) deja el retiro operativo y bloquea todo lo demás. |
| ADR-0001 / ADR-0012:50 | *"El trigger es la autoridad final — protege incluso ante un script de backfill con un error, una migración manual futura, o un acceso directo a la base"* | **Precedente exacto ya establecido en el proyecto.** Decisión C aplica el criterio del propio proyecto, no una buena práctica genérica. |
| `migration.sql:63,71` (`enforce_student_response_immutable`) y `schema.prisma:2280-2284` (`enforce_ai_message_immutable`) | Patrón real ya en producción: función `plpgsql` que hace `RAISE EXCEPTION` en un trigger `BEFORE UPDATE ... FOR EACH ROW` | **Patrón a replicar literalmente.** Verificado en el código real al escribir este documento (`migration.sql:55-95`). |
| Bloque I cerrado (ADR-0012) | `question_version`/`learning_resource_version`/`answer_option` son entidades de Bloque I | **Decisión Nivel 2 sin cambio de comportamiento observable**: hoy nada actualiza esas tablas (audit §3, §2.3 — cero endpoints de escritura; el seed se autoexcluye si ya hay versión publicada, `seed.ts:51-54,106-109`). El sistema en verde antes debe seguir en verde después. **No reabre Bloque I**: añade una garantía, no altera una semántica existente. |

**Corrección de alcance sobre el texto de la resolución de decisión C (DG-8 resuelto)**: el texto original de la Opción A de DG-4, aprobado como decisión C, nombraba *"la propia transición de estado hacia `DEPRECATED`/`ARCHIVED`"*. El Product Owner reconcilió esa mención como **una imprecisión de alcance de la resolución original**, no como una autorización: **para V1, la única transición de estado admisible sobre una fila `PUBLISHED` es `PUBLISHED → DEPRECATED`**. La lista cerrada de §8.4 y el trigger del Incremento 1 la implementan así. La inmutabilidad que decisión C ordena no cambia en nada; solo se estrecha, en un valor, el conjunto de destinos permitidos.

**Ampliación autorizada del Incremento 1 (DG-11 resuelto)**: decisión C autorizó *triggers de inmutabilidad*. DG-11 **añade** a esa misma migración e incremento los **índices únicos parciales de unicidad de versión publicada** (§8.6). Es la misma clase de decisión Nivel 2 que decisión C —restricción additiva sobre tablas de Bloque I, sin cambio de comportamiento observable, satisfecha ya por los datos actuales— y el Product Owner la autorizó expresamente con esa lectura (§4.1).

**Decisión D — API administrativa + CLI, sin UI nueva**

| Fuente | Qué dice | Reconciliación |
|---|---|---|
| `OQ-028` (`prd.txt:11733`, **Decision Gate abierto desde el PRD v1.0**) | *"Panel propio mínimo · Herramienta administrativa compatible con el backend · CMS estructurado · Importaciones controladas… No se construirá un CMS avanzado antes de validar el flujo editorial real"* | **`OQ-028` queda RESUELTA por decisión D.** Es la primera resolución de esta Open Question en todo el proyecto (ADR-0001 a 0022 y Bloques I-VI nunca la tocaron, audit DG-2). |
| `ADMIN-001` | *"o herramienta interna equivalente"* | **Satisfecho** por la disyunción explícita. |
| MC §8.14 (`master_context.txt:6162`) | *"pequeña y controlada"*; *"Nunca deberá requerir modificación directa de la base de producción"* | **Ambas satisfechas.** La segunda pasa a ser **invariante 12** (§7). |
| PRD §17.1 / `PRD-D052` | *"No se administrará mediante cambios directos en producción"*; *"No… más compleja de lo necesario"* | **Satisfechas.** |
| `CONTENT-011` | Corregir sin publicar una nueva versión de la app móvil | **Satisfecho por la arquitectura ya existente** (contenido servido por API, `education.controller.ts`) — decisión D no lo degrada porque no toca mobile. **Invariante 13** (§7). |
| Kickoff §5.2 | *"orientadas al equipo de desarrollo y administración, no al usuario final"* | **Satisfecho**: un CLI interno es, por construcción, no apto para el usuario final. |
| `CMS-007` (vista previa) | Único requisito de §17 que presupone superficie gráfica | **DIFERIDO formalmente** por decisión D, registrado aquí y en §5.3. No se declara satisfecho ni parcialmente satisfecho. |
| MC `master_context.txt:1892` | "herramienta administrativa" es hipótesis no cerrada; *"no deberá quedar codificada como constante irreversible"* | **Respetado**: la API es la frontera estable; una superficie gráfica futura la consumiría sin reescribir el dominio. Decisión D no cierra la puerta, solo no la abre en V1. |

**Decisión E — Content Coverage Matrix dentro (solo lectura), importación fuera**

| Fuente | Qué dice | Reconciliación |
|---|---|---|
| `CMS-002` / `PRD-D057` / criterio 267 | *"Exista una matriz visible de cobertura"* | **Satisfecho en su núcleo derivable.** No se satisface la taxonomía PAES completa de `CMS-001` (no existe en el esquema, ADR-0012), ni "errores frecuentes documentados" ni "prácticas disponibles" (no existen como entidades). Ver §5.2 para lo parcial. |
| `question-version.repository.ts:82` (`countPublishedByTopicId`) | Precedente real ya en uso por `ProgressService` (ADR-0014, punto 6) | **Reutilizable/exponible tal cual.** La matriz es una agregación del mismo tipo, no una entidad nueva. |
| `CMS-026..029` / criterio 266 / MC §8.19 | Importación CSV/JSON validada, idempotente, *"nunca publicará contenido automáticamente"* | **DIFERIDOS**, autorizados por `OQ-028` (*"no se construirá un CMS avanzado antes de validar el flujo editorial real"*) y MC `master_context.txt:6558` (la decisión de administración de contenido se necesita *"antes de producción de contenido a escala"*, no antes de que exista un flujo editorial). |
| MC §6.17 | Administration *"no deberá escribir directamente en tablas autoritativas"* | **Satisfecho de forma trivial** por la naturaleza de solo lectura de la matriz. **Invariante 14** (§7). |

### 5.2 Tabla consolidada: satisfecho / parcialmente satisfecho / diferido

**SATISFECHOS por las cinco decisiones** (el requisito queda cubierto de forma verificable al cerrar el bloque):

| Requisito | Fuente | Por qué queda satisfecho |
|---|---|---|
| `DM-D102` | `datamodel.txt:6890` | Decisión C — trigger de Postgres, autoridad final |
| **Unicidad de versión publicada por identidad** (propiedad implícita de `DM-D101`/`PRD-D053`, audit §6.3) | ADR-0012, audit §6.3 | **DG-11** — índice único parcial en Postgres, autoridad final, en el Incremento 1. Pasa de "propiedad que se cumple por accidente" a invariante aplicado (invariante 16, §8.6) |
| `PRD-D004` | PRD | Decisión C — la versión publicada no puede mutar |
| `PRD-D052` | `prd.txt:8050-8062` | Decisión D — publicar deja de exigir SQL en producción |
| `PRD-D053` / `PRD-D055` | ídem | Ya vigentes (ADR-0012/0014), reforzados por C |
| `CONTENT-003` | PRD §11.3 | Decisión A — el flujo produce realmente los estados; DRAFT/IN_REVIEW nunca servibles |
| `CONTENT-005` | PRD §11.3 | Decisión C — corregir = versión nueva |
| `CONTENT-006` / `CONTENT-007` | PRD §11.3 | Decisión C + FK `Restrict` ya existente |
| `CONTENT-008` | PRD §11.3 | Decisión A — transición a `DEPRECATED` sin destruir historial |
| `CONTENT-011` | PRD §11.3 | Decisión D — corrección por API, sin release móvil |
| `CONTENT-013` | PRD §11.3 | Decisión B — auditoría atribuible |
| `CONTENT-014` | PRD §11.3 | Fuera de alcance explícito: ninguna IA publica (§3) |
| `ADMIN-001` | PRD §17.3 | Decisión D — herramienta interna equivalente, separada |
| `ADMIN-004` / `PRD-D059` | PRD §17.3 | Decisión B — menor privilegio real entre dos roles |
| `OQ-028` | `prd.txt:11733` | **Resuelta por decisión D** |
| `OQ-029` | `prd.txt:11753` | Ya resuelta contractualmente; **hecha aplicable** por A+B |
| `OQ-030` | `prd.txt:11760` | Satisfecha: contenido normal usa el flujo registrado; los casos de alto riesgo no están en alcance |
| `CMS-016` | PRD §17.6 | Decisión A + C — retiro sin eliminar intentos |
| `CMS-017` (subconjunto V1) | PRD §17.8 | Decisión A — cinco de ocho estados |
| `CMS-022` | PRD §17 | Decisión B — auditoría con actor/momento/motivo/objeto |
| `CMS-023` | PRD §17.9 | Decisión C |
| `CMS-024` | PRD §17 | Decisión A — retiro urgente por operación autorizada |
| `CMS-025` | PRD §17 | Emergente del modelo de versiones: republicar una versión previa = publicar una versión nueva con ese contenido; la anterior nunca se muta |
| Criterio 259 | PRD §17.18 | Decisión D — contenido creable sin modificar código |
| Criterio 260 | ídem | Decisión B |
| Criterio 265 | ídem | Decisión B — cambios auditables |
| Criterio 272 | ídem | Decisión A + C |
| MC §6.24 (*"Solo Education publica"*) | `master_context.txt:4633` | §11.1: la capa administrativa **solicita**, EDUCATION ejecuta y valida |
| MC §6.29 (*"No permitir escritura administrativa arbitraria"*) | `master_context.txt:4732` | Decisiones B+C+D combinadas |
| MC §8.14 | `master_context.txt:6162` | Decisión D |
| MC §8.19 (idempotencia de publicación) | `master_context.txt:5147` | §7 invariante 11, patrón `operationId` ya existente |
| `0016:62` (no editar `xp_ledger_entry`) | ADR-0016 | Fuera de alcance explícito (§3) |

**PARCIALMENTE SATISFECHOS** (el requisito queda cubierto en su núcleo; la parte no cubierta se identifica y se difiere con fuente):

| Requisito | Fuente | Qué SÍ queda | Qué NO queda, y con qué autorización se difiere |
|---|---|---|---|
| **`ADMIN-002`** (**DG-7 resuelto — parcialmente satisfecho, ver §9.6**) | PRD §17.3 | **Cuenta individual y no compartida** (*"No se utilizarán cuentas administrativas compartidas"*); **autenticación segura** por token personal por actor, almacenado hasheado, nunca en texto plano; **revocable**; **expirable** (que es la lectura de *"sesiones con expiración"* que el token satisface: la expiración es del token); **registro de accesos relevantes** y auditoría atribuible; **backend como autoridad de identidad y rol** | **Verificación adicional para operaciones críticas** (MFA/segundo factor, en la lectura habitual del requisito): **DIFERIDA EXPLÍCITAMENTE**. DG-7 autorizó el mecanismo mínimo de token personal y **no** autorizó diseñar un sistema de MFA/segundo factor; este documento **no lo inventa ni lo simula**. **Debe reportarse antes de que `ADMIN-002` se dé por bloqueante-resuelto del Incremento 2 en adelante** (§9.6) |
| `ADMIN-003` | PRD §17.3 | Autor y Publicador, con responsabilidades diferenciadas **en el sistema**; la acumulación de roles es lícita pero **no autoriza auto-aprobación** (DG-10) | Revisor académico, Editor, Soporte, Administrador — **fuera de alcance de implementación V1 por decisión B**, sin salir del contrato (§6, §9.4) |
| `CMS-018` (**DG-10 resuelto**) | PRD §17.8 | El autor no se auto-aprueba —regla **normal**, enforcement por el sistema por identidad de actor (§8.3)— **y** la *"constancia explícita de excepción durante la etapa inicial"* que la propia fuente contempla, materializada como excepción con activación deliberada, actor registrado y motivo por uso (§8.5) | Nada de `CMS-018` queda diferido. Lo que **no** se construye es ningún camino implícito de auto-aprobación: tener ambos roles no basta (§8.5) |
| `CMS-002` / `PRD-D057` / criterio 267 | PRD §17 | Matriz de cobertura por materia/tema con conteo de versiones publicadas, borradores y última actualización | Taxonomía PAES completa (`CMS-001`, no existe en el esquema — ADR-0012), errores frecuentes documentados, prácticas disponibles (no existen como entidades) |
| `CMS-013` / `CMS-004` / `DM-D114` | PRD §17 / DM | Validaciones de contenido previas a publicar (exactamente una alternativa correcta, sin duplicados, explicación presente, clasificación completa) — Incremento 4 | Hallazgos tipificados por severidad con bloqueo formal (`editorial_finding`) → diferido por **DM §9.21** |
| `DM-D113` | `datamodel.txt:6903` | Constancia de que hubo revisión y de quién la hizo, aplicada por el sistema | Las cinco dimensiones nombradas (académica/pedagógica/lingüística/accesibilidad/derechos) como checklist estructurado → diferido por **DM §9.21** |
| DM §8.26 | `datamodel.txt:5455` | Cinco de siete estados canónicos, con la regla de no-exposición pública aplicada | `scheduled` (fuera por decisión A); **`archived` fuera del flujo V1 por DG-8** — el valor sigue en el enum histórico, sin ruta que lo alcance (§8.1) |
| `MOD-004` (registro de responsable/motivo) | PRD | El registro de acción administrativa cubre la propiedad exigida sobre contenido | Moderación como dominio (`MOD-001..003`) ya excluida en bloque cerrado (`LEF-BLOCK-V-CLOSURE-REPORT.md:19`) |

**DIFERIDOS** (explícitamente fuera de V1, cada uno con la fuente que autoriza el diferimiento):

| Requisito | Fuente que lo exige | Fuente que autoriza diferirlo |
|---|---|---|
| `CMS-007` — vista previa | PRD §17 | **Decisión D** (registro formal explícito) + `OQ-028` (*"no se construirá un CMS avanzado antes de validar el flujo editorial real"*) + MC §8.14 |
| **`ADMIN-002` — verificación adicional (MFA/segundo factor) para operaciones críticas** | PRD §17.3 | **DG-7**, que autorizó únicamente el mecanismo mínimo de token personal. **Diferimiento parcial, no del requisito completo** (§5.2 parciales, §9.6). Debe reportarse explícitamente antes de dar `ADMIN-002` por bloqueante-resuelto |
| **Periodo exacto de retención administrativa del `AdminActor` desactivado y de sus credenciales revocadas** | Ninguna fuente contractual lo fija | **DG-9**, que lo difiere de forma explícita por ausencia de fuente que permita fijar un número. **No** se reutilizan los 90 días del Tutor IA (Bloque VI) ni se asume que ADR-0005 aplique sin modificación: son clases de sujeto distintas (§11.4) |
| **`ARCHIVED` como estado alcanzable** | `CMS-017` (8 estados), DM §8.26 | **DG-8** — fuera del flujo V1; el valor permanece en el enum sin producirse (§8.1) |
| `CMS-021` / `SCHEDULED` / DM §8.27 `catalog_availability` | PRD §17, DM §8.26-8.27 | **Decisión A** + ausencia del valor en el enum real (`schema.prisma:78-87`) + criterio de ADR-0012 contra complejidad anticipatoria |
| `editorial_review` / `editorial_finding` | DM §9.22-9.23, §10.20 | **DM §9.21** — *"podrán posponerse físicamente"* + `OQ-030` |
| `CMS-026..029` — importación masiva | PRD §17.10, criterio 266 | **Decisión E** + `OQ-028` + MC `master_context.txt:6558` |
| `CMS-028` — exportación | PRD §17.10 | Sin necesidad demostrada en Fase 2 (audit §1.8 clase D) |
| `EXAM-001..005` | PRD | El dominio de ensayos no existe (ADR-0014 descartó Data Model Bloque 11) |
| `MOD-001..003` | PRD | `LEF-BLOCK-V-CLOSURE-REPORT.md:19` (bloque cerrado) |
| `SUPPORT-001..004` | PRD §17 | Kickoff §5.2 acota a "administración del **contenido educativo**" |
| `ADMIN-005..009` (flags/kill switch/config académica) | PRD §17 | Kickoff §5.2 + `0016:62` (alcanzaría XP/recompensas/IA → reabriría bloques cerrados) |
| `ADMIN-010..013` (privacidad administrativa) | PRD §17 | El alcance editorial no ve datos de estudiantes (audit §1.8 clase D) |
| `ADMIN-014..018` (observabilidad/respaldos) | PRD §17 | Infraestructura; Bloque VIII o operación |
| `datamodel.txt:6875` — *"¿Qué roles pueden aprobar exactitud académica y accesibilidad?"* | Open Question del Data Model | **Decisión B** (Revisor académico fuera de V1) — la Open Question **permanece abierta**, no se cierra falsamente |
| `0019:15,107` — concesión manual de ítems / `REVERSED` | ADR-0019 (bloque cerrado) | Delegación sin plazo; Kickoff §5.2 acota a contenido educativo. **La delegación no se revoca** |

### 5.3 Nota de honestidad sobre lo diferido

Ningún diferimiento de §5.2 elimina el requisito del contrato. Se aplica el mismo criterio editorial que `LEF-BLOCK-VI-DEFINITION.md` §26 usó para la decisión F: **diferir la implementación nunca es revocar el requisito**. Cada fila de la tabla de diferidos debe reaparecer en el reporte de cierre del bloque como deuda registrada con propietario, siguiendo el criterio de `LEF-BLOCK-VI-CLOSURE-REPORT.md:9`.

---

## 6. Preservación de decisiones contractuales previas no sobreescritas

Esta sección existe para que ninguna decisión ya vigente se reinterprete en silencio por el hecho de que Bloque VII toque su vecindad. Lo siguiente **no fue tocado por las decisiones A-E y sigue vigente exactamente como está**:

1. **`DM-D101` / ADR-0012 — modelo identidad + versión.** `LearningResource`/`LearningResourceVersion` y `Question`/`QuestionVersion` (`schema.prisma:100-201`) conservan su forma. Bloque VII **no** introduce un modelo de versionado alternativo.
2. **`EducationLogicalStatus` (`ACTIVE|RETIRED`) y `EditorialStatus` son dos ejes independientes** (`schema.prisma:69-87`, audit §2.1). Bloque VII **no** los fusiona ni redefine. Retirar la *identidad* (`question.status = 'RETIRED'`) y despublicar una *versión* (`editorialStatus ≠ PUBLISHED`) siguen siendo operaciones distintas con efectos distintos.
3. **`CurriculumTopic` permanece plano, sin versión**, con `subjectId` inmutable por trigger — divergencia deliberada del Data Model confirmada en ADR-0012 "Alternativas". Bloque VII **no** la migra a jerarquía versionada.
4. **`questionType` vive en la identidad, y habilitar nuevos tipos es una decisión Nivel 2/3 separada** (ADR-0012:65). Bloque VII **no** abre esa puerta ni implícitamente.
5. **Los cinco triggers de consistencia de materia** (`20260801205203_education_foundation_expand/migration.sql:230,268,282,298,322`) siguen siendo la autoridad de identidad↔versión↔tema y **no se modifican**. Los triggers de decisión C se **añaden**, nunca reemplazan ni relajan a los existentes.
6. **`AnswerOption.isCorrect` nunca se serializa desde EDUCATION** (`education.service.ts:35-38,136`; `packages/contracts: answerOptionPublicResponseSchema`); PROGRESS lo revela solo en la respuesta al `POST` (ADR-0014); el Tutor solo tras `StudentResponse` real. Bloque VII **no** cambia ninguna de las tres reglas, y la Content Coverage Matrix **no** expone `isCorrect` (invariante 14).
7. **Zod (`@axioma/contracts`) es la autoridad de la forma del JSON de bloques** (ADR-0012 punto 4). Bloque VII **reutiliza** los esquemas existentes; `packages/contracts` **no se modifica** en este documento y cualquier contrato nuevo que un incremento requiera será additivo y explícito en su propio diseño.
8. **`DM-D104`** — el contenido educativo nunca se almacena como HTML libre. Sostiene la exclusión del WYSIWYG (§3).
9. **Las fórmulas se renderizan en el momento de publicación con `renderLatexToSvg()`, nunca en lectura** (ADR-0002/ADR-0013, `seed.ts:9,69`). Bloque VII conserva ese momento: la ruta de autoría publica SVG congelado, exactamente como el seed.
10. **`InternalOpsGuard` sigue vigente sin cambios** para sus seis usos actuales (`ai-internal-admin`, `analytics`, `gamification`, `progression`, `diagnostics`, `privacy`). Decisión B lo excluye de lo editorial; **no lo deroga ni lo modifica**.
11. **`AuthGuard` y `Account` no se tocan.** `Account` sigue sin campo de rol (`schema.prisma:290-311`). El sistema conserva una sola clase de usuario final: el estudiante autenticado.
12. **ADR-0004 permanece intacto**: `IdentityProvider` con `FirebaseIdentityProvider`/`StubIdentityProvider`, y la validación contra un proyecto Firebase real sigue siendo el Decision Gate abierto que ya registra `PHASE-2-KICKOFF-INVENTORY.md:57`. Bloque VII **no** lo resuelve ni lo reabre. **DG-7 lo confirma expresamente**: la autenticación del `AdminActor` es por token personal propio y **no abre integración con Firebase real**; el gate abierto de ADR-0004 queda exactamente donde estaba.
13. **ADR-0005 (Privacy) permanece intacto.** El pipeline de eliminación de cuenta opera sobre `Account`; Bloque VII no lo modifica (§11.4). **DG-9 lo refuerza**: `AdminActor` es una clase de sujeto distinta y **no se asume que ADR-0005 le aplique sin modificación**.
14. **Bloque VI (Tutor IA) permanece cerrado y sin cambios.** Ni `AiAcademicContextBuilder`, ni `AiConversation.contextQuestionVersionId`, ni `verify-ai-answerkey-isolation-gate.ts`, ni los prompts `AXIOMA_TUTOR_V6_1` se tocan (§11.3).
15. **`xp_ledger_entry` sigue siendo append-only y ninguna herramienta de este bloque lo edita ni lo borra** — `0016-gamificacion-fundacion.md:62`, *"solo compensar"*.
16. **La delegación de `0019:15,107`** (concesión manual de ítems, `REVERSED` de recompensas) al Bloque VII **no se revoca**: queda fuera del alcance de V1 sin plazo, no eliminada.
17. **`prisma/seed.ts` sigue siendo el mecanismo de contenido de desarrollo** y debe permanecer idempotente y compatible con los invariantes nuevos. Decisión C no lo rompe: el seed nunca actualiza una versión publicada (`seed.ts:51-54,106-109`) y solo inserta. **DG-11 tampoco lo rompe**: esas mismas líneas son precisamente una comprobación de "¿ya hay una versión publicada de esta identidad?", de modo que el seed **ya cumple** el índice único parcial que DG-11 introduce.
18. **La retención de 90 días del Tutor IA (Bloque VI) no se extiende a ninguna entidad de este bloque.** **DG-9 lo prohíbe explícitamente**: es una política fijada para otra clase de sujeto y otro tipo de dato; reutilizarla por analogía para el `AdminActor` sería inventar una fuente que no existe (§11.4).
19. **El enum `EditorialStatus` no se modifica en ninguno de sus seis valores** — ni se añade `SCHEDULED`, ni se elimina `ARCHIVED`. **DG-8** deja `ARCHIVED` fuera del *flujo*, no fuera del *enum*: eliminarlo sería modificar un artefacto de Bloque I, cerrado.

**Requisitos que ya estaban satisfechos o correctamente diferidos y que no dependen de ninguna de las cinco decisiones** (no requieren decisión nueva y se listan para que no se reabran): `CONTENT-001`/`CONTENT-002`/`CONTENT-004`/`CONTENT-009`/`CONTENT-010`/`CONTENT-012` (ya orientaron ADR-0012/ADR-0014 y no son tocados por A-E); `CMS-019` (observaciones de revisores — parte del paquete `editorial_review` diferido por DM §9.21); `CMS-020` (checklist de revisión — ídem); `EXAM-*`, `MOD-*`, `SUPPORT-*`, `ADMIN-005..018` (ya diferidos por fuentes de bloques cerrados o por el acotamiento del Kickoff §5.2, sin necesidad de decisión nueva).

---

## 7. Invariantes y trust boundaries

Lista numerada, exhaustiva, de lo que Bloque VII debe garantizar. Cada invariante indica **en qué capa se verifica**, con el mismo rigor que los 17 invariantes de `LEF-BLOCK-VI-DEFINITION.md` §6.

### 7.1 Invariantes

1. **Una `question_version` o `learning_resource_version` en `PUBLISHED` es inmutable en su contenido.** Ningún `UPDATE` puede alterar `stem_content`, `explanation_content`, `content_blocks`, `title`, `question_id`, `learning_resource_id`, `curriculum_topic_id`, `published_at`, `created_at` ni `id` de una fila publicada — **ni siquiera por SQL directo, ni por un backfill, ni por una migración futura**. *Capa: PostgreSQL (trigger, autoridad final) + servicio (validación complementaria).* Fuente: decisión C, `DM-D102`, ADR-0012:50.
2. **Un `answer_option` cuya `question_version` padre está en `PUBLISHED` es inmutable**, y no se puede **insertar** un `answer_option` nuevo en una versión publicada ni **borrar** uno existente. *Capa: PostgreSQL (triggers `BEFORE UPDATE`, `BEFORE INSERT`, `BEFORE DELETE` sobre `answer_option`, resolviendo el estado de la versión padre) + servicio.* Fuente: decisión C — insertar o borrar una alternativa **es** modificar destructivamente la pregunta publicada.
3. **Una fila en `PUBLISHED` no puede borrarse.** *Capa: PostgreSQL (trigger `BEFORE DELETE`).* Derivado del literal de decisión C (*"nunca modificar destructivamente la publicada"*): borrar es la forma más destructiva de modificar. Hoy esto solo falla por accidente estructural cuando existe un `StudentResponse` (audit §5.4); una versión publicada sin respuestas es borrable, y no debe serlo. **Se declara aquí explícitamente como derivación, para que el Product Owner pueda objetarla si no era su intención.**
4. **La única lista de transiciones administrativas permitidas sobre una fila publicada es la de §8.4, y es cerrada.** No existe ninguna excepción genérica, ningún flag de bypass, ningún rol que pueda saltársela, ninguna variable de entorno que la desactive. *Capa: PostgreSQL (el trigger implementa exactamente esa lista) + servicio.* Fuente: decisión C, literal.
5. **Corregir contenido publicado es siempre crear una versión NUEVA.** Ninguna ruta del sistema permite "editar lo publicado". *Capa: servicio (la API no expone la operación) + PostgreSQL (invariantes 1-3 la impiden aunque alguien la construyera).* Fuente: decisión C, `CONTENT-005`, `CMS-025`.
6. **El actor administrativo es una identidad propia, individual y separada.** No es un `Account`, no es un rol sobre `Account`, no es `InternalOpsGuard`, no es una clave compartida. *Capa: esquema (tabla propia, sin FK a `Account`) + guard administrativo propio + gate estático.* Fuente: decisión B, `ADMIN-002`.
7. **Ninguna operación editorial de escritura o de transición de estado puede ejecutarse sin autenticación y autorización del actor administrativo con el rol requerido.** Sin actor → rechazo; con actor sin el rol → rechazo. *Capa: API (guard) + servicio (autorización por operación).* Fuente: decisión B, `OQ-029`, `ADMIN-004`.
8. **Ninguna versión que no esté en `PUBLISHED` es visible en ninguna superficie del estudiante**, en ningún endpoint, en ningún momento. *Capa: servicio/repositorio (los cuatro lectores ya lo garantizan, §11.1) + gate.* Fuente: DM §8.26, `CONTENT-003`. **Este invariante ya está vigente y Bloque VII solo debe no degradarlo.**
9. **Un mismo actor administrativo no puede ejecutar la transición de aprobación/publicación sobre una versión que él mismo creó o editó por última vez** (`CMS-018` aplicado por el sistema). *Capa: servicio (comparación de identidades de actor) + auditoría (ambos actores quedan registrados).* Fuente: decisión A, literal. **Esta es la regla NORMAL y el comportamiento por defecto.** Su única excepción es la de `CMS-018` formalizada en §8.5 (**DG-10 resuelto**), que **no** relaja este invariante de forma implícita: sin activación deliberada y motivo registrado, el sistema **rechaza**, y tener ambos roles asignados **no** constituye activación (invariante 24).
10. **Toda acción editorial queda registrada de forma atribuible e inmutable**: actor, momento, tipo de acción, objeto afectado, estado previo, estado nuevo, motivo. El registro es append-only. *Capa: esquema (tabla append-only) + PostgreSQL (trigger de inmutabilidad, mismo patrón que `enforce_ai_message_immutable`) + servicio.* Fuente: decisión B, `CMS-022`, `CONTENT-013`, `MOD-004`, criterio 265.
11. **Reenviar la misma operación editorial no repite su efecto** (idempotencia por clave de operación). *Capa: esquema (`@@unique` sobre la clave de operación, mismo patrón que `StudentResponse.operationId`, `schema.prisma:268`) + servicio.* Fuente: MC §8.19 (`master_context.txt:5147`), que nombra explícitamente "publicación" e "importación administrativa".
12. **Ninguna operación editorial requiere modificación SQL manual contra producción.** *Capa: producto (la API/CLI cubre crear, revisar, aprobar, publicar, corregir y retirar) + criterio de cierre verificable (§13).* Fuente: decisión D, MC §8.14, `PRD-D052`.
13. **Ninguna operación editorial requiere un cambio ni un despliegue de `apps/mobile`.** *Capa: arquitectura (contenido servido por API) + gate estático (`apps/mobile` sin cambios en todo el bloque).* Fuente: decisión D, `CONTENT-011`.
14. **La Content Coverage Matrix es estrictamente de solo lectura**: no crea, no modifica, no borra, no transiciona, no introduce ninguna ruta de escritura nueva, y no expone `AnswerOption.isCorrect` ni ningún dato de estudiante. *Capa: API (solo `GET`) + servicio (solo consultas de agregación) + gate estático.* Fuente: decisión E, MC §6.17, ADR-0012/ADR-0014.
15. **La autoridad de publicación es EDUCATION, no la capa administrativa.** La capa administrativa **solicita**; EDUCATION valida sus propios invariantes y ejecuta la transición. *Capa: arquitectura de módulos + gate estático (ningún módulo administrativo escribe en repositorios de EDUCATION sin pasar por su servicio).* Fuente: MC §6.24 (*"Solo Education publica"*), MC §6.17 (*"no escribir directamente en tablas autoritativas"*).
16. **Existe como máximo una versión `PUBLISHED` por identidad** (`question_version.question_id` / `learning_resource_version.learning_resource_id`) **en todo momento**; al publicar una corrección, la anterior se despublica en la **misma operación transaccional**. *Capa: **PostgreSQL — índice único parcial, autoridad final** (`question_version(question_id) WHERE editorial_status = 'PUBLISHED'` y `learning_resource_version(learning_resource_id) WHERE editorial_status = 'PUBLISHED'`), **más** servicio (transacción que ordena las dos escrituras).* Fuente: **DG-11 resuelto** + audit §6.3 (`findPublishedByTopicId` devolvería todas las versiones publicadas y serviría preguntas duplicadas al estudiante). Detalle de ejecución en §8.6. **Este invariante se introduce en el Incremento 1**, junto con los invariantes 1-4, no en el Incremento 4.
17. **Ninguna herramienta de este bloque escribe, edita ni borra `xp_ledger_entry`, `league_point_ledger_entry` ni ninguna tabla de dominio de Bloques I-VI.** *Capa: gate estático.* Fuente: `0016-gamificacion-fundacion.md:62`.
18. **Ninguna IA participa en la creación, revisión, aprobación ni publicación de contenido.** *Capa: gate estático (ningún módulo editorial importa el dominio `ai/`).* Fuente: `CONTENT-014`, MC §6.29, `datamodel.txt:6541`.
19. **Los cuatro lectores de contenido (§11.1) conservan su predicado de elegibilidad byte-idéntico.** *Capa: gate (diff estático de los archivos de lectura + regresión funcional de Bloques I-VI).* Fuente: audit §6.2/§6.3.
20. **Ninguna decisión de Bloques I-VI se reinterpreta ni se reabre.** *Capa: revisión documental en el cierre + regresión consolidada en PASS.*

**Invariantes 21-24 — introducidos por las resoluciones DG-7 a DG-11 (segunda ronda).**

21. **`ARCHIVED` no es alcanzable por ninguna ruta de Bloque VII.** Ninguna operación de API, ningún comando de CLI, ninguna transición de §8.2 y ninguna entrada de la lista cerrada de §8.4 produce el valor `ARCHIVED`. El valor **permanece en el enum de Prisma** como artefacto histórico de Bloque I y **no se elimina**. El estado terminal de V1 es `DEPRECATED`. *Capa: PostgreSQL (el trigger de §8.4 rechaza `PUBLISHED → ARCHIVED`) + servicio (la máquina de estados no expone el destino) + gate estático (ninguna ruta editorial escribe el literal `ARCHIVED`).* Fuente: **DG-8 resuelto**.
22. **El `AdminActor` se autentica por un token personal, único por actor, nunca compartido; el backend es la única autoridad de identidad y de rol.** El token debe ser resoluble a un único `AdminActor`, almacenarse **hasheado y nunca en texto plano**, y ser **revocable** y **expirable**. **El CLI nunca envía ni decide un rol**: solo presenta el token, y el backend resuelve identidad y rol a partir de él. Un token compartido entre dos personas, un token en texto plano, un token sin expiración o un rol enviado por el cliente son, cada uno, una violación de este invariante. *Capa: esquema (tabla de token con hash y estado) + guard administrativo propio (resolución de identidad+rol en el servidor) + gate (`verify:admin-actor-gate`, §13.2).* Fuente: **DG-7 resuelto**, `ADMIN-002`, `ADMIN-004`.
23. **La baja de un `AdminActor` es desactivación/revocación, nunca hard-delete, y la atribución histórica de auditoría se preserva íntegra.** Desactivar un actor revoca sus tokens y le impide operar, pero **no** elimina su fila ni ningún registro de acción administrativa: siempre debe poder responderse "qué actor hizo qué transición" sobre cualquier transición pasada. Ningún borrado, purga, anonimización ni política de retención puede romper ese rastro. *Capa: esquema (FK `Restrict` desde el registro de acción hacia el actor, mismo criterio que `StudentResponse.questionVersionId`, `schema.prisma:270`) + servicio (no existe operación de borrado de actor) + gate (borrar un actor referenciado falla, §13.2 punto 7).* Fuente: **DG-9 resuelto**, decisión B, invariante 10.
24. **La excepción de `CMS-018` nunca es implícita.** Poseer simultáneamente los roles Autor y Publicador **no** autoriza la auto-aprobación. Para que T5 o T7 se ejecuten sobre una versión creada o editada por última vez por el mismo actor se exigen, acumulativamente: **activación deliberada** de la excepción (nunca el comportamiento por defecto), **registro del actor** que la activó y la usó, y **motivo/justificación registrada por cada uso**. Faltando cualquiera de los tres, el sistema **rechaza**. *Capa: servicio (la rama de excepción es explícita y no se infiere de los roles del actor) + esquema (el uso queda como tipo de evento distinguible en el registro append-only) + gate (§13.3 punto 6: sin marca explícita, rechazo).* Fuente: **DG-10 resuelto**, `CMS-018`, `ADMIN-003`, `OQ-029`.

**Alcance acotado de la excepción del invariante 24**: la excepción de `CMS-018` afecta **únicamente** al invariante 9 (separación de actor). **No** abre, ni parcial ni transitivamente, ninguna excepción a los invariantes 1-5 (inmutabilidad de la versión publicada) ni al 16 (unicidad de versión publicada). §8.4 sigue siendo cerrada y sin excepciones de ningún tipo, exactamente como decisión C ordena.

### 7.2 Trust boundaries — quién puede hacer qué, verificado dónde

| Sujeto | Puede | No puede | Verificado en |
|---|---|---|---|
| **Estudiante** (`Account` + `AuthGuard`) | Leer contenido `PUBLISHED` de una `Question` `ACTIVE`; responder | Ver `DRAFT`/`IN_REVIEW`/`APPROVED`/`DEPRECATED`/`ARCHIVED`; crear, editar, transicionar; ver `isCorrect` desde EDUCATION | Servicio/repositorio (predicado de elegibilidad, §11.1) + gates existentes de Bloques I-VI |
| **AdminActor rol Autor** | Crear `Question`/`QuestionVersion`/`AnswerOption` y `LearningResource`/`LearningResourceVersion` en `DRAFT`; editar mientras estén en `DRAFT`; enviar a `IN_REVIEW`; devolver a `DRAFT` una versión que él envió; leer la Content Coverage Matrix | Aprobar; publicar; retirar; aprobar/publicar contenido **propio** (invariante 9); tocar cualquier fila `PUBLISHED`; tocar `Account`, progreso, XP, ranking, conversaciones de IA | API (guard + autorización por operación) + servicio + PostgreSQL para todo lo que toque una fila publicada |
| **AdminActor rol Publicador** | Transicionar `IN_REVIEW → APPROVED`, `APPROVED → PUBLISHED`, `PUBLISHED → DEPRECATED`, y las devoluciones de §8.2; leer la Content Coverage Matrix | Editar el contenido de una versión (ni en `DRAFT` — eso es del Autor, `ADMIN-004` menor privilegio); aprobar/publicar contenido del que él es autor (invariante 9); mutar o borrar una fila `PUBLISHED`; tocar cualquier dominio fuera de EDUCATION | API + servicio + PostgreSQL |
| **`InternalOpsGuard`** (clave compartida) | Exactamente lo que hace hoy: barridos operativos, circuit breaker de IA, diagnósticos, relay de analytics | **Cualquier operación editorial**, sin excepción | Gate estático: ningún controller editorial usa `InternalOpsGuard` |
| **CLI interna** (Incremento 6) | Presentar el **token personal** del actor y consumir la API administrativa | **Decidir o enviar un rol**; abrir conexión propia a la base; usar `INTERNAL_OPS_KEY`; contener lógica de dominio | Guard administrativo del backend (resuelve identidad y rol a partir del token, invariante 22) + comprobación estática (§13.6 puntos 2-3) |
| **Acceso directo a PostgreSQL** (psql, migración, backfill, seed) | `INSERT` de contenido nuevo; `UPDATE` de filas en `DRAFT`/`IN_REVIEW`/`APPROVED` | Mutar, borrar o alterar el contenido de una fila `PUBLISHED`; transicionar fuera de la lista cerrada de §8.4; **dejar dos versiones `PUBLISHED` de la misma identidad** (invariante 16, índice único parcial); **producir `ARCHIVED` sobre una fila publicada** (invariante 21) | **PostgreSQL — autoridad final.** Este es el punto exacto donde decisión C y DG-11 son indispensables: es la única capa que ve este sujeto |
| **Proveedor de IA / Tutor** | Leer contexto académico de una versión `PUBLISHED` (§11.3) | Crear, editar, revisar, aprobar ni publicar contenido | Gate estático (invariante 18) + `CONTENT-014` |

**Nota de rigor sobre la capa**: el criterio es el ya establecido por ADR-0012:50 y reafirmado por decisión C — *"el trigger es la autoridad final"*. La validación de servicio existe para dar mensajes de error correctos y para rechazar antes de llegar a la base; **nunca** es la garantía. Un invariante cuya única defensa sea el servicio no cuenta como aplicado en este bloque.

---

## 8. Máquina de estados exacta y transiciones autorizadas

Sigue el criterio de Master Context `master_context.txt:5035`: *"cada máquina de estados deberá definir estados, transición inicial, transiciones válidas, **actor autorizado**, condiciones, efectos"*.

### 8.1 Estados en alcance de V1

**La máquina de estados contractual de Bloque VII es exactamente**:

`DRAFT` (inicial) → `IN_REVIEW` → `APPROVED` → `PUBLISHED` → `DEPRECATED` (**terminal en V1, sin excepciones**).

- **`SCHEDULED`**: no existe en el enum real (`schema.prisma:78-87`) y queda **fuera** por decisión A. No se añade el valor.
- **`ARCHIVED`** (**DG-8 resuelto**): existe en el enum real como sexto valor y **permanece allí, intacto**, como artefacto histórico de Bloque I — un valor que ya existía antes de esta definición y que este documento **no elimina** (eliminarlo modificaría un artefacto de un bloque cerrado; ver §6, punto 19). **Pero `ARCHIVED` queda FUERA del flujo V1: ninguna ruta de Bloque VII lo produce, lo alcanza ni lo permite.** No aparece en la lista de transiciones de §8.2, no aparece en la lista cerrada de §8.4, y el trigger del Incremento 1 rechaza `PUBLISHED → ARCHIVED` de forma permanente, no provisional (invariante 21).
- **Corrección de una imprecisión de la primera versión de este documento**: el texto aprobado de decisión C (vía Opción A de DG-4) mencionaba *"la propia transición de estado hacia `DEPRECATED`/`ARCHIVED`"*. El Product Owner reconcilió esa mención como **una imprecisión de alcance de aquella resolución**, no como una autorización. **Para V1, una versión `PUBLISHED` solo puede realizar la transición administrativa autorizada `PUBLISHED → DEPRECATED`.** Este documento no conserva ninguna mención residual de `ARCHIVED` como estado alcanzable.
- **`ARCHIVED` fuera del flujo no significa `ARCHIVED` prohibido para siempre en el proyecto**: significa que Bloque VII V1 no lo produce. Si una fase futura quisiera darle semántica propia distinta de `DEPRECATED`, sería una decisión nueva con su propio ADR — y, como la lista de §8.4 es cerrada y vive en un trigger, exigiría además una migración explícita.

### 8.2 Transiciones autorizadas (lista cerrada)

| # | Transición | Actor autorizado | Precondiciones | Efectos |
|---|---|---|---|---|
| T1 | *(inexistente)* → `DRAFT` | **Autor** | Validación Zod de los bloques (`@axioma/contracts`); consistencia identidad↔versión↔tema (los 5 triggers existentes) | Crea la versión. `publishedAt` nulo. Registra acción administrativa |
| T2 | `DRAFT` → `DRAFT` (edición) | **Autor** | La versión está en `DRAFT`; validación Zod | Actualiza contenido. Registra acción |
| T3 | `DRAFT` → `IN_REVIEW` | **Autor** | La versión está en `DRAFT`; validaciones de contenido de `CMS-013` en PASS (exactamente una alternativa correcta, sin alternativas duplicadas, explicación presente, clasificación completa) | Congela la edición: a partir de aquí el Autor no puede editar sin devolverla a `DRAFT` (T4). Registra acción |
| T4 | `IN_REVIEW` → `DRAFT` (devolución) | **Autor** (el mismo) **o Publicador** | La versión está en `IN_REVIEW` | Reabre la edición. Registra acción con motivo obligatorio |
| T5 | `IN_REVIEW` → `APPROVED` | **Publicador** | La versión está en `IN_REVIEW`; **el actor no es el autor de la versión** (invariante 9 / `CMS-018`) | Marca la revisión superada, con constancia de quién la hizo. Registra acción |
| T6 | `APPROVED` → `DRAFT` (rechazo tardío) | **Publicador** | La versión está en `APPROVED` | Reabre la edición. Registra acción con motivo obligatorio |
| T7 | `APPROVED` → `PUBLISHED` | **Publicador** | La versión está en `APPROVED`; **el actor no es el autor de la versión** (salvo excepción registrada de §8.5); si ya existe otra versión `PUBLISHED` de la misma identidad, la operación **debe** despublicarla **antes**, dentro de la misma transacción (invariante 16, §8.6); operación con clave de idempotencia (invariante 11) | Fija `published_at`. La versión pasa a ser servible por los cuatro lectores. Registra acción |
| T8 | `PUBLISHED` → `DEPRECATED` | **Publicador** | La versión está en `PUBLISHED`; motivo obligatorio; operación con clave de idempotencia | La versión deja de ser servible por los cuatro lectores. **`published_at` NO se modifica** (es un hecho histórico). Ningún `StudentResponse`, `QuickQuestionAttempt` ni `AiConversation` se altera. Registra acción |

**No existe T9.** La tabla anterior es la lista completa de transiciones de Bloque VII V1. En particular, **ninguna transición tiene `ARCHIVED` como origen ni como destino** (**DG-8 resuelto**, invariante 21).

**Efecto colateral obligatorio de T7 con corrección** (audit §6.3): publicar una versión nueva de una identidad que ya tiene una versión publicada **debe** despublicar la anterior en la misma transacción. `findPublishedByTopicId` (`question-version.repository.ts:40`) devuelve **todas** las versiones publicadas de un tema; si quedaran dos versiones publicadas de la misma pregunta, el estudiante vería la pregunta duplicada. Con **DG-11 resuelto**, esto deja de ser solo enforcement de servicio: **PostgreSQL es la autoridad final** vía el índice único parcial, y el orden exacto de las dos escrituras dentro de la transacción es una consecuencia técnica que §8.6 especifica.

### 8.3 `CMS-018` — enforcement preciso y verificable

Decisión A exige que la separación sea *"real y verificable por el sistema, no solo un acuerdo de proceso"*. La única lectura de esa exigencia que resulta **verificable** es por **identidad de actor**, no por rol:

- **Regla V1**: el `AdminActor` que ejecuta T5 (`IN_REVIEW → APPROVED`) y el que ejecuta T7 (`APPROVED → PUBLISHED`) **no pueden ser el mismo `AdminActor` que creó la versión (T1) ni el que la editó por última vez (T2)**. La comparación es entre identificadores de actor, contra el registro de acción administrativa — determinista, sin ambigüedad y verificable por gate.
- **Por qué no "otro rol"**: `ADMIN-003` autoriza expresamente que *"una misma persona podrá tener varios roles durante la etapa inicial"*. Si la regla fuera "otro rol", una sola persona con ambos roles satisfaría la comprobación cambiándose el sombrero, y la separación sería exactamente el "acuerdo de proceso" que decisión A prohíbe. La comparación por identidad de actor es la única que el sistema puede verificar de verdad.
- **Consecuencia operativa**: bajo esta regla, un equipo editorial de **una sola persona no podría publicar nada**. `CMS-018` contempla su propia salida (*"sin una constancia explícita de excepción durante la etapa inicial"*). **DG-10 resolvió que esa excepción existe en V1**, con condiciones estrictas, y **§8.5 la formaliza**. La regla de este §8.3 sigue siendo **la regla normal y el comportamiento por defecto**; §8.5 es su única excepción, y no se aplica sola.

### 8.4 Transiciones y `UPDATE` permitidos sobre una fila ya `PUBLISHED` — lista exhaustiva y cerrada

**Esta es la lista que la migración del Incremento 1 (decisión C + DG-11) debe hacer cumplir. Es cerrada: todo lo que no aparezca aquí queda rechazado por PostgreSQL.**

**Regla única de transición de estado sobre una fila `PUBLISHED`** (**DG-8 resuelto**): `PUBLISHED → DEPRECATED`. **Ninguna otra**, ni `ARCHIVED`, ni ningún estado anterior del flujo. `ARCHIVED` **no aparece en esta lista** y el trigger lo rechaza como cualquier otro destino no enumerado.

**`question_version` con `editorial_status = 'PUBLISHED'`** — el único `UPDATE` admisible es aquel en el que **todas** estas condiciones se cumplen simultáneamente:

| Columna | ¿Puede cambiar? | Valor permitido |
|---|---|---|
| `id` | **No** | — |
| `question_id` | **No** | — |
| `curriculum_topic_id` | **No** | — |
| `stem_content` | **No** | — |
| `explanation_content` | **No** | — |
| `editorial_status` | **Sí, y solo así** | `'PUBLISHED' → 'DEPRECATED'` (T8). Ningún otro destino |
| `published_at` | **No** | Hecho histórico, congelado |
| `created_at` | **No** | — |
| `updated_at` | **Sí** | Único cambio acompañante permitido (lo escribe Prisma `@updatedAt` automáticamente en la misma sentencia de T8; bloquearlo bloquearía T8) |

**`learning_resource_version` con `editorial_status = 'PUBLISHED'`** — idéntico, con el mapa de columnas propio:

| Columna | ¿Puede cambiar? | Valor permitido |
|---|---|---|
| `id`, `learning_resource_id`, `curriculum_topic_id`, `title`, `content_blocks`, `published_at`, `created_at` | **No** | — |
| `editorial_status` | **Sí, y solo así** | `'PUBLISHED' → 'DEPRECATED'` (T8) |
| `updated_at` | **Sí** | Solo como acompañante de T8 |

**`answer_option` cuya `question_version` padre está en `PUBLISHED`**:

| Operación | ¿Permitida? |
|---|---|
| `UPDATE` de `content`, `is_correct`, `display_order`, `question_version_id`, `id`, `created_at` | **No, ninguna** (invariante 2) |
| `INSERT` de una alternativa nueva en una versión publicada | **No** (invariante 2) |
| `DELETE` de una alternativa de una versión publicada | **No** (invariante 2) |

**`DELETE` de una `question_version` o `learning_resource_version` en `PUBLISHED`**: **prohibido** (invariante 3). Nota: `AnswerOption` tiene `onDelete: Cascade` desde `QuestionVersion` (`schema.prisma:218`); bloquear el `DELETE` de la versión publicada en el nivel superior es lo que evita que la cascada se convierta en una vía de mutación.

**Prohibiciones estructurales adicionales, explícitas** (para que la lista sea cerrada y no un principio general):

- No existe transición **directa** `DRAFT → PUBLISHED`, ni `DRAFT → APPROVED`, ni `IN_REVIEW → PUBLISHED`. Publicar exige haber pasado por `IN_REVIEW` y `APPROVED`, con la separación de actor de §8.3.
- No existe transición `DEPRECATED → PUBLISHED` (republicar es publicar una versión **nueva**, `CMS-025`, invariante 5).
- **`DEPRECATED` es terminal en V1**: no existe transición `DEPRECATED → DRAFT`, ni `DEPRECATED → PUBLISHED`, ni `DEPRECATED → ARCHIVED`, ni ninguna otra salida de `DEPRECATED` (**DG-8 resuelto**).
- **No existe ninguna transición hacia `ARCHIVED` desde ningún estado** (**DG-8 resuelto**, invariante 21). El valor sigue en el enum; ninguna ruta lo produce.
- No existe ningún `UPDATE` que cambie `editorial_status` de una fila publicada a `DRAFT`, `IN_REVIEW`, `APPROVED` ni `ARCHIVED`.
- **No existe ningún `UPDATE` ni `INSERT` que deje dos filas `PUBLISHED` con el mismo `question_id`, ni dos con el mismo `learning_resource_id`** (**DG-11 resuelto**, invariante 16, §8.6). Rechazado por el índice único parcial, no por el trigger.
- **No existe excepción genérica, flag, variable de entorno, rol privilegiado ni "modo mantenimiento"** que permita saltarse esta lista. Decisión C es explícita: *"SIN abrir una excepción genérica a la inmutabilidad"*.
- El seed (`prisma/seed.ts`) queda sujeto a esta lista igual que cualquier otro cliente de la base — hoy ya la cumple porque solo inserta y se autoexcluye cuando hay versión publicada (`seed.ts:51-54,106-109`).

**Nota sobre `deprecatedAt`**: este documento **no** añade una columna de fecha de retiro a `question_version`/`learning_resource_version`. El momento del retiro queda registrado en la acción administrativa (invariante 10), que es donde vive la auditoría. Evitar la columna nueva mantiene el cambio sobre tablas de Bloque I estrictamente acotado a los triggers que decisión C autorizó **y a los índices únicos parciales que DG-11 autorizó** (§8.6) — ninguna columna nueva, ningún tipo nuevo, ningún valor de enum nuevo.

### 8.5 Excepción registrada de `CMS-018` (DG-10 resuelto) — no es el camino normal

**Encuadre, primero y sin ambigüedad: la regla normal y el comportamiento por defecto del sistema es §8.3 — el autor no aprueba ni publica su propio contenido.** Lo que sigue describe una **excepción**, autorizada por el Product Owner para el caso concreto de operación con un equipo de una sola persona, tal como las propias fuentes la contemplan (`CMS-018`: *"sin una constancia explícita de excepción durante la etapa inicial"*; `ADMIN-003`: acumulación de roles en la etapa inicial; `OQ-029`: *"deberá completar explícitamente las revisiones y quedará registrada"*). **No es un camino alternativo de igual rango: es una desviación registrada.**

**Las tres condiciones acumulativas** (faltando cualquiera, el sistema rechaza):

1. **Activación deliberada.** La excepción **no es el comportamiento por defecto**. Alguien debe activarla de forma explícita e intencional. Ninguna configuración inicial, ningún valor por defecto, ninguna inferencia del sistema puede dejarla activa sin un acto deliberado.
2. **Registro del actor.** Queda registrado **qué `AdminActor` la activó** y **qué `AdminActor` la usó** en cada operación. La atribución es por identidad de actor, nunca por rol (§8.3), y vive en el registro append-only de §9.3.
3. **Motivo/justificación registrada por cada uso.** Cada operación T5 o T7 amparada en la excepción lleva su propio motivo obligatorio. Un motivo dado una vez **no cubre** usos posteriores: la justificación es **por uso**, no por activación.

**Lo que la excepción NO es** — declarado explícitamente porque es donde el requisito se degradaría en silencio:

- **Tener simultáneamente los roles Autor y Publicador NO constituye por sí solo autorización de auto-aprobación.** La acumulación de roles es lícita (`ADMIN-003`) y no habilita nada por sí misma. La excepción debe **activarse y justificarse cada vez**, jamás derivarse implícitamente de los roles asignados (invariante 24).
- **No es un flag global de bypass ni un "modo equipo de una persona" permanente.** Una activación que dejara toda auto-aprobación futura permitida sin motivo por uso incumpliría la condición 3.
- **No es una excepción a la inmutabilidad.** No toca §8.4, ni los invariantes 1-5, ni el 16. Su alcance es exclusivamente el invariante 9.
- **No es invisible.** El uso de la excepción es un **tipo de evento distinguible y consultable** en el registro de acción administrativa, de modo que "cuántas publicaciones se hicieron bajo excepción" sea una pregunta respondible sin leer código.

**Nota de honestidad sobre lo que la excepción garantiza y lo que no**: en un equipo de una sola persona, quien activa la excepción y quien se beneficia de ella son necesariamente la misma persona — eso es inherente al escenario que el Product Owner autorizó, no un defecto del diseño. Lo que la excepción garantiza en ese caso **no es la separación de responsabilidades** (que es imposible con un solo actor), **sino su trazabilidad**: que cada auto-aprobación sea deliberada, atribuida y justificada, en vez de indistinguible de una aprobación normal. Esto es exactamente lo que `OQ-029` pide (*"quedará registrada"*) y es la única garantía honesta que el escenario admite.

**Verificación por gate** (§13.3): el gate debe demostrar (i) que **sin** activación deliberada la auto-aprobación es **rechazada**; (ii) que un actor con **ambos roles** y **sin** excepción activada es igualmente rechazado; (iii) que un uso **sin motivo** es rechazado; (iv) que un uso válido queda en el registro como evento distinguible con actor activador, actor usuario y motivo.

### 8.6 Unicidad de versión publicada (DG-11 resuelto) — qué se crea y en qué orden se escribe

**Qué autoriza DG-11**, con los nombres reales verificados en `apps/backend/prisma/schema.prisma`:

| Tabla | Columna padre | Índice único parcial |
|---|---|---|
| `question_version` (`schema.prisma:172-201`) | `question_id` → `question.id` (relación `Question.versions`) | Como máximo **una** fila con `editorial_status = 'PUBLISHED'` por `question_id` |
| `learning_resource_version` (`schema.prisma:119-138`) | `learning_resource_id` → `learning_resource.id` (relación `LearningResource.versions`) | Como máximo **una** fila con `editorial_status = 'PUBLISHED'` por `learning_resource_id` |

La estructura parental es efectivamente paralela entre ambas familias —identidad estable + versiones, `onDelete: Restrict` en ambos casos— de modo que el índice equivalente para recursos de aprendizaje **sí existe y sí se crea**. `answer_option` **no** recibe índice de unicidad: no es una versión, cuelga de `question_version` y su protección es la inmutabilidad (invariantes 2-3).

**PostgreSQL es la autoridad final**, no la validación de servicio. El criterio es el mismo que ADR-0012:50 estableció para los triggers (*"protege incluso ante un script de backfill con un error, una migración manual futura, o un acceso directo a la base"*) y que decisión C aplicó a la inmutabilidad.

**Consecuencia técnica sobre el orden de escritura de T7 — especificada aquí porque una migración real la necesita resuelta con precisión**: un índice único parcial de PostgreSQL se verifica **por sentencia, de forma inmediata**; a diferencia de una restricción `UNIQUE` declarada `DEFERRABLE`, un índice parcial **no admite diferimiento al `COMMIT`**. Por lo tanto, la transacción de T7 con corrección **debe** escribir en este orden exacto:

1. `UPDATE` de la versión anterior: `PUBLISHED → DEPRECATED` (permitido por §8.4).
2. `UPDATE` de la versión nueva: `APPROVED → PUBLISHED`.

Invertir el orden haría fallar la transacción completa contra el índice único parcial. Esto **no es una decisión de producto** —el *qué* ya estaba decidido: la despublicación de la anterior es **automática y en la misma transacción de T7**, según el invariante 16 y la precondición de T7 en §8.2, no una acción separada del Publicador— sino la única forma de ejecutar esa decisión ya tomada contra la garantía que DG-11 añade. Ninguna ventana observable existe entre ambas sentencias: bajo `READ COMMITTED` un lector concurrente ve el estado anterior o el posterior a la transacción, nunca el intermedio.

**Auditoría de la despublicación automática dentro de T7** — derivación declarada explícitamente para que el Product Owner pueda objetarla, siguiendo el mismo criterio que el invariante 3: la despublicación de la versión anterior dentro de T7 es un **efecto de T7**, no una invocación independiente de T8. Produce su propio registro de acción administrativa con la transición `PUBLISHED → DEPRECATED` y con la **referencia a la versión que la sustituye** como motivo determinado por el sistema; **no** exige un motivo de texto libre adicional del Publicador, porque el "por qué" está completamente determinado y registrado (supersesión). El T8 **autónomo** (retiro deliberado, §8.2) conserva íntegro su **motivo obligatorio de texto libre**. Si el Product Owner prefiriera exigir también un motivo libre en la despublicación por supersesión, es un ajuste de una línea en §9.3 y no altera ningún invariante.

**Efecto sobre los datos actuales: ninguno.** El seed se autoexcluye cuando ya existe una versión publicada de la misma identidad (`seed.ts:51-54`, `:106-109`) y no existe ninguna otra ruta de escritura sobre esas tablas, de modo que la base actual **ya satisface** ambos índices. Es una decisión Nivel 2 additiva **sin cambio de comportamiento observable**, exactamente igual que la migración de decisión C, y **no reabre Bloque I funcionalmente**: refuerza un invariante contractual ya declarado antes de hacer posible su edición administrativa por primera vez (§4.1, nota del Product Owner).

**Divergencia preexistente entre los dos lectores, que este invariante vuelve irrelevante** (audit §6.3): `learning-resource-version.repository.ts:30` (`findLatestPublishedByTopicId`, `orderBy publishedAt desc`) tolera múltiples publicadas y devuelve la más reciente, mientras que `question-version.repository.ts:40` (`findPublishedByTopicId`) las devolvería **todas**. Con el índice único parcial, el estado inválido que los hacía divergir **deja de ser representable**. **Ninguno de los dos lectores se modifica** — invariante 19 intacto, y la opción de "arreglar el lector" queda descartada tal como §11.1 exige.

---

## 9. Modelo mínimo de AdminActor, roles y auditoría

Definición **contractual** de qué debe existir. **No es la migración ni es código** — la migración se diseña al abordar el Incremento 2. Con **DG-7 y DG-9 resueltos**, esta sección ya incorpora el modelo conceptual mínimo de token, revocación y ciclo de vida; lo que sigue sin fijarse aquí son nombres exactos de tablas y columnas, que se deciden al implementar.

### 9.1 Entidad de actor administrativo

- **Separada de `Account`**, en su propia tabla, sin FK hacia `Account` (decisión B: *"NO añadir roles administrativos a `Account`"*). Un `AdminActor` y un `Account` **nunca** son la misma fila ni comparten sesión.
- **Identidad individual**: un actor = una persona real del equipo. Prohibidas las identidades compartidas (`ADMIN-002`: *"No se utilizarán cuentas administrativas compartidas"*).
- **Atributos conceptuales mínimos**: identificador estable; un identificador humano legible del actor (para atribución en la auditoría); estado activo/desactivado; momento de creación; momento del último acceso. **Cómo se autentica está determinado por DG-7 y se define en §9.5.**
- **Desactivación/revocación, nunca hard-delete** (**DG-9 resuelto**, invariante 23): un `AdminActor` se **desactiva** y sus tokens se **revocan**; **su registro jamás se elimina**, porque su identificador es referenciado por el registro de acciones administrativas, que es append-only (invariante 10). Desactivar **impide operar**; **no borra** ni la fila del actor ni ninguna acción pasada. La FK del registro hacia el actor es `Restrict`, mismo criterio que `StudentResponse.questionVersionId` (`schema.prisma:270`), de modo que la base rechaza cualquier intento de borrado que rompiera la atribución. **Siempre debe poder responderse "qué actor ejecutó qué transición", incluso años después de que esa persona deje el equipo.**
- **Retención**: el periodo exacto durante el cual se conserva un `AdminActor` desactivado y sus credenciales revocadas **queda explícitamente diferido** (**DG-9 resuelto**, §11.4). No se fija un número aquí, y no se reutiliza ninguno de otro dominio.
- **Nomenclatura de tabla**: prefijo consistente con el dominio ADMINISTRATION del Master Context §6.17 (p. ej. `admin_actor`, `admin_actor_role`, `admin_actor_token`, `admin_action`). Los nombres exactos se fijan al implementar, no aquí.

### 9.2 Roles V1

Exactamente dos, tal como los define decisión B:

| Rol | Puede | No puede |
|---|---|---|
| **Autor** | T1, T2, T3, T4; leer la Content Coverage Matrix | T5, T6, T7, T8 |
| **Publicador** | T4, T5, T6, T7, T8; leer la Content Coverage Matrix | T1, T2, T3 (crear/editar contenido — menor privilegio, `ADMIN-004`) |

- **Un actor puede tener ambos roles** (`ADMIN-003` lo autoriza expresamente). Tener ambos **no** exime del invariante 9: la comprobación es por identidad de actor, no por rol (§8.3). **Y tener ambos tampoco constituye autorización silenciosa de auto-aprobación** (**DG-10 resuelto**, invariante 24): la excepción de §8.5 debe activarse deliberadamente y justificarse por uso, nunca derivarse de los roles asignados.
- **El rol lo resuelve el backend a partir del token, siempre** (**DG-7 resuelto**, invariante 22, §9.5). Ningún cliente —CLI incluido— envía, propone ni decide un rol. El mapa rol→transiciones vive en el servidor y es la única fuente de autorización.
- **No se modela un sistema de permisos granular.** Dos roles, con un mapa fijo rol→transiciones autorizadas. Cualquier RBAC más allá de esto es complejidad anticipatoria del tipo que ADR-0012 ya descartó para `questionType` y que MC §8.14 desaconseja.
- **Verificación de que las cuatro transiciones de publicación funcionan con solo dos roles**: T5 (`IN_REVIEW → APPROVED`) la ejecuta el Publicador, no un Revisor académico. Esto es una consecuencia directa y aceptada de decisión B: en V1 la "revisión" es la constancia de que **otro actor distinto del autor** validó y aprobó, no una revisión académica tipificada en cinco dimensiones (`DM-D113`, diferido por DM §9.21). **No se requiere ampliar los roles** para que la máquina de estados de §8 funcione de forma coherente.

### 9.3 Auditoría atribuible — qué constituye exactamente

Derivada de `ADMIN-002` (*"registro de accesos relevantes"*), `ADMIN-004`/`PRD-D059` (menor privilegio), `CMS-022`, `CONTENT-013`, `MOD-004` y criterio 265 (*"cambios auditables y reversibles"*), tal como los cita la auditoría — **no de un esquema de auditoría genérico inventado aquí**.

**Qué se registra** — un registro por cada operación editorial que cambia algo, con estos campos y sin campos adicionales por defecto:

1. **Actor**: identificador del `AdminActor` que ejecutó la operación (nunca un nombre de rol suelto, nunca "sistema").
2. **Rol ejercido**: cuál de los dos roles habilitó la operación (relevante cuando un actor tiene ambos).
3. **Momento**: timestamp de la operación.
4. **Tipo de acción**: la transición ejecutada (T1..T8) o la operación de creación/edición.
5. **Objeto afectado**: tipo de entidad e identificador de la fila (`question_version` / `learning_resource_version` / `answer_option`).
6. **Estado previo → estado nuevo**: obligatorio para T3-T8.
7. **Motivo**: texto libre. **Obligatorio** en T4, T6 y T8 autónomo (devoluciones y retiro deliberado) — son las operaciones donde `CMS-022`/criterio 265 exigen poder responder "por qué"; **obligatorio también en todo uso de la excepción de `CMS-018`** (§8.5, condición 3); opcional en el resto. La despublicación automática por supersesión dentro de T7 lleva motivo determinado por el sistema con referencia a la versión que sustituye (§8.6).
8. **Clave de idempotencia** de la operación (invariante 11).
9. **Marca de excepción de `CMS-018`**, cuando aplique (**DG-10 resuelto**, §8.5): tipo de evento **distinguible y consultable**, con el actor que activó la excepción además del actor que la usó. Ausente por defecto — su presencia es siempre el resultado de un acto deliberado, nunca de una inferencia.

**Cuándo se registra**: dentro de la misma transacción que aplica el efecto. Si la transacción falla, no hay registro; si hay registro, el efecto ocurrió. Nunca "best effort" ni asíncrono.

**Con qué nivel de detalle**: el registro guarda **la referencia** al objeto y la transición, **nunca una copia del contenido académico**. Mismo criterio ya establecido en Bloque VI para `AiConversation.contextQuestionVersionId` (`schema.prisma:2251-2258`: *"construir en lectura, no snapshot"*): el contenido previo siempre es recuperable porque la versión anterior sigue existiendo íntegra (invariante 5). Duplicar el contenido en la auditoría sería redundante y crearía una segunda copia mutable de algo que el bloque acaba de declarar inmutable.

**Inmutabilidad del registro**: append-only, con trigger propio siguiendo el patrón `enforce_ai_message_immutable` (`schema.prisma:2280-2284`) y `enforce_student_response_immutable` (`migration.sql:63,71`).

**Registro de acceso vs. registro de acción**: `ADMIN-002` pide *"registro de accesos relevantes"*, que es distinto de la acción editorial. En V1 el registro de acción cubre toda operación que cambia estado; con **DG-7 resuelto**, el registro de acceso es el de **presentación y resolución de token** (§9.5): qué actor se autenticó, cuándo, y si el token fue aceptado, rechazado por revocación o rechazado por expiración. Ambos registros son append-only.

**Ocho campos, ahora nueve**: los criterios de cierre y gates que hablaban de "los ocho campos de §9.3" deben leerse como **los nueve campos** de esta lista, siendo el noveno condicional (presente solo cuando se usó la excepción de §8.5).

### 9.4 Los cuatro roles restantes de `ADMIN-003` — preservación explícita

**Revisor académico, Editor, Soporte y Administrador NO se eliminan del contrato ni se redefinen.** Siguen siendo parte de `ADMIN-003` exactamente como el PRD los describe. Quedan **fuera del alcance de implementación de V1** hasta que sus responsabilidades se implementen:

- **Revisor académico** — su responsabilidad (validar exactitud educativa con checklist tipificado) llega con `editorial_review`/`editorial_finding` y `DM-D113`, hoy diferidos por DM §9.21. La Open Question `datamodel.txt:6875` (*"¿Qué roles pueden aprobar exactitud académica y accesibilidad?"*) **permanece abierta**.
- **Editor** — su responsabilidad (claridad, formato, consistencia) llega con la segunda etapa de revisión de `CMS-017`, colapsada en V1 dentro de `IN_REVIEW`.
- **Soporte** — `SUPPORT-001..004`, fuera del alcance del bloque (Kickoff §5.2 acota a contenido educativo).
- **Administrador** — gestión de actores/permisos/configuración, `ADMIN-005..009`, fuera de alcance.

En V1, las responsabilidades de Revisor académico y Editor las absorbe el rol **Publicador** en la transición T5, y esto queda registrado como tal (§9.2), no como una redefinición de `ADMIN-003`.

### 9.5 Modelo mínimo de token del `AdminActor` (DG-7 resuelto)

**Encuadre**: DG-7 autorizó el mecanismo **mínimo** — token personal por actor. Esta sección define **conceptualmente** lo que ese mecanismo exige, **nada más**. **No se construye un sistema de autenticación completo**: no hay contraseñas, no hay recuperación de credenciales, no hay MFA (§9.6), no hay federación, no hay integración con Firebase (§3, §6 punto 12), no se toca `Account` ni `AuthGuard`, no se reutiliza `InternalOpsGuard`.

**Propiedades exigidas por la resolución** (cada campo del modelo se deriva de una de ellas, y no se añade ninguno más):

| Propiedad exigida por DG-7 | Campo conceptual que la materializa |
|---|---|
| El token es **identificable hacia un único `AdminActor`** | **Identificador del actor** al que pertenece el token (referencia al `AdminActor`) |
| **Nunca compartido**, personal por actor | Consecuencia del anterior: un token pertenece a exactamente un actor. Dos personas usando el mismo token es una violación del invariante 22, no una configuración soportada |
| **Almacenado de manera segura/hasheada, nunca en texto plano** | **Hash del token**. El valor en claro existe únicamente en el momento de la emisión y **no se persiste jamás** |
| **Expirable** | **Fecha de expiración** del token |
| **Revocable** | **Estado del token: activo / revocado** (con el momento de la revocación, para que el registro de acceso sea interpretable) |
| Trazabilidad de emisión | **Fecha de emisión** |

**Eso es todo el modelo.** Cualquier campo adicional (ámbitos, rotación automática, límite de intentos, listas de IP) sería sobreconstrucción no autorizada por DG-7 y contraria al encuadre *"pequeña y controlada"* de MC §8.14.

**El backend es la autoridad de identidad y de rol — regla dura** (invariante 22):

- El cliente **solo presenta el token**. No envía un actor, no envía un rol, no envía un ámbito, no envía un "actúo como".
- El backend **resuelve, a partir del token**: (i) qué `AdminActor` es; (ii) si el actor está activo; (iii) si el token está activo y no expirado; (iv) qué roles tiene ese actor; (v) si esos roles autorizan la operación solicitada.
- **El CLI nunca decide un rol.** Es un cliente de la API como cualquier otro (§12.6). Un CLI que enviara un rol, o que aplicara una comprobación de rol propia, sería una segunda ruta de autorización — exactamente lo que el invariante 15 y el 22 prohíben.
- **Rechazo por defecto**: sin token → rechazo; token desconocido → rechazo; token revocado → rechazo; token expirado → rechazo; actor desactivado → rechazo; actor activo sin el rol requerido → rechazo. Nunca acceso anónimo, nunca acceso "degradado".

**Emisión y entrega del token**: ocurren fuera de banda (un operador crea el actor y emite su token; el valor en claro se entrega a la persona por un canal que este bloque no modela). Es una limitación conocida y aceptada del mecanismo mínimo, coherente con un conjunto de actores internos muy pequeño (Kickoff §5.2), y **no se disfraza de flujo de autoservicio**.

**Ruta futura, declarada y no ejecutada**: si el Decision Gate abierto de ADR-0004 sobre Firebase real llegara a resolverse, migrar la identidad administrativa a la abstracción `IdentityProvider` sería una decisión posterior y separada. **DG-7 la excluye expresamente de este bloque**; se menciona aquí solo para dejar constancia de que el token personal no cierra esa puerta.

### 9.6 `ADMIN-002` — qué queda satisfecho y qué queda diferido, con honestidad

Esta sección existe porque el mecanismo mínimo aprobado **no puede satisfacer honestamente todo `ADMIN-002`**, y el documento **no inventa ni simula** lo que falta.

**SATISFECHO por el token personal de §9.5**:

- **Cuenta administrativa individual**, una por persona real (`ADMIN-002`: *"No se utilizarán cuentas administrativas compartidas"*). El token es personal por actor y **nunca compartido**.
- **Autenticación segura** en el sentido de secreto no adivinable, almacenado **hasheado** y nunca en texto plano.
- **Revocable**: un token puede invalidarse en cualquier momento, y desactivar al actor revoca su acceso (§9.1).
- **Expirable**: el token tiene fecha de expiración. Esta es la lectura que el mecanismo satisface de *"sesiones con expiración"*: **expira el token, no una sesión interactiva**. Se declara así, sin presentarlo como equivalente exacto.
- **Auditada**: cada acceso y cada acción quedan registrados de forma atribuible a un actor concreto (§9.3), en registros append-only.

**DIFERIDO EXPLÍCITAMENTE — `ADMIN-002`, verificación adicional para operaciones críticas**:

`ADMIN-002` exige *"verificación adicional para operaciones críticas"*, que en la lectura habitual del requisito significa **MFA o un segundo factor**. **El mecanismo mínimo de token personal aprobado por DG-7 no puede satisfacer ese requisito.** Un solo secreto presentado por cabecera es un único factor: pedirlo dos veces, pedir un segundo token del mismo tipo, o exigir una confirmación interactiva **no** constituyen un segundo factor y **serían una simulación**. Diseñar un sistema real de MFA/segundo factor **no está autorizado por la resolución de DG-7**.

Por lo tanto, este documento registra `ADMIN-002` como **parcialmente satisfecho**, con la parte no cubierta nombrada con precisión y **sin mecanismo sustituto inventado**:

> **Requisito parcialmente diferido — `ADMIN-002` / verificación adicional para operaciones críticas.**
> *Satisfecho*: cuenta individual, no compartida, revocable, expirable, auditada.
> *Diferido*: verificación adicional / segundo factor para operaciones críticas específicas.
> *Autorización del diferimiento*: la resolución de DG-7, que autorizó el token personal y **no** autorizó diseñar un sistema de MFA.
> *Acotamiento parcial que ofrecen las fuentes, sin cerrarlo*: `OQ-030` (`prd.txt:11760`) restringe la doble verificación obligatoria a casos de alto riesgo y declara que *"para contenido normal bastará el flujo académico y editorial registrado"*. Esto **reduce** la superficie del hueco —la publicación de contenido normal no lo requiere— pero **no lo elimina**, porque `OQ-030` nombra explícitamente *"cambios de respuestas correctas"* como caso de alto riesgo, y corregir una alternativa correcta publicando una versión nueva es precisamente una operación que este bloque hace posible.

**Señalamiento operativo, requerido explícitamente por la resolución de DG-7**: este diferimiento **debe reportarse al Product Owner ANTES de que `ADMIN-002` se dé por bloqueante-resuelto para el Incremento 2 en adelante**. Concretamente: el Incremento 2 puede diseñarse e implementarse con el token personal, pero **no puede declararse que `ADMIN-002` está satisfecho**, y el reporte de cierre del bloque debe listar este diferimiento parcial en la tabla de deudas con propietario (§5.3, §13.8 punto 18). Un cierre que presentara `ADMIN-002` como satisfecho sin esta salvedad sería incorrecto.

---

## 10. Secuenciación obligatoria — `DM-D102` **y** unicidad de publicación antes de cualquier endpoint de escritura

**Esto es un invariante de secuenciación del bloque, no una preferencia ni una nota de orden recomendado.**

**Regla**: ningún endpoint editorial de creación, edición o transición de estado, ni ningún comando de CLI equivalente, ni ninguna entidad de actor administrativo con capacidad de escritura sobre contenido, puede implementarse ni fusionarse **antes** de que **ambas** garantías de base de datos estén **aplicadas y verificadas por su gate en PASS**:

1. **La inmutabilidad de la versión publicada** — triggers de decisión C (`DM-D102`).
2. **La unicidad de versión publicada por identidad** — índices únicos parciales de **DG-11** (§8.6).

**Ambas son la MISMA condición previa absoluta**, en la misma migración y el mismo Incremento 1 (§12.1), tal como la resolución de DG-11 lo ordena: *"junto con la migración de inmutabilidad de DM-D102, como parte del mismo Incremento 1, antes de cualquier endpoint editorial de escritura"*. No se admite implementar una y diferir la otra.

**Por qué la unicidad comparte exactamente el mismo razonamiento que la inmutabilidad**: hoy la propiedad "como máximo una versión publicada por identidad" se cumple **por accidente estructural** —el seed se autoexcluye (`seed.ts:51-54,106-109`) y no hay otra ruta de escritura—, igual que `DM-D102` se cumple hoy por ausencia de superficie. En ambos casos, **el instante en que Bloque VII abre la primera ruta de escritura convierte una omisión latente en una vulnerabilidad activa**: en el caso de la unicidad, dos versiones publicadas de la misma pregunta harían que `findPublishedByTopicId` (`question-version.repository.ts:40`) sirviera la pregunta **duplicada** al estudiante, sin que nada lo detecte (audit §6.3).

**Por qué es obligatorio y no una preferencia** (audit §5.1, hallazgo G1): hoy `DM-D102` es una **omisión latente** — está declarado en prosa (`schema.prisma:116`, `:168`) y ningún mecanismo lo aplica, pero tampoco existe ninguna ruta de escritura que pueda violarlo. El sistema es seguro por ausencia de superficie, no por diseño. **El instante en que Bloque VII abre la primera ruta de escritura, la omisión latente se convierte en una vulnerabilidad activa** de un invariante del que ya dependen Bloques III, IV y VI (audit §5.3). Invertir el orden significaría, durante la implementación y prueba de la ruta de escritura, tener un camino real capaz de mutar contenido publicado sin ninguna barrera — exactamente el riesgo que decisión C existe para cerrar.

**Cómo se hace verificable** (no basta con declararlo):

1. El gate del Incremento 1 (§13.1) debe estar en PASS **antes** de que exista el primer commit del Incremento 2.
2. El gate consolidado del bloque (`verify:lef-block-vii-gate`, §13.7) encadena el gate de inmutabilidad **como primer eslabón**, de modo que cualquier incremento posterior que se ejecute con la migración ausente o revertida falla el gate consolidado, no solo el suyo.
3. El gate de inmutabilidad incluye **control positivo anti-falso-negativo** (§13.1): si el gate pasara porque la migración no está aplicada y los `UPDATE` de prueba nunca se ejecutan, el control positivo lo detecta. Mismo criterio que `verify-ai-answerkey-isolation-gate.ts:34-39`.

**Excepción**: ninguna. Con DG-7 a DG-11 resueltos, **no queda ningún Decision Gate abierto** que pudiera invocarse como motivo para adelantar el Incremento 2, y el Incremento 1 tiene su alcance completamente determinado (§12.1). No existe ningún escenario en que estuviera justificado invertir el orden.

---

## 11. Frontera con EDUCATION, PROGRESS, Tutor IA y Privacy

### 11.1 EDUCATION — coexistencia con la lectura ya existente

**Los cuatro lectores de contenido académico** (audit §6.1), que **no cambian ni una línea**:

| # | Lector | Archivo:línea | Predicado |
|---|---|---|---|
| 1 | `EducationService` (catálogo) | `education.service.ts:74,81` → `learning-resource-version.repository.ts:30`, `question-version.repository.ts:40,82` | `editorialStatus = 'PUBLISHED'` |
| 2 | `ProgressService` (registrar respuesta) | `progress.service.ts:148-158` | `PUBLISHED` **y** `question.status = 'ACTIVE'` **y** `curriculumTopicId = topicId` |
| 3 | `QuickQuestionService` (Bloque IV) | `question-version.repository.ts:105-111`; revalidación `quick-question.service.ts:173-176` | Ídem, revalidado en transacción bloqueada por sesión |
| 4 | `AiAcademicContextBuilder` (Bloque VI) | `ai-academic-context-builder.service.ts:101` (admisión), `:130-159` (generación) | Ídem en admisión; degradación a `null` en generación |

**Frontera, en una frase**: **Bloque VII escribe; los cuatro lectores no cambian.** El predicado de elegibilidad se mantiene byte-idéntico y sigue viviendo en la capa de servicio/repositorio, nunca en el cliente. Cambiar el estado de una fila basta para que los cuatro reaccionen de forma coherente y sin coordinación — esa propiedad ya existe (audit §6.2.1) y Bloque VII se apoya en ella en vez de reemplazarla.

**Autoridad de publicación** (invariante 15, MC §6.24): la capa administrativa **solicita**; el dominio EDUCATION valida sus propios invariantes y ejecuta la transición. Ningún módulo administrativo escribe en repositorios de EDUCATION saltándose su servicio. Esto satisface también MC §6.17 (*"no escribir directamente en tablas autoritativas"*).

**Efecto cuantitativo declarado explícitamente** (audit §6.2.4): `countPublishedByTopicId` (`question-version.repository.ts:82`) acopla la completitud de progreso al **número** de versiones publicadas de un tema. **Publicar una pregunta nueva en un tema donde ya hay estudiantes con progreso `COMPLETED` cambia el denominador.** El trigger monotónico `enforce_curriculum_topic_progress_monotonic` (`migration.sql:77,87`) impide que el progreso retroceda de `COMPLETED` a `IN_PROGRESS`, así que **el progreso nunca se degrada**, pero el porcentaje mostrado puede volverse inconsistente hasta que el estudiante responda las preguntas nuevas. **Es un efecto de publicar, no de editar**, ya presente en el diseño de ADR-0014, y Bloque VII lo hereda sin agravarlo. Se declara aquí explícitamente, como la auditoría pidió, para que no se descubra como sorpresa; **no requiere cambio alguno en PROGRESS** y **no se corrige en este bloque**.

### 11.2 PROGRESS — nuevas versiones frente a `StudentResponse`

**Confirmación: ya está protegido por diseño; PROGRESS no requiere ningún cambio.**

1. `StudentResponse.questionVersionId` referencia una **`QuestionVersion` específica**, con FK `onDelete: Restrict` (`schema.prisma:270`), y `answerOptionId` igual (`:271`). Una respuesta apunta, para siempre, a la versión que existía en el momento de responder.
2. `StudentResponse` es **inmutable por trigger** (`enforce_student_response_immutable`, `migration.sql:63,71`) — ningún `UPDATE` posible. `isCorrect` quedó congelado al responder (`schema.prisma:266`).
3. **Una corrección editorial crea una versión NUEVA** (invariante 5, decisión C). La versión antigua permanece íntegra, referenciable y con su `answer_option.is_correct` original. El historial del estudiante y la pauta que se le aplicó siguen siendo coherentes entre sí.
4. **Un retiro (T8) cambia el estado, nunca borra.** Los cuatro lectores dejan de servirla; los `StudentResponse` históricos sobreviven intactos (`CMS-016`, `CONTENT-008`, criterio 272).

**Lo que cambia respecto de hoy, y a mejor**: la auditoría documentó (§5.4) que hoy un `UPDATE` de `answer_option.is_correct` sobre contenido ya respondido **se aplica sin objeción**, dejando el historial del estudiante divergente de la pauta vigente sin ninguna señal. Los invariantes 1-3 cierran ese escenario en PostgreSQL. **PROGRESS no necesita ningún cambio: es beneficiario, no participante.**

### 11.3 Tutor IA (Bloque VI, cerrado) — por qué la decisión C también lo protege

**Reconfirmación explícita, y razón por la que decisión C es la protección de Bloque VI, sin que Bloque VI cambie nada.**

`AiAcademicContextBuilder` construye el contexto académico **en vivo, sin snapshot**: re-lee `QuestionVersion` desde la base en cada llamada al proveedor (`ai-academic-context-builder.service.ts:114-118` docstring, `:129-159`), y `schema.prisma:2255-2258` lo confirma como decisión deliberada (*"Guardan solo la REFERENCIA, nunca una copia/snapshot del contenido académico… 'construir en lectura', no snapshot"*).

**El riesgo que la auditoría señaló** (§5.3b): si el contenido de una `QuestionVersion` publicada se editara, una conversación en curso pasaría a razonar sobre un enunciado, alternativas o explicación **distintos de los que el estudiante vio y de los que motivaron sus mensajes anteriores** — que sí son inmutables (`enforce_ai_message_immutable`, `schema.prisma:2280`). El historial quedaría internamente incoherente. La auditoría añadió el punto fino de que **`verify-ai-answerkey-isolation-gate.ts` no lo detectaría**, porque sus fuentes de verdad son la base de datos en vivo (`:29-32`): re-leería el texto nuevo y seguiría en verde. **El gate protege el aislamiento, no la inmutabilidad.**

**Con decisión C aplicada, ese riesgo queda cerrado por construcción**: una versión `PUBLISHED` no puede mutar, ni por API, ni por servicio, ni por SQL directo. Una conversación anclada a `contextQuestionVersionId` (FK `Restrict`, `schema.prisma:2268`, fijado solo al crear y nunca actualizado) seguirá refiriéndose a una versión cuyo contenido es idéntico al que el estudiante vio. La degradación a `null` prevista en `:131` para el caso de desaparición sigue siendo el único camino de pérdida, y sigue siendo imposible por la FK `Restrict` más el invariante 3.

**Conclusión, explícita**: **decisión C es también la protección de Bloque VI**, y por eso Bloque VI **no necesita ningún cambio**. Ni `AiAcademicContextBuilder`, ni el esquema `ai_*`, ni los prompts, ni `verify-ai-answerkey-isolation-gate.ts` se tocan. Bloque VI permanece cerrado, byte-idéntico, y sale reforzado. Lo único que Bloque VII debe garantizar en su gate es que la regresión completa de Bloque VI sigue en PASS **con el control positivo del gate de aislamiento intacto** (§13.7).

**Efecto de un retiro (T8) sobre el Tutor**, ya cubierto por comportamiento existente: crear una conversación nueva sobre una pregunta retirada falla limpiamente (`ai-academic-context-builder.service.ts:101`); una conversación ya creada degrada correctamente (`:131`). Ambos comportamientos **ya son correctos** y el gate del Incremento 3 debe confirmarlos, no modificarlos.

### 11.4 Privacy (ADR-0005) — el `AdminActor` como clase de sujeto

**Determinación**: un `AdminActor` **no es un `Account`** y **no es un estudiante**. El pipeline de eliminación de cuenta existente (ADR-0005, `PrivacyService`/`AuthService.requestAccountDeletion`) opera exclusivamente sobre `Account` y su grafo de datos de estudiante. **Ese pipeline no le aplica al `AdminActor`, y Bloque VII no lo modifica en absoluto.** ADR-0005 permanece intacto (§6, punto 13).

**Resolución de DG-9, incorporada** (2026-08-15, Product Owner): un `AdminActor` **es una persona real**, y su identificador queda referenciado de forma permanente en un registro append-only (invariante 10). Es, por tanto, **una clase de sujeto distinta de `Account`**, y así queda declarado. Sobre esa clase de sujeto, V1 fija lo siguiente:

1. **Desactivación/revocación, nunca hard-delete** (invariante 23). V1 implementa la **desactivación del actor y la revocación de su acceso**; **no elimina el registro**. Cuando una persona deja el equipo, sus tokens se revocan (§9.5) y el actor pasa a desactivado; ni su fila ni ninguna de sus acciones pasadas se borran.
2. **La atribución histórica de auditoría se preserva íntegra.** **NUNCA** se ejecuta un hard-delete que rompa el rastro de auditoría de **qué actor hizo qué transición**. Esta es una propiedad estructural, no una política operativa: la FK `Restrict` del registro hacia el actor hace que la propia base rechace el borrado (§9.1, §13.2 punto 7).
3. **El periodo EXACTO de retención administrativa queda EXPLÍCITAMENTE DIFERIDO.** Cuánto tiempo se conserva un `AdminActor` desactivado, sus credenciales revocadas y su registro de acciones **no se fija aquí**, por **falta de una fuente contractual que permita fijar un número**. No es un olvido: es un vacío de fuente, declarado como tal.

**Prohibiciones explícitas sobre cómo NO se rellena ese vacío** (parte literal de la resolución de DG-9):

- **NO se reutilizan automáticamente los 90 días de retención del Tutor IA (Bloque VI).** Es una política fijada para otra clase de sujeto y otro tipo de dato (§6, punto 18).
- **NO se asume que ADR-0005 (el pipeline de privacidad de estudiantes) aplique aquí sin modificación.** Son clases de sujeto distintas: ADR-0005 modela al estudiante (`Account`) y su grafo de datos personales; el `AdminActor` no es ninguna de las dos cosas. ADR-0005 permanece intacto y sin extensión (§6, punto 13).
- **No se inventa un número por analogía con ningún otro dominio del proyecto.**

**Cómo se registra el diferimiento**: como **deuda explícita con propietario** en la tabla de diferidos de §5.2 y en el reporte de cierre del bloque (§5.3, §13.8 punto 18), siguiendo el precedente editorial de `LEF-BLOCK-VI-DEFINITION.md` §11 (donde la retención del usage ledger quedó deliberadamente sin número en vez de asumir tácitamente "para siempre"). La diferencia con aquel caso se mantiene dicha: allí el sujeto era metadata operativa; aquí es **una persona natural**, de modo que fijar el número será una decisión de **política**, no de ingeniería, y requerirá una fuente contractual que hoy no existe.

**Consecuencia práctica aceptada, dicha sin adorno**: mientras el número no se fije, la identidad de personas que ya no forman parte del equipo permanece almacenada, desactivada y sin fecha de caducidad. Es el precio de la atribuibilidad que decisión B exige, y queda registrado como deuda abierta, no como propiedad deseable.

**Lo que Bloque VII sí garantiza sin necesidad de esa decisión**: el `AdminActor` **nunca** accede a datos personales de estudiantes. El alcance editorial opera sobre `Subject`/`CurriculumTopic`/`Question`/`QuestionVersion`/`AnswerOption`/`LearningResource`/`LearningResourceVersion` y sobre la Content Coverage Matrix (agregados de contenido). Ninguna operación de este bloque lee, exporta ni enmascara datos de estudiante — motivo por el cual `ADMIN-010..013` (privacidad administrativa) permanece correctamente fuera de alcance (§5.2). **Invariante adicional para el gate**: ningún endpoint ni comando administrativo de este bloque devuelve datos de `Account`, `StudentResponse`, `AiConversation`, `AiMessage` ni de ninguna tabla de PROGRESS/GAMIFICATION/PRIVACY.

---

## 12. Incrementos, en orden de dependencia

**Con DG-7 a DG-11 resueltos, ningún incremento queda bloqueado por un Decision Gate abierto.** La columna registra qué resolución determina el alcance de cada uno.

| # | Incremento | Depende de | Estado de bloqueo | Resoluciones que determinan su alcance |
|---|---|---|---|---|
| 1 | **Inmutabilidad de la versión publicada (`DM-D102`) + unicidad de versión publicada por identidad** | — | **Desbloqueado** | Decisión C; **DG-8** (la lista cerrada termina en `DEPRECATED`, sin `ARCHIVED`); **DG-11** (índices únicos parciales, misma migración) |
| 2 | Actor administrativo, roles y autorización editorial | 1 | **Desbloqueado** | **DG-7** (token personal, backend autoridad de rol); **DG-9** (desactivación sin hard-delete, retención diferida) |
| 3 | Transiciones de estado con auditoría (retiro primero) | 1, 2 | **Desbloqueado** | **DG-8** (`DEPRECATED` terminal); **DG-10** (excepción `CMS-018` con activación deliberada y motivo por uso) |
| 4 | Autoría: crear borrador y publicar versión nueva | 1, 2, 3 | **Desbloqueado** | **DG-11** — ya no bloquea este incremento: la garantía se creó en el Incremento 1 y aquí solo se **consume** (orden de escritura de T7, §8.6) |
| 5 | Content Coverage Matrix (solo lectura) | 1, 2 | **Desbloqueado** | — |
| 6 | CLI interna | 2, 3, 4, 5 | **Desbloqueado** | **DG-7** (el CLI solo presenta el token; nunca envía ni decide un rol) |

### 12.1 Incremento 1 — Inmutabilidad **y unicidad** de la versión publicada

**Este incremento cubre dos garantías de base de datos, no una.** Ambas son **la misma condición previa absoluta** antes de cualquier endpoint editorial de escritura (§10), y se implementan **juntas, en la misma migración**, tal como la resolución de DG-11 lo ordena.

- **Objetivo**: hacer **aplicadas por PostgreSQL** dos propiedades que hoy solo se cumplen por ausencia de superficie de escritura:
  1. **`DM-D102` — inmutabilidad de la versión publicada** (decisión C), hoy declarada solo en prosa (`schema.prisma:116`, `:168`) y sin ningún mecanismo que la aplique (audit §5.1, hallazgo G1).
  2. **Unicidad de versión publicada por identidad** (**DG-11 resuelto**), hoy cumplida por accidente estructural (`seed.ts:51-54,106-109`) y sin ninguna restricción que la garantice (audit §6.3).
- **Frontera exacta**: **una migración SQL** que contiene, en conjunto:
  - **Triggers de inmutabilidad** sobre `question_version`, `learning_resource_version` y `answer_option`, implementando **exactamente** la lista cerrada de §8.4 —cuya única transición de estado permitida sobre una fila `PUBLISHED` es `PUBLISHED → DEPRECATED`, **sin `ARCHIVED`** (**DG-8 resuelto**)—, con el patrón de `enforce_student_response_immutable` (`migration.sql:55-95`: función `plpgsql` con `RAISE EXCEPTION`, trigger `BEFORE ... FOR EACH ROW`).
  - **Dos índices únicos parciales** (**DG-11 resuelto**, §8.6): uno sobre `question_version(question_id) WHERE editorial_status = 'PUBLISHED'` y otro sobre `learning_resource_version(learning_resource_id) WHERE editorial_status = 'PUBLISHED'`.
  - Cero endpoints. Cero entidades nuevas. Cero columnas nuevas. Cero cambios en `packages/contracts`. Cero cambios en `apps/mobile`. Cero cambios en los cuatro lectores. Cero cambios en el enum `EditorialStatus` (ni se añade `SCHEDULED`, ni se elimina `ARCHIVED`).
- **Dependencias**: ninguna. Decisión C autoriza los triggers; **DG-11 autoriza expresamente los índices** como decisión Nivel 2 additiva de la misma clase.
- **Invariantes que introduce**: **1, 2, 3, 4, 16 y 21**. (El 16 se adelanta aquí desde el Incremento 4 por resolución de DG-11; el 21 es la consecuencia de DG-8 sobre la lista cerrada.) **Protege además**: los invariantes ya vigentes de Bloques III/IV/VI que dependían de `DM-D102` sin que nada lo aplicara (§11.2, §11.3).
- **Gate de cierre esperado**: `verify:education-published-immutability-gate` (`apps/backend/scripts/verify-education-published-immutability-gate.ts`), siguiendo la convención `verify-*-gate.ts` de los 51 gates existentes. **Debe cubrir ambas garantías**: inmutabilidad **y** unicidad. Criterios en §13.1.
- **Qué NO hace explícitamente**: no crea ninguna ruta de escritura; no crea roles ni actores; no permite publicar nada nuevo; **no cambia el comportamiento observable del sistema** —hoy nada actualiza esas tablas y los datos actuales ya satisfacen ambos índices—; **no reabre Bloque I funcionalmente** (§4.1, nota del Product Owner). El contenido se sigue administrando por `prisma/seed.ts` al terminar este incremento.

### 12.2 Incremento 2 — Actor administrativo, roles y autorización editorial

- **Objetivo**: existencia de un actor identificable, individual y atribuible, con los dos roles V1, haciendo aplicable por primera vez la parte ya resuelta de `OQ-029`.
- **Frontera exacta**: entidades de actor y rol (§9.1-9.2), **entidad de token del actor con el modelo mínimo de §9.5** (referencia al actor, hash del token, fecha de emisión, fecha de expiración, estado activo/revocado con su momento), tabla append-only de acción administrativa (§9.3) con su trigger de inmutabilidad, y un **guard administrativo propio**, separado de `AuthGuard` y de `InternalOpsGuard`, que **resuelve identidad y rol en el servidor a partir del token** (invariante 22). Ninguna operación sobre contenido todavía — el incremento cierra con un endpoint administrativo trivial (p. ej. "quién soy") que demuestra el guard, la identidad, la resolución de rol por el backend y el registro de acceso.
- **Dependencias**: Incremento 1 (§10, secuenciación obligatoria).
- **Determinado por**: **DG-7** (token personal por actor, hasheado, revocable, expirable; backend como autoridad de rol; sin Firebase; sin mezcla con `Account`; sin `InternalOpsGuard`) y **DG-9** (desactivación/revocación sin hard-delete; **la entidad NO lleva campos de retención ni de anonimización, porque el periodo quedó explícitamente diferido**, §11.4).
- **Invariantes que introduce**: 6, 7, 10, **22, 23**. **Protege**: no toca `Account`, `AuthGuard`, `InternalOpsGuard` ni el pipeline de ADR-0005.
- **Gate de cierre esperado**: `verify:admin-actor-gate`. Criterios en §13.2.
- **Qué NO hace explícitamente**: no publica nada; no toca contenido; no implementa los cuatro roles restantes de `ADMIN-003`; no añade ningún campo a `Account`; no reutiliza `InternalOpsGuard`; **no modifica ADR-0004 ni resuelve el Decision Gate abierto de Firebase real** (DG-7 lo excluye expresamente); **no construye MFA ni segundo factor** (§9.6) y **no permite declarar `ADMIN-002` satisfecho** al cerrarlo.

### 12.3 Incremento 3 — Transiciones de estado con auditoría (retiro primero)

- **Objetivo**: poder **retirar** y **despublicar** contenido por una operación autorizada, auditada e idempotente — el caso que hoy solo es posible por SQL directo (audit §3, paso 8) y que `CMS-016`/`CMS-024`/criterio 272 exigen. El retiro va primero porque es la operación de mayor valor operativo (una pregunta errónea en producción) y la de menor superficie nueva.
- **Frontera exacta**: máquina de estados de §8.2 implementada **en el dominio EDUCATION** (invariante 15), invocada por la capa administrativa. Registro de acción administrativa por transición (§9.3). Clave de idempotencia por operación (invariante 11), reutilizando el patrón `operationId` (`schema.prisma:268`). Enforcement de `CMS-018` por identidad de actor (§8.3, invariante 9).
- **Dependencias**: Incrementos 1 y 2.
- **Determinado por**: **DG-8** — el flujo termina en `DEPRECATED`; **no se implementa T9 ni ninguna ruta hacia `ARCHIVED`** — y **DG-10** — el enforcement de T5/T7 es la regla estricta por defecto, **más** la excepción de §8.5 con activación deliberada, actor registrado y motivo por uso, como rama explícita y auditable.
- **Invariantes que introduce/protege**: 4, 9, 10, 11, 15, **21, 24**; protege 8 y 19 (el predicado de los cuatro lectores no cambia).
- **Gate de cierre esperado**: `verify:editorial-transitions-gate`. Criterios en §13.3.
- **Qué NO hace explícitamente**: no crea contenido nuevo; no edita contenido; no importa; no expone la matriz de cobertura.

### 12.4 Incremento 4 — Autoría: crear borrador y publicar versión nueva

- **Objetivo**: cerrar el criterio 259 (*"el contenido puede crearse sin modificar código"*), `PRD-D052` y `CONTENT-011`.
- **Frontera exacta**: creación de `Question`/`QuestionVersion`/`AnswerOption` y `LearningResource`/`LearningResourceVersion` en `DRAFT` (T1), edición en `DRAFT` (T2), envío a revisión (T3) con las validaciones de contenido de `CMS-013` (exactamente una alternativa correcta, número válido de alternativas, sin duplicados, explicación presente, clasificación completa), y publicación (T7) con la despublicación transaccional de la versión anterior (invariante 16). Las fórmulas se renderizan con `renderLatexToSvg()` **en el momento de publicación**, nunca en lectura (ADR-0002/0013, `seed.ts:69`). Zod (`@axioma/contracts`) sigue siendo la autoridad de la forma del JSON (ADR-0012 punto 4) — se **reutiliza**, no se modifica.
- **Dependencias**: Incrementos 1, 2, 3.
- **Determinado por**: **DG-11**, pero ya **no bloqueado por él**: la garantía de unicidad **se creó en el Incremento 1**. Este incremento solo la **consume**, y debe hacerlo respetando el orden de escritura de T7 que §8.6 especifica (despublicar la anterior **antes** de publicar la nueva, dentro de la misma transacción, porque un índice único parcial no admite diferimiento al `COMMIT`).
- **Invariantes que introduce/protege**: 5; protege 1-4 (la ruta de escritura no puede violar la inmutabilidad porque el Incremento 1 ya lo impide en Postgres), **16** (ya aplicado en Postgres desde el Incremento 1; aquí se añade el enforcement transaccional de servicio) y 8.
- **Gate de cierre esperado**: `verify:editorial-authoring-gate`. Criterios en §13.4.
- **Qué NO hace explícitamente**: no importa en masa (`CMS-026..029`, diferido); no genera contenido con IA (`CONTENT-014`, invariante 18); no construye vista previa (`CMS-007`, diferido por decisión D); no añade estados al enum; no toca `packages/contracts` salvo de forma aditiva y explícita para el contrato administrativo, si resulta necesario.

### 12.5 Incremento 5 — Content Coverage Matrix (solo lectura)

- **Objetivo**: criterio 267 / `CMS-002` / `PRD-D057`.
- **Frontera exacta**: **solo lectura, exclusivamente `GET`.** Agregación por materia/tema del conteo de versiones publicadas, borradores/en revisión/aprobadas, y última actualización, sobre las entidades ya existentes. Reutiliza/expone `countPublishedByTopicId` (`question-version.repository.ts:82`) como precedente, sin duplicar su lógica.
- **Dependencias**: Incrementos 1 y 2 (necesita el actor administrativo para autorizar la lectura). **No** depende de 3 ni de 4 — puede implementarse en paralelo a ellos si conviene.
- **Determinado por**: ninguna de las cinco resoluciones lo modifica. Sigue siendo estrictamente de solo lectura.
- **Invariantes que introduce/protege**: 14 (solo lectura, sin `isCorrect`, sin datos de estudiante).
- **Gate de cierre esperado**: `verify:content-coverage-matrix-gate`. Criterios en §13.5.
- **Qué NO hace explícitamente**: no calcula cobertura curricular PAES oficial (la taxonomía de `CMS-001` no existe en el esquema, ADR-0012); no incluye errores frecuentes ni prácticas disponibles (no existen como entidades); **no introduce ninguna ruta de escritura**; no expone `AnswerOption.isCorrect`; no expone ningún dato de estudiante.

### 12.6 Incremento 6 — CLI interna

- **Objetivo**: cerrar decisión D — que un miembro autorizado del equipo pueda ejercer todo el ciclo editorial **sin editar código ni escribir SQL**, que es la formulación literal del criterio 259 y de `PRD-D052`.
- **Frontera exacta**: comandos en `apps/backend/src/cli/` (donde hoy solo vive `recover-account.ts`) que consumen la **misma API administrativa** de los Incrementos 2-5. Ninguna lógica de negocio propia en el CLI: es un cliente, no una segunda ruta de escritura. **El CLI presenta el token personal del actor y nada más** (**DG-7 resuelto**, invariante 22): no envía un rol, no decide un rol, no aplica comprobaciones de autorización propias, no abre conexión a la base.
- **Dependencias**: Incrementos 2, 3, 4, 5.
- **Invariantes que introduce/protege**: 12 (ninguna operación requiere SQL manual), 13 (ninguna requiere cambio en mobile), 7 y **22** (el CLI se autentica presentando el token personal del actor, no una clave compartida, y el backend resuelve identidad y rol).
- **Gate de cierre esperado**: `verify:editorial-cli-gate`. Criterios en §13.6.
- **Qué NO hace explícitamente**: no construye ninguna UI web; no construye vista previa (`CMS-007`); no crea un tercer paquete en `apps/`; no duplica lógica de dominio.

---

## 13. Gates y criterios de cierre

Convención de nombres, verificada contra el repositorio real: gates por incremento en `apps/backend/scripts/verify-*-gate.ts` con script `verify:*-gate`; gate consolidado de bloque en `scripts/verify-lef-block-vii-gate.mjs` con script `verify:lef-block-vii-gate`, siguiendo exactamente `scripts/verify-lef-block-vi-gate.mjs` / `verify-lef-block-v-gate.mjs` y sus entradas en `package.json:14-21`. **Ningún gate se crea en este documento — solo se describen.**

### 13.1 `verify:education-published-immutability-gate` (Incremento 1)

Contra **PostgreSQL real** y el backend compilado, mismo patrón que `verify-auth-gate.ts` (ADR-0004: probar contra el servidor real, con conexión directa `pg` para fixtures).

1. **Control positivo anti-falso-negativo obligatorio**, mismo criterio que `verify-ai-answerkey-isolation-gate.ts:34-39`: el gate debe demostrar primero, sobre una fila **en `DRAFT`**, que los mismos `UPDATE` **sí** se aplican. Sin este control, un gate que pase porque la fixture no existe o porque la sentencia nunca se ejecutó sería indistinguible de un gate correcto.
2. **Rechazo vía SQL directo, no solo vía API** (exigencia literal de decisión C): sobre una fila `PUBLISHED`, ejecutados con `pg` sin pasar por Nest, deben fallar: `UPDATE question_version SET stem_content = …`; `SET explanation_content = …`; `SET curriculum_topic_id = …`; `SET question_id = …`; `SET published_at = …`; `UPDATE learning_resource_version SET title = …`; `SET content_blocks = …`; `UPDATE answer_option SET content = …` y `SET is_correct = NOT is_correct` sobre una versión publicada; `INSERT` de un `answer_option` en una versión publicada; `DELETE` de un `answer_option` de una versión publicada; `DELETE` de la propia versión publicada.
3. **Transiciones permitidas SÍ funcionan**: `UPDATE question_version SET editorial_status='DEPRECATED'` sobre una fila `PUBLISHED` **debe** tener éxito, junto con su `updated_at`. Ídem para `learning_resource_version`. Un gate que solo pruebe rechazos podría estar pasando con un trigger que bloquea todo, lo que rompería T8.
4. **Transiciones prohibidas sobre fila publicada rechazadas**: `PUBLISHED → DRAFT`, `PUBLISHED → IN_REVIEW`, `PUBLISHED → APPROVED` y **`PUBLISHED → ARCHIVED`** — este último **de forma permanente, no provisional** (**DG-8 resuelto**, invariante 21). `DEPRECATED` es el estado terminal de V1.
5. **Filas no publicadas siguen siendo totalmente mutables**: todo `UPDATE` sobre `DRAFT`/`IN_REVIEW`/`APPROVED` se aplica sin objeción.
6. **Unicidad de versión publicada, verificada contra PostgreSQL directamente** (**DG-11 resuelto**, invariante 16, §8.6), con el mismo rigor de control positivo:
   - **Control positivo**: una identidad (`question_id`) con **cero** versiones publicadas admite que una pase a `PUBLISHED`; una identidad con dos versiones en `DRAFT` admite ambas.
   - **Rechazo por SQL directo**: con una versión ya `PUBLISHED` de una `Question`, `UPDATE question_version SET editorial_status='PUBLISHED'` sobre **otra** versión de la **misma** `Question` **debe fallar**; ídem un `INSERT` directo de una segunda fila publicada de la misma identidad.
   - **Lo mismo para `learning_resource_version` por `learning_resource_id`.**
   - **La secuencia válida sí funciona**: despublicar la anterior (`PUBLISHED → DEPRECATED`) y **después** publicar la nueva, en una única transacción, **debe tener éxito** — y la secuencia inversa dentro de la misma transacción **debe fallar**, confirmando que el índice parcial no es diferible y que el orden de §8.6 es el correcto.
   - **Identidades distintas no interfieren**: dos `Question` distintas pueden tener cada una su versión publicada.
7. **`prisma/seed.ts` sigue siendo idempotente** y ejecutable de extremo a extremo sobre una base limpia y sobre una base ya sembrada, **sin violar ningún trigger nuevo ni ninguno de los dos índices únicos parciales**.
8. **Los datos preexistentes satisfacen la migración**: aplicarla sobre una base ya sembrada **no falla** y no requiere ninguna corrección de datos — evidencia de que la garantía es additiva y sin cambio de comportamiento observable (§4.1).
9. **Regresión completa de Bloques I-VI en PASS**, sin excepciones — `verify:learning-experience-foundation-gate` y los gates de bloque encadenados.

### 13.2 `verify:admin-actor-gate` (Incremento 2)

1. Sin token → rechazo (nunca acceso anónimo).
2. Con actor válido pero **sin el rol requerido** → rechazo.
3. Con el rol correcto → acceso concedido.
4. **`InternalOpsGuard` no concede acceso a ningún endpoint administrativo editorial** — probado enviando `x-internal-ops-key` válida y verificando el rechazo.
5. **Comprobación estática**: ningún controller editorial importa ni aplica `InternalOpsGuard`; ningún módulo administrativo importa `AuthGuard`; `Account` no ganó ningún campo de rol (diff del esquema); **ninguna tabla administrativa tiene FK hacia `Account`**.
6. El acceso y la identidad quedan registrados de forma atribuible; el registro es **append-only** (un `UPDATE` sobre él falla en PostgreSQL).
7. **Desactivación sin hard-delete** (**DG-9 resuelto**, invariante 23): un `AdminActor` desactivado **no puede operar**; **borrar un `AdminActor` referenciado por el registro falla** (FK `Restrict`); y **tras desactivarlo, sus acciones históricas siguen consultables y atribuidas a él** — el rastro de "qué actor hizo qué transición" sobrevive intacto.
8. **Token personal, propiedades verificadas** (**DG-7 resuelto**, invariante 22): un token **revocado** → rechazo; un token **expirado** → rechazo; un token perteneciente a un actor desactivado → rechazo; **el valor en claro del token no está almacenado en ninguna columna** (comprobación directa sobre la base: solo existe su hash).
9. **El backend es la autoridad de rol** (invariante 22): un cliente que envíe un rol, un identificador de actor o cualquier afirmación de privilegio en la petición **no obtiene ningún efecto** — el rol usado es siempre el que el backend resolvió a partir del token. **Comprobación estática adicional**: ningún contrato de petición administrativa contiene un campo de rol o de actor.
10. **Ningún endpoint administrativo devuelve datos de `Account`, `StudentResponse`, `AiConversation`, `AiMessage` ni de PROGRESS/GAMIFICATION/PRIVACY** (§11.4).
11. **`ADMIN-002` no se declara satisfecho** al cerrar este incremento: el reporte del gate debe incluir explícitamente el diferimiento parcial de §9.6 (verificación adicional / segundo factor).
12. Regresión de AUTH/USER/PRIVACY sin cambios; regresión completa de Bloques I-VI en PASS.

### 13.3 `verify:editorial-transitions-gate` (Incremento 3)

1. **Retirar una pregunta la saca de los cuatro lectores** (§11.1), verificado uno por uno contra el backend real.
2. Los `StudentResponse` históricos de esa versión **sobreviven íntegros**, con su `isCorrect` y su `answerOptionId` originales.
3. Una sesión de Pregunta rápida en curso obtiene el `ConflictException` ya existente (`quick-question.service.ts:174`) — comportamiento **existente**, confirmado, no modificado.
4. Una `AiConversation` ya creada degrada correctamente (`ai-academic-context-builder.service.ts:131`); una conversación **nueva** sobre la pregunta retirada es rechazada (`:101`). Ambos ya son correctos hoy; el gate confirma que no se degradaron.
5. **Cada transición prohibida de §8.4 es rechazada por la API** con un error explícito: `DRAFT → PUBLISHED`, `DRAFT → APPROVED`, `IN_REVIEW → PUBLISHED`, `DEPRECATED → PUBLISHED`, `DEPRECATED → DRAFT`, **y cualquier destino `ARCHIVED` desde cualquier estado** (**DG-8 resuelto**, invariante 21).
6. **`CMS-018` verificado por identidad de actor, con su excepción verificada como excepción** (**DG-10 resuelto**, §8.5, invariantes 9 y 24):
   - **Regla normal**: el actor que creó o editó por última vez la versión **no puede** ejecutar T5 ni T7 sobre ella; otro actor sí.
   - **Sin activación deliberada de la excepción, la auto-aprobación es rechazada** — este es el punto central del gate.
   - **Un actor con AMBOS roles (Autor y Publicador) y sin excepción activada es igualmente rechazado**: tener ambos roles no autoriza nada por sí solo.
   - **Un uso de la excepción sin motivo es rechazado.**
   - **Un uso válido queda en el registro como evento distinguible**, con el actor que activó la excepción, el actor que la usó y el motivo — y es **consultable** como tal (se puede responder "cuántas publicaciones se hicieron bajo excepción").
   - **La excepción no relaja nada más**: con la excepción activada, los invariantes 1-5 y 16 siguen aplicándose sin cambio (re-ejecución del gate del Incremento 1 con la excepción activa).
7. **Idempotencia**: reenviar la misma operación con la misma clave no repite el efecto ni duplica el registro de acción.
8. **Auditoría completa**: cada transición produce exactamente un registro con los **nueve** campos de §9.3 (el noveno solo cuando se usó la excepción de §8.5); T4/T6/T8 autónomo sin motivo son rechazadas.
9. Regresión completa de Bloques I-VI en PASS.

### 13.4 `verify:editorial-authoring-gate` (Incremento 4)

1. Crear una pregunta completa vía API deja la versión en `DRAFT`, **invisible en los cuatro lectores** y en todo endpoint del estudiante (extensión del gate de EDUCATION ya existente, `verify-education-gate.ts`).
2. Publicar una corrección deja **exactamente una** versión `PUBLISHED` por identidad; `findPublishedByTopicId` no devuelve duplicados. **Y la garantía es de PostgreSQL, no del servicio**: el gate del Incremento 1 (§13.1 punto 6) ya lo demostró contra SQL directo; aquí se verifica además que la **transacción de T7 respeta el orden de §8.6** (despublicar antes de publicar) y que una implementación con el orden invertido **falla de forma visible** en vez de degradar en silencio.
3. La versión anterior permanece **íntegra y referenciable**: su contenido es byte-idéntico antes y después, y una `AiConversation` anclada a ella sigue refiriéndose a ella.
4. Los `StudentResponse` de la versión antigua conservan `isCorrect` y su alternativa.
5. Las validaciones de `CMS-013` rechazan: cero alternativas correctas, dos alternativas correctas, alternativas duplicadas, explicación ausente.
6. `verify:ai-answerkey-isolation-gate` sigue en **verde con su control positivo** — sin él, este punto no demostraría nada (audit §5.3c).
7. **Ninguna operación de este incremento puede mutar una fila publicada** — el gate del Incremento 1 se re-ejecuta como parte de este.
8. Regresión completa de Bloques I-VI en PASS.

### 13.5 `verify:content-coverage-matrix-gate` (Incremento 5)

1. La matriz refleja el estado real de la base **después de publicar** y **después de retirar**.
2. **No expone `AnswerOption.isCorrect`** — inspección exhaustiva de claves de la respuesta.
3. **No expone ningún dato de estudiante** — inspección exhaustiva.
4. **Comprobación estática**: el módulo de la matriz no expone ningún método HTTP distinto de `GET` y no invoca ninguna operación de escritura en ningún repositorio (invariante 14).
5. Regresión completa de Bloques I-VI en PASS.

### 13.6 `verify:editorial-cli-gate` (Incremento 6)

1. El ciclo completo — crear, enviar a revisión, aprobar (con actor distinto), publicar, corregir publicando versión nueva, retirar — se ejecuta **exclusivamente** desde el CLI, contra el backend real, **sin una sola sentencia SQL manual y sin editar ningún archivo de código** (invariante 12).
2. El CLI **presenta el token personal del actor**; **sin token no opera** y no acepta `INTERNAL_OPS_KEY`. Con token revocado o expirado, tampoco opera.
3. **Comprobación estática** (**DG-7 resuelto**, invariante 22): el CLI no importa repositorios de Prisma directamente ni abre conexión propia a la base —solo consume la API—, **no contiene ninguna comprobación de rol propia y no envía ningún rol ni identificador de actor en sus peticiones**. La autorización la resuelve íntegramente el backend a partir del token.
4. **`apps/mobile` sin ningún cambio en todo el bloque** (diff vacío) y el estudiante ve el contenido publicado **sin ningún despliegue móvil** (invariante 13).
5. Regresión completa de Bloques I-VI en PASS.

### 13.7 `verify:lef-block-vii-gate` — gate consolidado del bloque

`scripts/verify-lef-block-vii-gate.mjs`, con entrada `"verify:lef-block-vii-gate"` en `package.json`, siguiendo exactamente el patrón de `verify-lef-block-vi-gate.mjs`. Encadena, **en este orden**:

1. **`verify:education-published-immutability-gate` como primer eslabón** — materializa la secuenciación obligatoria de §10: si la migración del Incremento 1 está ausente o revertida **en cualquiera de sus dos mitades** (triggers de inmutabilidad **o** índices únicos parciales de unicidad), todo el bloque falla, no solo el Incremento 1.
2. Los gates de los Incrementos 2-6, en orden de dependencia.
3. **La regresión completa de Bloques I-VI** vía `verify:learning-experience-foundation-gate`, que a su vez encadena `verify:lef-block-vi-gate` y anteriores — **en PASS limpio de extremo a extremo, sin excepciones**.
4. **Comprobaciones estáticas transversales de no-alcance**, mismo método que `LEF-BLOCK-V-CLOSURE-REPORT.md:19`: `apps/` sigue conteniendo exactamente `backend` y `mobile`; no existe módulo de importación masiva; no existe superficie de vista previa; **el enum `EditorialStatus` no ganó `SCHEDULED` ni perdió `ARCHIVED`**; **ninguna ruta editorial escribe el literal `ARCHIVED`** (invariante 21); no existen tablas `editorial_review`/`editorial_finding`; ningún módulo editorial importa el dominio `ai/`; ninguna escritura sobre `xp_ledger_entry`/`league_point_ledger_entry`; **no existe ningún módulo de MFA/segundo factor** (§9.6 lo difirió, y construirlo sin autorización sería salirse del alcance tanto como no construirlo sería incumplir en silencio); **no existe ningún flag global de auto-aprobación** (§8.5).

Al cerrarse el bloque, `verify:learning-experience-foundation-gate` se actualiza para apuntar a Bloque VII como el más reciente cerrado de la fase — mismo criterio ya usado en los cierres de Bloques V y VI.

### 13.8 Criterio de cierre del bloque

Bloque VII podrá declararse **APROBADO/CERRADO** cuando exista `LEF-BLOCK-VII-CLOSURE-REPORT.md` y **todo** lo siguiente sea verdadero y verificable:

**Funcional**
1. Un miembro autorizado crea contenido académico nuevo sin editar código ni escribir SQL (criterio 259, `PRD-D052`).
2. Lo publica y el estudiante lo ve sin despliegue móvil (`CONTENT-011`).
3. Corrige contenido publicado **publicando una versión nueva**, con la anterior íntegra y referenciable (`CONTENT-005`, `CMS-025`).
4. Retira contenido erróneo sin que ningún `StudentResponse`, `QuickQuestionAttempt` ni `AiConversation` se pierda o corrompa (`CMS-016`, `CONTENT-008`, criterio 272).
5. El contenido en borrador nunca aparece en ningún endpoint del estudiante (`CONTENT-003`, DM §8.26).
6. La Content Coverage Matrix refleja el estado real del catálogo (criterio 267).

**Invariantes**
7. **`DM-D102` aplicado por PostgreSQL**: ningún `UPDATE`/`INSERT`/`DELETE` altera una versión publicada, ni siquiera por SQL directo — con control positivo demostrado.
7-bis. **Unicidad de versión publicada aplicada por PostgreSQL**: ninguna ruta, ni siquiera SQL directo, deja dos versiones `PUBLISHED` de la misma `Question` o del mismo `LearningResource` — con control positivo demostrado (§13.1 punto 6).
7-ter. **`ARCHIVED` inalcanzable**: ninguna ruta de Bloque VII lo produce, y el trigger rechaza `PUBLISHED → ARCHIVED` (invariante 21).
8. Los **veinticuatro** invariantes de §7 verificados, cada uno en la capa que §7 especifica.
9. Los cuatro lectores (§11.1) con predicado byte-idéntico, y el gate consolidado de Bloques I-VI en PASS sin excepciones.
10. `verify:ai-answerkey-isolation-gate` en verde **con su control positivo**; ninguna garantía de Bloque VI debilitada.
11. `xp_ledger_entry` append-only e intacto (`0016:62`).
12. Ningún ADR ni decisión de Bloques I-VI reinterpretado en silencio.

**Seguridad**
13. Toda operación editorial exige actor autorizado, y quién la hizo queda registrado con momento, motivo y objeto (`CMS-022`, `MOD-004`, `CONTENT-013`, criterio 265).
14. Reenviar la misma operación no repite su efecto (MC §8.19).
15. La superficie administrativa está separada de la aplicación del estudiante (`ADMIN-001`), y `InternalOpsGuard` no concede ninguna capacidad editorial.
15-bis. **El token administrativo es personal, hasheado, revocable y expirable, y el backend es la única autoridad de rol** (invariante 22); ningún cliente, CLI incluido, decide o envía un rol.
15-ter. **La auto-aprobación nunca ocurre de forma implícita**: sin activación deliberada y motivo por uso, el sistema rechaza; tener ambos roles no basta (invariante 24, §8.5).
15-quater. **`ADMIN-002` se declara PARCIALMENTE satisfecho, no satisfecho**, con la parte diferida (verificación adicional / segundo factor) nombrada explícitamente en el reporte de cierre (§9.6). **Un cierre que lo declarara satisfecho sin esta salvedad es incorrecto.**

**Documental**
16. **Los cinco Decision Gates (DG-7 a DG-11) resueltos y registrados** — condición ya cumplida en esta versión del documento: sus resoluciones están incorporadas en las secciones correspondientes y §14 conserva el registro y el mapa (patrón `LEF-BLOCK-VI-DEFINITION.md` §29/§30). Lo que el cierre debe verificar es que **la implementación fue fiel a esas cinco resoluciones**, no que existan.
17. Existe un ADR aprobado que registra el modelo editorial adoptado y su nivel de decisión (protocolo Master Context 11.9).
18. El reporte de cierre registra el camino real, las desviaciones aceptadas y la **tabla completa de deudas y diferidos de §5.2**, con propietario — mismo criterio de honestidad editorial que `LEF-BLOCK-VI-CLOSURE-REPORT.md:9`. **Deben aparecer nominalmente, como mínimo**: (i) el diferimiento parcial de `ADMIN-002` (§9.6); (ii) el periodo de retención administrativa del `AdminActor` sin fijar (§11.4); (iii) el número de usos de la excepción de `CMS-018`, si los hubo (§8.5).
19. Todo el no-alcance de §3 explícitamente **no construido**, verificado por inspección estática (§13.7 punto 4).

**Regresión**
20. `pnpm -r run typecheck` / `lint`, build de todos los paquetes, y los gates de **todos** los bloques anteriores: verde.
21. `prisma/seed.ts` sigue siendo idempotente y compatible con los invariantes nuevos.

---

## 14. Decision Gates resueltos (DG-7 a DG-11) — registro de la segunda ronda

**Los cinco Decision Gates que la primera versión de este documento abrió están RESUELTOS.** El Product Owner los resolvió en una ronda posterior a la definición original (2026-08-15), y sus resoluciones **ya están incorporadas** en las secciones normativas correspondientes de este documento. Esta sección **no es la norma**: es el **registro de trazabilidad** de que las cinco decisiones se tomaron en una segunda ronda y de **dónde vive cada una**.

**Criterio editorial aplicado** (declarado para que la elección quede justificada): `LEF-BLOCK-VI-DEFINITION.md` acumula sus resoluciones posteriores como *addenda* al final (§26, §28.1, §29, §30), porque aquel documento ya estaba publicado y cerrado cuando llegaron. Aquí la situación es distinta: **esta es todavía la primera versión de la definición**, ninguna implementación se apoya en ella, y acumular cinco addenda al final obligaría a leer el documento dos veces para saber qué transición está permitida. Por eso las resoluciones se **integran en su sección natural** —donde alguien que implemente irá a buscarlas— y **esta sección conserva íntegra la trazabilidad**: qué se preguntó, qué se respondió, qué NO autoriza cada respuesta, y dónde quedó incorporada. Cada punto normativo tocado lleva además la etiqueta **(DG-N resuelto)** en el propio texto.

**Ninguna de las cinco resoluciones se reabre, se reinterpreta ni se matiza en este documento.**

### 14.1 Mapa de incorporación

| Gate | Pregunta original | Resolución | Secciones donde queda incorporada |
|---|---|---|---|
| **DG-7** | ¿Cómo se autentica el `AdminActor`? | Token personal por actor, nunca compartido; hasheado; revocable; expirable. Backend = autoridad de identidad y rol. `ADMIN-002` parcialmente diferido | §3, §4.1, §5.1, §5.2, §6 (p. 12), §7 (inv. 22), §9.2, **§9.5**, **§9.6**, §12.2, §12.6, §13.2, §13.6 |
| **DG-8** | ¿Entra `ARCHIVED` en V1? | **No.** Fuera del flujo V1; permanece en el enum histórico sin ruta que lo alcance. `DEPRECATED` es terminal | §3, §4.1, §5.1, §5.2, §6 (p. 19), §7 (inv. 21), **§8.1**, §8.2, **§8.4**, §12.1, §12.3, §13.1, §13.3, §13.7 |
| **DG-9** | ¿Qué política de sujeto/retención aplica al `AdminActor`? | Clase de sujeto distinta; desactivación/revocación sin hard-delete; atribución de auditoría preservada; **periodo de retención explícitamente diferido** | §3, §4.1, §5.2, §6 (p. 13, p. 18), §7 (inv. 23), §9.1, **§11.4**, §12.2, §13.2 |
| **DG-10** | ¿Existe la excepción de `CMS-018` en V1? | **Sí, como excepción**, no como camino normal: activación deliberada + actor registrado + motivo por uso. Tener ambos roles no autoriza nada | §3, §4.1, §5.1, §5.2, §7 (inv. 9, 24), §8.3, **§8.5**, §9.2, §9.3, §12.3, §13.3, §13.7 |
| **DG-11** | ¿La unicidad de versión publicada se refuerza en PostgreSQL? | **Sí**: índices únicos parciales, PostgreSQL como autoridad final, **en el Incremento 1**, junto con la migración de inmutabilidad | §3, §4.1, §5.1, §5.2, §6 (p. 17), §7 (inv. 16), §8.2, §8.4, **§8.6**, **§10**, **§12.1**, §12.4, §13.1, §13.4 |

### 14.2 Registro de cada resolución

Para cada gate se conserva **qué se preguntó**, **qué se respondió literalmente** y —lo más importante para evitar deriva futura— **qué NO autoriza la respuesta**.

---

#### DG-7 — Mecanismo de autenticación del `AdminActor` · **RESUELTO**

- **Se preguntaba**: decisión B fijaba *qué* debe ser el actor administrativo pero no *cómo* se autentica; `ADMIN-002` exige autenticación segura, sesiones con expiración y verificación adicional para operaciones críticas.
- **Resolución**: **actor administrativo separado + token personal por actor, nunca compartido.** El token debe ser identificable hacia un único `AdminActor`, almacenado de manera segura/hasheada (**nunca en texto plano**), **revocable** y **expirable**. **El backend sigue siendo la autoridad de roles/permisos**: el CLI **nunca** envía ni decide un rol, solo presenta el token; el backend resuelve identidad **y** rol a partir de él.
- **Qué NO autoriza**: **no** reutilizar `InternalOpsGuard`; **no** abrir ahora integración con Firebase real (el gate de ADR-0004 sigue abierto y **no se toca**); **no** mezclar `AdminActor` con `Account`; **no** diseñar MFA/segundo factor.
- **Tratamiento honesto de `ADMIN-002`, exigido por la propia resolución**: el mecanismo mínimo aprobado **no puede** satisfacer *"verificación adicional para operaciones críticas"* sin diseñar un sistema de MFA/segundo factor que esta resolución **no autoriza**. Por lo tanto **no se inventa ni se simula**: `ADMIN-002` queda registrado como **parcialmente diferido** — *satisfecho*: cuenta individual, no compartida, revocable, expirable, auditada; *diferido*: verificación adicional/segundo factor para operaciones críticas específicas. **Debe reportarse explícitamente antes de que el Incremento 2 en adelante se dé por bloqueante-resuelto en este aspecto** (§9.6).
- **Incorporada en**: §9.5 (modelo mínimo de token), §9.6 (qué queda satisfecho y qué diferido), invariante 22, §12.2, §13.2, §13.6.

---

#### DG-8 — `ARCHIVED` en el alcance de V1 · **RESUELTO**

- **Se preguntaba**: decisión A enumeraba cinco estados sin mencionar `ARCHIVED`, mientras el texto aprobado de decisión C nombraba *"`DEPRECATED`/`ARCHIVED`"* como transición permitida sobre una fila publicada. Las dos resoluciones discrepaban.
- **Resolución**: **`ARCHIVED` queda fuera del flujo V1.** La máquina de estados contractual de Bloque VII es exactamente `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`. `ARCHIVED` **permanece en el enum histórico** (el enum de Prisma **no se toca**) pero **no es producido ni alcanzable por ninguna ruta de Bloque VII**. La mención a `ARCHIVED` en la resolución de `DM-D102` (decisión C) se reconcilia como **una imprecisión de alcance de aquella resolución original** y queda corregida: para V1, una versión `PUBLISHED` solo puede realizar la transición administrativa autorizada **`PUBLISHED → DEPRECATED`**.
- **Qué NO autoriza**: **no** eliminar `ARCHIVED` del enum (sería modificar un artefacto de Bloque I, cerrado); **no** añadir una transición T9; **no** dejar ninguna mención residual de `ARCHIVED` como alcanzable en V1 — este documento no conserva ninguna.
- **Incorporada en**: §8.1 (estados en alcance), §8.2 (no existe T9), §8.4 (lista cerrada, regla única de transición), invariante 21, §12.1, §12.3, §13.1 punto 4, §13.7 punto 4.

---

#### DG-9 — Clase de sujeto y retención del `AdminActor` · **RESUELTO**

- **Se preguntaba**: qué política de privacidad/ciclo de vida aplica a un `AdminActor`, que es una persona natural que ninguna fuente del proyecto contempla.
- **Resolución**: `AdminActor` es **una clase de sujeto distinta de `Account`**. V1 implementa **desactivación/revocación de acceso** (no elimina el registro) y **preserva la atribución histórica de auditoría**: **NUNCA** un hard-delete que rompa el rastro de qué actor hizo qué transición. El **periodo EXACTO de retención administrativa** —cuánto tiempo se conserva un `AdminActor` desactivado, sus credenciales revocadas, etc.— queda **EXPLÍCITAMENTE DIFERIDO** por falta de una fuente contractual que permita fijar un número.
- **Qué NO autoriza**: **no** reutilizar automáticamente los 90 días de retención del Tutor IA (Bloque VI); **no** asumir que ADR-0005 (pipeline de privacidad de estudiantes) aplique aquí sin modificación — son clases de sujeto distintas; **no** inventar un número por analogía con ningún otro dominio.
- **Incorporada en**: §11.4 (resolución completa), §9.1 (desactivación/revocación, sin campos de retención), invariante 23, §5.2 (diferido con su autorización), §12.2, §13.2 punto 7.

---

#### DG-10 — Excepción registrada de `CMS-018` · **RESUELTO**

- **Se preguntaba**: bajo la regla estricta de §8.3, un equipo editorial de una sola persona no podría publicar nada. `CMS-018` contempla su propia salida, pero decisión A no decía si esa excepción existe en V1.
- **Resolución**: **se mantiene como regla NORMAL la prohibición de auto-aprobación** (un Autor no puede transicionar su propio contenido a través de las etapas de revisión/aprobación). **PERO** se autoriza una **excepción inicial explícita y auditable** para el caso de operación con un equipo de una sola persona, tal como las fuentes (`CMS-018`/`ADMIN-003`/`OQ-029`) contemplan. La excepción exige, acumulativamente: **activación deliberada** (no es el comportamiento por defecto; alguien debe activarla explícitamente) + **registro del actor** que la activó/usó + **motivo/justificación registrada por cada uso**.
- **Qué NO autoriza**: **poseer simultáneamente los roles Autor y Publicador NO constituye por sí solo autorización silenciosa de auto-aprobación** — la excepción debe activarse y justificarse **cada vez**, nunca derivarse implícitamente de tener ambos roles asignados. Tampoco autoriza ninguna excepción a la inmutabilidad (§8.4) ni a la unicidad (§8.6).
- **Incorporada en**: §8.5 (formalización completa), §8.3 (regla normal), invariantes 9 y 24, §9.2, §9.3 (campo 9 del registro), §12.3, §13.3 punto 6.

---

#### DG-11 — Unicidad de versión publicada reforzada en PostgreSQL · **RESUELTO**

- **Se preguntaba**: si la propiedad "como máximo una versión publicada por identidad" —hoy cumplida por accidente estructural— debía vivir también en PostgreSQL, lo que exigía una migración adicional sobre tablas de Bloque I que decisión C no cubría.
- **Resolución**: **se autoriza** una migración SQL sobre entidades de EDUCATION (Bloque I, cerrado) para añadir **índices únicos PARCIALES** que aseguren, según las relaciones parentales reales del schema, **como máximo una versión `PUBLISHED` por `Question` y por `LearningResource`**. **PostgreSQL será la autoridad final** — índice único parcial, no solo validación de servicio. Se implementa **JUNTO CON** la migración de inmutabilidad de `DM-D102` (decisión C), como parte del **mismo Incremento 1**, **ANTES** de cualquier endpoint editorial de escritura.
- **Relaciones parentales verificadas en el schema real** (`apps/backend/prisma/schema.prisma`): `question_version.question_id → question.id` (`:172-201`, relación `Question.versions`) y `learning_resource_version.learning_resource_id → learning_resource.id` (`:119-138`, relación `LearningResource.versions`). La estructura paralela **sí existe** para recursos de aprendizaje, de modo que **se crean los dos índices**. Detalle en §8.6.
- **Qué NO autoriza**: **no** modificar `findPublishedByTopicId` ni ningún otro lector (invariante 19); **no** añadir columnas; **no** tocar `answer_option` con índices de unicidad (su protección es la inmutabilidad).
- **Incorporada en**: §8.6 (índices, orden de escritura de T7, efecto nulo sobre datos actuales), invariante 16, §10 (secuenciación), §12.1 (Incremento 1 ampliado), §12.4, §13.1 punto 6.

---

### 14.3 Nota explícita del Product Owner sobre Bloque I

Reproducida aquí además de en §4.1, por ser la constancia que autoriza tocar tablas de un bloque cerrado:

> Estas decisiones (DG-8 a DG-11) **NO reabren Bloque I funcionalmente** — refuerzan invariantes contractuales ya declarados (unicidad de versión publicada, inmutabilidad) antes de hacer posible su edición administrativa por primera vez. **No cambian ningún comportamiento observable actual del sistema** (hoy nada escribe en esas tablas más allá del seed).

Verificación de esa afirmación contra el código real, para que no sea una declaración de confianza: el seed se autoexcluye cuando ya existe una versión `PUBLISHED` de la misma identidad (`seed.ts:51-54`, `:106-109`), no existe ningún endpoint de escritura sobre `question_version`/`learning_resource_version`/`answer_option` (audit §3, §2.3), y ningún valor del enum distinto de `PUBLISHED` se produce jamás (audit §2.4). Los datos actuales **ya satisfacen** ambos índices únicos parciales y ya cumplen la inmutabilidad.

### 14.4 Revisión de coherencia de las cinco resoluciones entre sí y contra el resto del documento

Revisión ejecutada como parte de la incorporación, buscando activamente contradicciones **nuevas** producidas por combinar DG-7 a DG-11 entre sí y con las decisiones A-E. Se registra el resultado punto por punto, incluidas las tensiones que **sí** aparecieron y cómo se resolvieron sin decisión de producto nueva.

| # | Tensión examinada | Resultado |
|---|---|---|
| 1 | **DG-11 (unicidad) frente al flujo de corrección editorial de decisión C** (corregir = publicar versión NUEVA) | **Compatibles.** El flujo de corrección no requiere dos versiones publicadas simultáneas: la nueva sustituye a la anterior. La pregunta de si la anterior pasa a `DEPRECATED` automáticamente o por acción separada **ya estaba respondida antes de DG-11** y no se reabre: el invariante 16 (§7) dice *"la anterior se despublica en la misma operación transaccional"* y la precondición de T7 (§8.2) lo exige como **efecto obligatorio de T7**. Es **automática y transaccional**, no una acción separada del Publicador. DG-11 no cambia el *qué*, solo hace que PostgreSQL lo garantice |
| 2 | **Orden de las dos escrituras dentro de la transacción de T7** | **Determinado, sin decisión de producto.** Un índice único **parcial** de PostgreSQL se verifica de forma inmediata por sentencia y **no admite diferimiento al `COMMIT`** (a diferencia de una restricción `UNIQUE DEFERRABLE`, que un índice parcial no puede respaldar). Por tanto el orden queda forzado: **despublicar la anterior, luego publicar la nueva** (§8.6). Es una consecuencia técnica de una decisión ya tomada, no una decisión nueva |
| 3 | **Motivo obligatorio de T8 frente a la despublicación automática dentro de T7** | **Resuelto por derivación declarada** (§8.6), siguiendo el mismo criterio de honestidad que el invariante 3: la despublicación por supersesión es un **efecto de T7**, no un T8 autónomo; se audita con motivo determinado por el sistema (referencia a la versión que sustituye) y **no** exige motivo libre adicional. El T8 autónomo conserva íntegro su motivo obligatorio. **Se declara explícitamente para que el Product Owner pueda objetarlo**; si prefiriera exigir motivo libre también ahí, es un ajuste de una línea en §9.3 y no altera ningún invariante |
| 4 | **DG-10 (excepción de `CMS-018`) frente a la prohibición de excepciones de decisión C** (*"sin abrir una excepción genérica"*) | **Sin conflicto, y acotado explícitamente.** Son dos ámbitos distintos: decisión C prohíbe excepciones a la **inmutabilidad** (§8.4, invariantes 1-5); DG-10 abre una excepción al **invariante 9** (separación de actor). §7 y §8.5 declaran ese acotamiento de forma expresa, y §13.3 lo verifica re-ejecutando el gate de inmutabilidad con la excepción activa |
| 5 | **DG-10 frente a `ADMIN-003`** (acumulación de roles lícita) | **Reconciliados.** Acumular roles sigue siendo lícito y no habilita nada por sí solo (invariante 24). La verificación sigue siendo por identidad de actor, no por rol (§8.3) |
| 6 | **DG-10 en un equipo de una sola persona: activador y beneficiario coinciden** | **Inherente al escenario autorizado, declarado sin adorno** (§8.5, nota de honestidad). La garantía en ese caso es la **trazabilidad** (deliberada, atribuida, justificada), no la separación —imposible con un solo actor—. Es exactamente lo que `OQ-029` pide (*"quedará registrada"*) |
| 7 | **DG-8 frente al literal de decisión C** (*"`DEPRECATED`/`ARCHIVED`"*) | **Reconciliado por la propia resolución de DG-8**, que califica esa mención como imprecisión de alcance de la resolución original y la corrige. Registrado en §5.1 y §8.1, sin reabrir decisión C en nada más |
| 8 | **DG-8 frente a `CMS-017`/DM §8.26** (que sí distinguen Retirado de Archivado) | **Subconjunto declarado, no contradicción**, con el mismo criterio ya usado para `SCHEDULED`: §5.2 registra `archived` como diferido con su fuente. Ninguna fuente exige la distinción para Fase 2 |
| 9 | **DG-7 (backend autoridad de rol) frente al invariante 15** (*"solo EDUCATION publica"*) | **Refuerzo mutuo.** El CLI no decide roles ni escribe; la capa administrativa solicita; EDUCATION valida y ejecuta. Ninguna segunda ruta de autorización |
| 10 | **DG-7 frente a ADR-0004** (gate de Firebase abierto) | **Sin colisión**: DG-7 excluye expresamente abrir esa integración. El gate de ADR-0004 queda exactamente donde estaba (§6, p. 12) |
| 11 | **DG-9 (no hard-delete) frente a ADR-0005** (pipeline de borrado de estudiantes) | **Sin colisión**: clases de sujeto distintas, declarado en §11.4. ADR-0005 no se extiende ni se modifica |
| 12 | **DG-9 (retención diferida) frente a la exigencia de auditoría permanente de decisión B** | **Compatibles por construcción**: la atribución se preserva siempre (invariante 23); lo diferido es *cuánto tiempo*, no *si se preserva* |
| 13 | **DG-11 frente al invariante 19** (los cuatro lectores no cambian) | **Compatible, y lo refuerza**: el índice hace **no representable** el estado inválido que hacía divergir a `findPublishedByTopicId` de `findLatestPublishedByTopicId`. **Ningún lector se modifica** (§8.6) |
| 14 | **DG-11 frente al seed y a los gates existentes** | **Sin impacto**: los datos actuales ya satisfacen los índices; el seed ya comprueba justamente esa condición (`seed.ts:51-54,106-109`) |
| 15 | **DG-11 movido al Incremento 1 frente a la secuenciación de §10** | **Refuerza §10**: ambas garantías son ahora la misma condición previa absoluta, y el gate consolidado las encadena como primer eslabón (§13.7) |

**Conclusión de la revisión**: **no aparece ninguna decisión de producto nueva pendiente.** Las tres tensiones que sí surgieron (filas 2, 3 y 6 de la tabla) se resolvieron sin inventar respuestas: la 2 es una consecuencia técnica forzada de una decisión ya tomada; la 3 es una derivación **declarada explícitamente como objetable** siguiendo el patrón ya usado por el invariante 3 de este documento; la 6 es una propiedad inherente al escenario que el Product Owner autorizó, dicha sin maquillaje. **No se abre DG-12.**

---

## 15. Resumen del estado de autorización

| Elemento | Estado |
|---|---|
| Decisiones A-E del Product Owner (primera ronda) | **Incorporadas tal cual, no reabiertas** |
| Resoluciones DG-7 a DG-11 (segunda ronda) | **Incorporadas tal cual, no reabiertas** (§4.1, §14) |
| **Decision Gates abiertos** | **Ninguno.** Los cinco están resueltos; la revisión de coherencia de §14.4 **no abrió DG-12** |
| Incremento 1 (inmutabilidad `DM-D102` **+ unicidad de publicación**) | **Definido, con alcance completo y determinado.** La lista cerrada de §8.4 es definitiva (`DEPRECATED` terminal, sin `ARCHIVED`) y la migración incluye los dos índices únicos parciales |
| Incrementos 2-6 | **Definidos y desbloqueados**, con su alcance determinado por las resoluciones según el mapa de §12 |
| `ADMIN-002` | **Parcialmente satisfecho.** Verificación adicional / segundo factor **diferida explícitamente** (§9.6) — debe reportarse antes de darlo por bloqueante-resuelto |
| Retención administrativa del `AdminActor` | **Diferida explícitamente**, sin número, por ausencia de fuente contractual (§11.4) |
| Bloques I-VI | **Cerrados, intactos, sin reinterpretación.** DG-8 a DG-11 **no reabren Bloque I funcionalmente** (§4.1, §14.3) |
| **Autorización para implementar** | **NO otorgada.** Este documento define; autorizar la implementación es un acto separado del Product Owner |
| Código, migraciones, contratos, mobile, gates, commits, tags | **Cero. Nada creado ni modificado.** |

---

## Apéndice — Alcance de este documento

**Fuente principal**: `docs/adr/LEF-BLOCK-VII-EDITORIAL-AUDIT.md` completo (752 líneas), del que provienen todas las citas de PRD/Data Model/Master Context/Kickoff y todas las referencias `archivo:línea` de código, reutilizadas sin reinventarlas.

**Plantilla de formato**: `docs/adr/LEF-BLOCK-VI-DEFINITION.md` completo (555 líneas) — encabezado, notas de nomenclatura y reconciliación, secciones numeradas, decisiones lettradas, invariantes numerados, diseño por incremento, criterio de cierre, y el patrón de addenda de resolución (§26, §28.1, §29, §30). **Sobre ese patrón, este documento tomó una variante justificada en §14**: por tratarse todavía de la primera versión de la definición y no de un documento cerrado sobre el que ya se implementó, las resoluciones de DG-7 a DG-11 se **integran en su sección normativa** en vez de acumularse como addenda al final, y §14 conserva íntegra la trazabilidad de que fueron una ronda posterior (registro por gate + mapa de incorporación + revisión de coherencia).

**Segunda ronda de resoluciones (2026-08-15)**: las cinco resoluciones DG-7 a DG-11 del Product Owner se incorporaron **tal cual fueron dictadas**, sin reabrirse. Secciones nuevas creadas por esta ronda: **§4.1** (tabla de resoluciones + nota del Product Owner sobre Bloque I), **§8.5** (excepción registrada de `CMS-018`), **§8.6** (unicidad de versión publicada), **§9.5** (modelo mínimo de token), **§9.6** (`ADMIN-002` satisfecho/diferido), **§14** completa (registro y revisión de coherencia). Invariantes nuevos: **21-24**. Ninguna decisión A-E fue modificada; la única corrección sobre el texto de una resolución previa es la de alcance sobre `ARCHIVED` que **la propia resolución de DG-8 ordena** (§5.1, §8.1).

**Verificaciones de código real reproducidas para escribir este documento** (lectura, nunca modificación): `apps/backend/prisma/schema.prisma` (enum `EditorialStatus` `:78-87`, con sus seis valores confirmados y `ARCHIVED` como sexto; `LearningResource` `:100-114` y `LearningResourceVersion` `:119-138`; `Question` `:152-166` y `QuestionVersion` `:172-201`; `AnswerOption` `:209-225` — el mapa de columnas de §8.4 y **las relaciones parentales de §8.6** (`question_version.question_id`, `learning_resource_version.learning_resource_id`) se construyeron leyendo estos modelos, no citándolos de segunda mano); `apps/backend/prisma/seed.ts:45-54` y `:100-109` (la autoexclusión por versión ya publicada, que es la evidencia de que los datos actuales ya satisfacen los índices de DG-11); `apps/backend/prisma/migrations/20260802205740_progress_foundation/migration.sql:55-95` (patrón exacto de `enforce_student_response_immutable`); `apps/backend/src/platform/internal-ops/internal-ops.guard.ts` (completo); `docs/adr/0004-identity-authentication-foundation.md` (mecanismo de identidad, para DG-7); `package.json:14-21` y `scripts/` (convención de nombres de gates).

**No modificado**: nada del repositorio salvo la creación de este archivo. `packages/contracts` intacto. `apps/mobile` intacto. `prisma/schema.prisma` y `prisma/migrations/` intactos. `docs/adr/LEF-BLOCK-VII-AUDIT.md` y `docs/adr/LEF-BLOCK-VII-EDITORIAL-AUDIT.md` intactos. `.npmrc` y los `dry-run-report-*.json` de DG-1 intactos. Sin gates nuevos. Sin commit, sin tag, sin push.
