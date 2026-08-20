# ADR 0023 — Modelo editorial adoptado en Plataforma Editorial (LEF Bloque VII, Axioma V1)

- **Estado**: **APROBADA (2026-08-20)** — registro formal del modelo editorial ya definido, autorizado e implementado durante LEF Bloque VII. Ver "Alcance de la aprobación" y "Honestidad histórica": la aprobación de **este ADR** no equivale a la aprobación del **cierre del bloque**.
- **Fecha**: 2026-08-20
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation. Bloque VII de VIII, "Plataforma Editorial".
- **Responsable de aprobación**: Product Owner (usuario).
- **Nivel de decisión** (protocolo Master Context §11.9): **Nivel 2 — decisión transversal y difícil de revertir.** Ver la sección "Nivel de decisión" para la derivación literal contra el texto de §11.9.
- **Documentos/commits fuente**: `docs/adr/LEF-BLOCK-VII-DEFINITION.md` (decisiones A-E §4, resoluciones DG-7 a DG-11 §4.1/§14, invariantes §7, máquina de estados §8, modelo de actor §9, secuenciación §10, fronteras §11, incrementos §12, gates §13); `docs/adr/LEF-BLOCK-VII-EDITORIAL-AUDIT.md` y `docs/adr/LEF-BLOCK-VII-AUDIT.md` (evidencia previa, no modificadas); commits `4d7e85f2` (I1), `5dcf7a3d` (I2), `4084e904` (I3), `9b032dec` (I4), `a28946a8` (I5), `72fc94fc` (I6) y `1d2bcdf` (gate consolidado); `docs/adr/0012-education-foundation.md`, `0014-progress-foundation.md`, `0004-identity-authentication-foundation.md`, `0005-privacy-foundation.md`, `0002-renderizador-matematico.md`, `0016-gamificacion-fundacion.md`, `0022-proveedor-ia-tutor.md`.

## Alcance de este ADR (y lo que deliberadamente NO decide)

Este ADR **no toma ninguna decisión nueva**. Registra, en el formato documental que Master Context §11.9 exige, el modelo editorial **ya decidido** por el Product Owner en `LEF-BLOCK-VII-DEFINITION.md` (decisiones A-E y resoluciones DG-7 a DG-11) y **ya materializado** en el código de los Incrementos 1-6. Cada afirmación de este documento es rastreable a una sección de la Definition, a un commit de I1-I6 o a una resolución de Decision Gate ya registrada.

Explícitamente, este ADR **NO**:

- Modifica, reabre, matiza ni reinterpreta ninguna de las decisiones A-E ni de las resoluciones DG-7 a DG-11.
- Modifica `LEF-BLOCK-VII-DEFINITION.md`, `LEF-BLOCK-VII-AUDIT.md`, `LEF-BLOCK-VII-EDITORIAL-AUDIT.md` ni ningún ADR anterior.
- Modifica código, migraciones, contratos, gates ni `apps/mobile`.
- Declara cerrado el Bloque VII. El cierre depende de `LEF-BLOCK-VII-CLOSURE-REPORT.md` y de una aprobación **separada** del Product Owner (ver "Alcance de la aprobación").
- Declara `ADMIN-002` satisfecho — queda **parcialmente** satisfecho (§9.6 de la Definition).
- Autoriza ningún trabajo futuro: ni importación masiva, ni CMS web, ni MFA, ni Bloque VIII.

## Contexto y problema

El objetivo del bloque, literal de `LEF-BLOCK-VII-DEFINITION.md` §2, es que el contenido académico de Axioma pueda *"crearse, revisarse, aprobarse, publicarse, corregirse y retirarse por un actor administrativo identificable, con auditoría atribuible, sin editar código, sin ejecutar SQL manual contra producción y sin desplegar una nueva versión de la aplicación móvil"* — sobre una base en la que la inmutabilidad de la versión publicada esté **aplicada por PostgreSQL**, no solo declarada en prosa.

El problema que lo hacía necesario, tal como la auditoría editorial lo estableció y §2/§5.1 de la Definition lo recogen:

1. **No existía ninguna ruta de escritura editorial.** El contenido solo se administraba por `prisma/seed.ts`; publicar o retirar exigía SQL manual contra la base, precisamente lo que `PRD-D052`, MC §8.14 (*"Nunca deberá requerir modificación directa de la base de producción para publicar contenido"*) y el criterio 259 prohíben.
2. **No existía ningún actor administrativo.** `OQ-029` estaba resuelta contractualmente (*"solo un rol con permiso de publicación podrá cambiar un elemento aprobado a publicado"*) pero era **inaplicable**: no existía ningún rol. `InternalOpsGuard` es una clave compartida y su propio docstring declara que *"no es autenticación de usuario"*.
3. **`DM-D102` (*"Toda versión publicada será inmutable"*) era una omisión latente**: declarado en prosa en `schema.prisma`, sin ningún mecanismo que lo aplicara. El sistema era seguro **por ausencia de superficie de escritura**, no por diseño (Definition §10, audit hallazgo G1).
4. **La unicidad de versión publicada por identidad se cumplía por accidente estructural** (el seed se autoexcluye), y dos versiones `PUBLISHED` de la misma pregunta habrían hecho que `findPublishedByTopicId` sirviera la pregunta duplicada al estudiante (Definition §8.6, audit §6.3).

El encuadre de tamaño era no negociable desde antes del bloque (MC §8.14: *"pequeña y controlada. No necesita convertirse en un CMS completo"*; PRD §17.1: *"No se construirá inicialmente una plataforma administrativa más compleja de lo necesario"*).

## Decisión

```
MODELO EDITORIAL — AXIOMA V1 (LEF BLOQUE VII)
Dominio:        ADMINISTRATION (actor/rol/token/auditoría) + EDUCATION (autoridad de publicación)
Superficie:     API administrativa + CLI interna. Sin UI web.
Actor:          AdminActor, separado de Account, token personal hasheado/revocable/expirable
Roles V1:       AUTHOR / PUBLISHER (2 de los 6 de ADMIN-003)
Máquina:        DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED -> DEPRECATED (T1..T8)
Autoridad:      PostgreSQL (triggers + índices únicos parciales), no la validación de servicio
Estado:         ADOPTADO — implementado en I1..I6
```

Los catorce puntos del modelo, cada uno con su fuente:

### 1. Plataforma Editorial como dominio administrativo interno, separado de la superficie del estudiante

Se construye una superficie administrativa **separada** de la aplicación del estudiante: identidad distinta, guard distinto, rutas distintas (`/administration/...`), y ninguna capacidad editorial concedida al `Account` del estudiante. Fuente: decisión B y decisión D (Definition §4), `ADMIN-001` (*"panel administrativo web o herramienta interna equivalente, separado de la aplicación de estudiantes"*), Kickoff Fase 2 §5.2 (*"orientadas al equipo de desarrollo y administración, no al usuario final"*). Materializado en I2 (`5dcf7a3d`, dominio `apps/backend/src/administration/`) e I3 (`4084e904`, fachada `apps/backend/src/editorial/`).

### 2. Separación `AdminActor` / `Account`

`AdminActor` es una entidad propia, en su propia tabla, **sin FK hacia `Account`**, y `Account` **no gana ningún campo de rol**. Un `AdminActor` y un `Account` nunca son la misma fila ni comparten sesión. Fuente: decisión B, literal (*"NO reutilizar `InternalOpsGuard` como identidad administrativa. NO añadir roles administrativos a `Account`"*), Definition §9.1, invariante 6. Materializado en I2 (`5dcf7a3d`): modelos `AdminActor`, `AdminActorRole`, `AdminActorToken`, `AdminAccessLogEntry`; `AuthGuard`, `Account` e `InternalOpsGuard` sin cambios.

### 3. Roles V1: `AUTHOR` y `PUBLISHER`

Exactamente dos roles, no los seis de `ADMIN-003`. Los cuatro restantes (Revisor académico, Editor, Soporte, Administrador) **no se eliminan del contrato**: quedan fuera del alcance de implementación de V1. Fuente: decisión B, Definition §9.2 y §9.4. Materializado en I2 (`5dcf7a3d`): `enum AdminRole { AUTHOR, PUBLISHER }`, con el mapa rol→transiciones resuelto en el servidor. Un actor puede tener ambos roles (`ADMIN-003` lo autoriza), y tenerlos **no** habilita nada por sí solo (punto 11).

### 4. Autenticación administrativa por token personal revocable y expirable

El `AdminActor` se autentica con un **token personal por actor, nunca compartido**, almacenado **hasheado** (el valor en claro existe solo en la emisión y nunca se persiste), **revocable** y **expirable**. El **backend es la única autoridad de identidad y de rol**: el cliente solo presenta el token. Fuente: **DG-7 resuelto** (Definition §4.1, §9.5, §14.2), invariante 22. Materializado en I2 (`5dcf7a3d`): `admin_actor_token` con hash SHA-256, cabecera `X-Admin-Token`, `AdminAuthGuard` (401 uniforme para credencial inválida/expirada/revocada/actor inactivo) y `AdminRoleGuard` + `@RequireAdminRole` (403 por rol ausente); emisión por CLI interno `create-admin-actor`, sin endpoint de auto-registro, con expiración obligatoria.

### 5. `ADMIN-002` **parcialmente** satisfecho — MFA/verificación adicional **diferida**

*Satisfecho*: cuenta administrativa individual y no compartida, autenticación por secreto no adivinable almacenado hasheado, revocable, expirable, con registro de accesos atribuible. *Diferido explícitamente*: **verificación adicional / segundo factor para operaciones críticas**. DG-7 autorizó el token personal y **no** autorizó diseñar un sistema de MFA; el proyecto **no lo inventa ni lo simula** (pedir el mismo token dos veces no es un segundo factor). Fuente: Definition §5.2, §9.6, §14.2 (DG-7), y el propio commit de I2 (`5dcf7a3d`: *"ADMIN-002 queda PARCIALMENTE satisfecho"*). **Este ADR no lo presenta como resuelto.**

### 6. Modelo de versionado editorial: identidad lógica estable → versión

El contenido se modela como **identidad lógica estable** (`Question`, `LearningResource`) más **versiones** (`QuestionVersion`, `LearningResourceVersion`), tal como `DM-D101` y ADR-0012 ya lo fijaron. Bloque VII **no introduce un modelo de versionado alternativo**: lo consume. Corregir contenido publicado es **crear una versión nueva**, jamás mutar la publicada. Fuente: Definition §6 punto 1, invariante 5, `CONTENT-005`, `CMS-025`. Materializado en I1 (`4d7e85f2`, la garantía) e I4 (`9b032dec`, la ruta de autoría y corrección).

### 7. Inmutabilidad **permanente** de `PUBLISHED` **y** `DEPRECATED`, aplicada por PostgreSQL

Cinco triggers `plpgsql` sobre `question_version`, `learning_resource_version` y `answer_option` implementan la lista cerrada de la Definition §8.4: ningún `UPDATE`, `INSERT` ni `DELETE` puede alterar el contenido de una versión que alcanzó publicación — **ni siquiera por SQL directo, backfill o migración futura**. PostgreSQL es la autoridad final, no la validación de servicio (criterio del propio proyecto, ADR-0012:50).

La cobertura se extiende **permanentemente a `DEPRECATED`**: una versión que fue publicada es inmutable para siempre; `DEPRECATED` significa *"retirada del catálogo activo"*, nunca *"vuelve a ser editable"*. **Fuente rastreable de esta extensión**: la Definition (decisión C, `DM-D102`) ordenaba la inmutabilidad de `PUBLISHED`; la extensión a `DEPRECATED` es una **resolución explícita del Product Owner durante I1**, registrada literalmente en el cuerpo del commit `4d7e85f2`: *"Cubren PUBLISHED Y DEPRECATED: una versión que fue publicada es inmutable para siempre; DEPRECATED significa 'retirada del catálogo activo', nunca 'vuelve a ser editable' (decisión del Product Owner, 2026-08-15)"*. La migración `20260815120000_lef_vii_i1_published_immutability_uniqueness/migration.sql` la implementa (`IF OLD."editorial_status" NOT IN ('PUBLISHED','DEPRECATED') THEN ...`).

`ARCHIVED` permanece en el enum histórico de Prisma y **ninguna ruta lo produce ni lo alcanza**; el trigger rechaza `PUBLISHED → ARCHIVED` de forma permanente. Fuente: **DG-8 resuelto**, invariante 21.

### 8. Unicidad de versión `PUBLISHED` por identidad, aplicada por PostgreSQL

Dos **índices únicos parciales** —`question_version(question_id) WHERE editorial_status = 'PUBLISHED'` y `learning_resource_version(learning_resource_id) WHERE editorial_status = 'PUBLISHED'`— garantizan como máximo una versión publicada por identidad, exigible incluso frente a SQL directo y concurrencia. Como un índice parcial **no admite diferimiento al `COMMIT`**, la transacción de T7 con corrección escribe primero `PUBLISHED → DEPRECATED` sobre la anterior y después `APPROVED → PUBLISHED` sobre la nueva. Fuente: **DG-11 resuelto**, Definition §8.6, §10, invariante 16. Materializado en I1 (`4d7e85f2`), en la **misma migración** que los triggers, **antes** de cualquier endpoint editorial de escritura (secuenciación obligatoria de §10).

### 9. Máquina de estados completa T1-T8

`DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`, con la lista cerrada de ocho transiciones de la Definition §8.2: T1 (creación en `DRAFT`), T2 (edición en `DRAFT`), T3 (`DRAFT → IN_REVIEW`), T4 (devolución `IN_REVIEW → DRAFT`), T5 (`IN_REVIEW → APPROVED`), T6 (rechazo tardío `APPROVED → DRAFT`), T7 (`APPROVED → PUBLISHED`) y T8 (`PUBLISHED → DEPRECATED`). No existe T9. Motivo obligatorio en T4, T6 y T8 autónomo. `DEPRECATED` es terminal en V1. Fuente: decisión A, **DG-8**, Definition §8.2/§8.4. Materializado en I3 (`4084e904`, T4-T8) e I4 (`9b032dec`, T1-T3 añadidas a la **misma** máquina de estados, sin alterar T4-T8). La autoridad de publicación vive en EDUCATION (`education/editorial-transition.service.ts`); la capa administrativa **solicita** (MC §6.24, invariante 15).

### 10. `admin_action` append-only

Cada operación editorial que cambia algo produce exactamente un registro con los **nueve** campos de la Definition §9.3 (actor, rol ejercido, momento, tipo de acción, objeto afectado, estado previo→nuevo, motivo, clave de idempotencia y —condicional— marca de excepción de `CMS-018`), dentro de la misma transacción que aplica el efecto. El registro es **append-only aplicado por PostgreSQL** (trigger `admin_action_immutable`), misma autoridad final que `admin_access_log`. Guarda **la referencia** al objeto, nunca una copia del contenido académico. Fuente: decisión B, `CMS-022`, `CONTENT-013`, `MOD-004`, criterio 265, Definition §9.3, invariante 10. Materializado en I3 (`4084e904`) y reutilizado sin reimplementar por I4 (`9b032dec`).

### 11. `CMS-018` por identidad de actor, con excepción single-operator auditable

**Regla normal y comportamiento por defecto**: el actor que creó o editó por última vez una versión **no puede** ejecutar T5 ni T7 sobre ella. La comparación es por **identidad de actor**, no por rol — la única lectura verificable por el sistema (Definition §8.3).

**Excepción registrada** (DG-10), para operación con equipo de una sola persona, con tres condiciones acumulativas: **activación deliberada** (nunca por defecto), **registro del actor** que la activó y del que la usó, y **motivo por cada uso**. Poseer ambos roles **no** constituye autorización. La excepción alcanza exclusivamente al invariante 9: **no** abre ninguna excepción a la inmutabilidad ni a la unicidad. Fuente: **DG-10 resuelto**, Definition §8.5, invariantes 9 y 24. Materializado en I3 (`4084e904`): activación fuera de banda por CLI (`cli:activate-cms018-exception`), **nunca por HTTP**, acotada a su versión, revocable, no es un flag global; el uso produce un evento distinguible y consultable con **ambos** actores, expuesto en `GET /administration/editorial/cms018-exception-uses`.

**Honestidad declarada, tal como la Definition §8.5 la exige**: en un equipo de una sola persona, quien activa la excepción y quien se beneficia de ella son la misma persona. Lo que la excepción garantiza en ese caso **no es la separación de responsabilidades** —imposible con un solo actor— **sino su trazabilidad**.

### 12. `CMS-013` — validaciones de contenido, **sin cota superior de alternativas**

Antes de T3 (`DRAFT → IN_REVIEW`) se exige, como precondición dura: clasificación completa, explicación presente, número válido de alternativas (mínimo estructural ≥ 2), exactamente una alternativa correcta y sin alternativas duplicadas. Fuente: Definition §5.2 (parciales), §8.2 (precondición de T3), §12.4. Materializado en I4 (`9b032dec`, `education/cms013-content-validation.ts` como módulo puro).

**Sin cota superior de número de alternativas, por decisión explícita**: ninguna fuente contractual cerrada la fija, y por lo tanto **no se inventó una**. Queda registrada como decisión futura no bloqueante para el Product Owner. Fuente rastreable: cuerpo del commit `9b032dec` (*"Sin cota superior: ninguna fuente contractual cerrada la fija; queda registrada como decisión futura no bloqueante para el Product Owner, no inventada aquí"*).

Complemento de I4, coherente con ADR-0002/ADR-0013: las fórmulas se renderizan server-side con `renderLatexToSvg()` **en el momento de escribir**, y un SVG de error de MathJax se trata como LaTeX **inválido** y se rechaza, nunca como prueba de validez.

### 13. Content Coverage Matrix estrictamente de solo lectura

`GET /administration/editorial/coverage-matrix`, autorizado para `AUTHOR` y `PUBLISHER`: agregación por materia/tema de versiones publicadas, borradores, en revisión y aprobadas, más la última actualización, sobre entidades ya existentes. **No crea, no modifica, no borra, no transiciona, no añade ninguna ruta de escritura**, no expone `AnswerOption.isCorrect` ni ningún dato de estudiante, y no produce registro en `admin_action` (leer no cambia nada). La agregación vive en `education/` (MC §6.17, invariante 15) y la fachada HTTP en su propio módulo, separada de la superficie de escritura de I3/I4. Fuente: decisión E, Definition §12.5, invariante 14. Materializado en I5 (`a28946a8`).

### 14. CLI interna como cliente HTTP puro

`apps/backend/src/cli/editorial.ts` es un **cliente HTTP**, no una segunda ruta de escritura: no importa repositorios ni Prisma, no abre conexión a la base, no levanta Nest, no ejecuta SQL, **no contiene ninguna comprobación de rol propia** y no acepta `INTERNAL_OPS_KEY`. Solo presenta el token personal; el backend resuelve identidad y rol. Expone todos los comandos con independencia del rol del actor — filtrar por rol en el cliente sería exactamente la autorización propia que la Definition prohíbe; el rechazo lo hace siempre el servidor. Fuente: decisión D, **DG-7**, Definition §12.6, §7.2, invariante 22. Materializado en I6 (`72fc94fc`).

## Diferimientos que forman parte de la decisión (no omisiones)

- **Importación masiva `CMS-026..029`** — **diferida para todo el Bloque VII** por **decisión E** (Definition §4, §5.2), hasta validar el flujo editorial unitario en uso real y hasta que exista necesidad real de producción de contenido a escala (`OQ-028`, MC `master_context.txt:6558`). El gate consolidado verifica estáticamente que **no existe** módulo de importación masiva.
- **Ausencia deliberada de CMS web completo** — **decisión D** resuelve `OQ-028` (Decision Gate abierto desde el PRD v1.0) con la opción "API administrativa + CLI interna, sin aplicación web administrativa nueva". `apps/` sigue conteniendo exactamente `backend` y `mobile`. `CMS-007` (vista previa) queda **diferido formalmente**, no satisfecho ni parcialmente satisfecho. Fuente: Definition §4 (D), §5.1, §5.2.
- **MFA / segundo factor** (punto 5), **`ARCHIVED` como estado alcanzable** (DG-8), **`editorial_review`/`editorial_finding`** (DM §9.21), **`SCHEDULED`/`CMS-021`** (decisión A) y **periodo de retención del `AdminActor`** (DG-9) — todos diferidos con su fuente en la Definition §5.2.

## Relación con EDUCATION, PROGRESS, Quick Question y Tutor IA

**Ninguno de los cuatro dominios cambió su comportamiento observable. Bloque VII escribe; la ruta de lectura no cambia ni un byte** (Definition §11.1, invariante 19).

**Evidencia verificada al redactar este ADR** (`git diff 8df7e2b..HEAD` sobre cada archivo, salida vacía en los seis): los cuatro lectores de §11.1 y sus repositorios quedaron **byte-idénticos** entre el commit de la Definition (`8df7e2b`) y `HEAD`:

| Lector (§11.1) | Archivo | Diff `8df7e2b..HEAD` |
|---|---|---|
| 1 — `EducationService` (catálogo) | `education/education.service.ts`, `education/learning-resource-version.repository.ts`, `education/question-version.repository.ts` | **vacío** |
| 2 — `ProgressService` | `progress/progress.service.ts` | **vacío** |
| 3 — `QuickQuestionService` | `quick-question/quick-question.service.ts` | **vacío** |
| 4 — `AiAcademicContextBuilder` (Bloque VI) | `ai/ai-academic-context-builder.service.ts` | **vacío** |

`apps/mobile` también quedó con diff **vacío** en todo el bloque (invariante 13): el estudiante ve el contenido publicado sin ningún despliegue móvil.

Consecuencias ya previstas y no agravadas: el efecto de publicar sobre el denominador de `countPublishedByTopicId` (Definition §11.1) es un efecto **de publicar**, ya presente en el diseño de ADR-0014, que este bloque hereda sin corregir; PROGRESS es **beneficiario, no participante** (§11.2); y la decisión C es también la **protección** de Bloque VI, que sale reforzado sin cambiar nada (§11.3).

## Alternativas consideradas (todas descartadas antes de este ADR, se registran sin reabrirse)

- **Reutilizar `InternalOpsGuard` como identidad administrativa** — descartada por **decisión B**: es una clave compartida y su propio docstring declara que *"no es autenticación de usuario"*, en contradicción directa con `ADMIN-002`. Sigue vigente y sin cambios para sus seis usos actuales.
- **Añadir roles administrativos a `Account`** — descartada por **decisión B** (opción C de DG-3), sostenida por MC `:5028-5034` (contra estados implícitos sobre una entidad ya cargada de semántica).
- **Aplicación web administrativa nueva en el monorepo / CMS visual WYSIWYG** — descartadas por **decisión D** y por MC §8.14 / `OQ-028` / `DM-D104`.
- **Inmutabilidad solo por validación de servicio** — descartada por **decisión C**: *"ningún `UPDATE` directo por SQL debe poder saltarse esto"*. El criterio ya estaba establecido por el propio proyecto (ADR-0012:50).
- **Unicidad de versión publicada solo por transacción de servicio** — descartada por **DG-11**: PostgreSQL es la autoridad final.
- **Los ocho estados de `CMS-017` en V1** — descartada por **decisión A**: subconjunto de cinco, con `SCHEDULED` y `ARCHIVED` fuera y su diferimiento registrado con fuente.
- **Prohibir la auto-aprobación sin excepción alguna** — descartada por **DG-10**: bajo la regla estricta, un equipo de una sola persona no podría publicar nada; `CMS-018` contempla su propia salida, y la excepción se formaliza con activación deliberada, actor registrado y motivo por uso.
- **Fijar por analogía el periodo de retención del `AdminActor`** (p. ej. los 90 días del Tutor IA) — descartada expresamente por **DG-9**: son clases de sujeto distintas y no existe fuente contractual; el número queda diferido en vez de inventado.

## Nivel de decisión (protocolo Master Context §11.9)

**Nivel 2 — decisión transversal o difícil de revertir.** Derivación literal contra la enumeración de §11.9 para Nivel 2, punto por punto:

| Criterio de §11.9 (Nivel 2) | Cómo lo cumple Bloque VII |
|---|---|
| *cambios de contrato* | `packages/contracts` gana `administration.ts`, `editorial.ts` y `content-coverage.ts` (I2, I3, I4, I5) |
| *estructuras de persistencia* | Tres migraciones: triggers + índices únicos parciales sobre tablas de EDUCATION (I1), `admin_actor`/`admin_actor_role`/`admin_actor_token`/`admin_access_log` (I2), `admin_action` y la activación de excepción de `CMS-018` (I3) |
| *autenticación* | Token personal del `AdminActor`, `AdminAuthGuard` (DG-7) |
| *autorización* | `AdminRoleGuard` + mapa rol→transiciones resuelto en el servidor; `CMS-018` por identidad de actor |
| *límites entre dominios* | Frontera ADMINISTRATION → EDUCATION: la capa administrativa **solicita**, EDUCATION valida y ejecuta (MC §6.24, invariante 15) |
| *cambios que afecten varias capacidades* | Toca EDUCATION y protege PROGRESS, Quick Question y Tutor IA sin modificarlos |

§11.9 exige para Nivel 2 *"una propuesta de ADR y aprobación humana antes de implementarse"*, y fija el contenido mínimo de una propuesta de decisión: identificador, contexto, problema, alternativas, recomendación, consecuencias, riesgos, reversibilidad, documentos y módulos afectados, responsable de aprobación y estado. Este documento los cubre todos — **con la salvedad temporal declarada en "Honestidad histórica"**: se redacta durante el cierre, no antes de I1.

**No es Nivel 3, y por qué se dice explícitamente**: §11.9 reserva el Nivel 3 para decisiones normativas de producto (*alcance*, *contenido*, *privacidad*, *criterios educativos*, *principios no negociables*). Las decisiones de **alcance** del bloque —A-E y las resoluciones DG-7 a DG-11— son exactamente de esa naturaleza, y **ya fueron tomadas por el Product Owner de forma explícita**, registradas en `LEF-BLOCK-VII-DEFINITION.md` §4, §4.1 y §14. Este ADR **no las toma**: registra el **modelo técnico/arquitectónico** que las materializa, que es Nivel 2. Ambos niveles conviven en el bloque; no se sustituye uno por otro.

**Reversibilidad**: baja. Los triggers y los índices únicos parciales son restricciones de base sobre tablas de Bloque I; la identidad administrativa y su auditoría append-only son estructuras de persistencia nuevas cuyo rastro no puede romperse (invariante 23). Revertir el modelo exigiría una migración explícita y una decisión de producto propia.

## Consecuencias

**Lo que se gana**:

- `DM-D102` queda **aplicado por primera vez** y no solo declarado; la protección alcanza también a Bloques III, IV y VI, que dependían de él sin que nada lo aplicara.
- La unicidad de versión publicada deja de cumplirse por accidente: el estado inválido que habría servido preguntas duplicadas al estudiante **deja de ser representable**.
- `OQ-028` queda **resuelta** (primera vez en todo el proyecto) y `OQ-029` pasa de resuelta-pero-inaplicable a **aplicable**.
- Publicar, corregir y retirar contenido deja de exigir SQL manual contra producción (`PRD-D052`, MC §8.14, criterio 259) y no exige ningún despliegue móvil (`CONTENT-011`).
- Toda acción editorial queda atribuida a una persona identificable, en un registro append-only aplicado por PostgreSQL.

**Lo que se deja fuera deliberadamente** (con su fuente en la Definition §5.2): MFA/segundo factor de `ADMIN-002`; los cuatro roles restantes de `ADMIN-003`; `editorial_review`/`editorial_finding` y las cinco dimensiones de `DM-D113`; `SCHEDULED`/`CMS-021`; `ARCHIVED` como estado alcanzable; `CMS-007` (vista previa); importación masiva `CMS-026..029` y exportación `CMS-028`; taxonomía PAES completa de `CMS-001`; subida de imágenes; y todo `EXAM-*`, `MOD-001..003`, `SUPPORT-*`, `ADMIN-005..018`.

**Tradeoffs aceptados, dichos sin adorno**:

- El equipo de una sola persona publica bajo **excepción registrada**, no bajo separación real de responsabilidades (punto 11).
- Mientras el periodo de retención del `AdminActor` no se fije, la identidad de personas que ya no forman parte del equipo permanece almacenada, desactivada y sin fecha de caducidad. Es el precio de la atribuibilidad que decisión B exige (Definition §11.4).
- La corrección de una alternativa correcta publicada es exactamente el tipo de operación que `OQ-030` nombra como de alto riesgo, y hoy se ejecuta con un solo factor de autenticación (punto 5).

## Deudas explícitas que NO bloquean el cierre

Las once deudas ya clasificadas como no bloqueantes o diferidas en la auditoría de §13.8, resumidas aquí sin reabrirlas ni reclasificarlas. La duodécima —la ausencia de este ADR— es la que este documento resuelve.

| # | Deuda | Clasificación | Fuente |
|---|---|---|---|
| 1 | `ADMIN-002` parcialmente satisfecho — verificación adicional / segundo factor | **DIFERIDA con fuente** | DG-7, Definition §9.6; commits `5dcf7a3d`, `a28946a8`, `72fc94fc` |
| 2 | Periodo de retención del `AdminActor` desactivado, sin plazo fijado | **DIFERIDA por ausencia de fuente contractual** | DG-9, Definition §11.4 |
| 3 | `CMS-018` — excepción con **20 activaciones y 40 usos**, **exclusivamente de gate y desarrollo**, **cero uso productivo real** | **No bloqueante — registro de actividad de verificación, NO actividad editorial productiva** | Definition §13.8 punto 18 (iii); recuento verificado en la auditoría previa de §13.8 |
| 4 | Fixture heredado de `verify-progress-gate.ts`: deja **+1 fila anómala por corrida** (`question_version` `PUBLISHED` sin `answer_option`), imborrable por diseño desde I1 | **No bloqueante, sin vínculo causal con Bloque VII** | Commit `1d2bcdf`; origen en Bloque III |
| 5 | 7 versiones `PUBLISHED` preexistentes sin `answer_option` (2026-08-15/16, previas al bloque) que pueden hacer fallar de forma intermitente un check no relacionado del gate de I3 (~2,6 % por corrida) | **No bloqueante, origen preexistente demostrado** | Commit `a28946a8` |
| 6 | Divergencia nominal del gate de I2: la Definition §12.2/§13.2 lo nombra `verify:admin-actor-gate`; el gate real es `verify:admin-identity-gate` | **No bloqueante — divergencia de nombre, no de cobertura (87/87)** | Definition §13.2 vs. commit `5dcf7a3d` |
| 7 | `CMS-013` sin cota superior de número de alternativas | **Decisión futura no bloqueante, no inventada aquí** | Commit `9b032dec` |
| 8 | Sin autoría de taxonomía `CMS-001` (taxonomía PAES completa) | **DIFERIDA — no existe en el esquema** | Definition §5.2, ADR-0012 |
| 9 | Sin subida de imágenes en la superficie editorial | **DIFERIDA — fuera del alcance de §3** | Definition §3, §5.2 |
| 10 | `CMS-007` — vista previa | **DIFERIDA formalmente** | Decisión D, Definition §5.2 |
| 11 | Importación masiva `CMS-026..029` | **DIFERIDA** | Decisión E, `OQ-028` |

**Sobre la deuda 3, explícitamente**: los números 20/40 son actividad de **gate y desarrollo**, producida por las corridas de verificación de I3, I6 y el consolidado. **No representan ninguna publicación editorial productiva bajo excepción**, y no deben leerse como tal en ningún reporte.

## Honestidad histórica — cuándo se creó este ADR

**Este ADR se crea durante §13.8, el cierre del Bloque VII, sobre una implementación ya completada.** Se declara sin ambigüedad:

- **ADR-0023 no existía antes de I1**, ni en ningún punto de la implementación de I1-I6. Ninguna afirmación de este documento debe leerse como que existió antes.
- El protocolo de Master Context §11.9 exige, para una decisión Nivel 2, *"una propuesta de ADR y aprobación humana antes de implementarse"*. La **aprobación humana** existió y está registrada: la implementación estuvo autorizada explícitamente por el Product Owner mediante `LEF-BLOCK-VII-DEFINITION.md` (decisiones A-E y resoluciones DG-7 a DG-11) y mediante las aprobaciones incrementales de cada incremento, que los commits `4d7e85f2`, `5dcf7a3d`, `4084e904`, `9b032dec`, `a28946a8` y `72fc94fc` reflejan. Lo que **no** existió en su momento fue el **documento ADR** en el formato que el protocolo exige.
- Por lo tanto, este ADR **consolida formalmente decisiones ya tomadas** y satisface el protocolo documental **retroactivamente**. **No toma ninguna decisión de nuevo**, y no convalida retroactivamente el orden del protocolo: deja constancia de que el orden fue definición → implementación → ADR, y no ADR → implementación.
- La auditoría de §13.8 detectó la ausencia como el hallazgo bloqueante del punto 17 del criterio de cierre. El Product Owner resolvió ese Decision Gate con la **Opción B**: crear este ADR como documento formal, con estado `APROBADA` e indicando el Nivel de decisión según §11.9.

## Alcance de la aprobación — este ADR no cierra el bloque

El estado `APROBADA` de este documento significa exactamente esto y nada más: **la redacción y el registro formal de este ADR fueron autorizados explícitamente por el Product Owner** en la sesión de trabajo de §13.8, al resolver con **Opción B** el Decision Gate abierto por el punto 17 del criterio de cierre (`LEF-BLOCK-VII-DEFINITION.md` §13.8: *"Existe un ADR aprobado que registra el modelo editorial adoptado y su nivel de decisión (protocolo Master Context 11.9)"*).

**Nota separada, y deliberadamente fuera del campo Estado**: que ADR-0023 esté `APROBADA` **NO significa que el Bloque VII esté cerrado**. Son **dos actos de aprobación distintos**. El cierre del bloque depende de `LEF-BLOCK-VII-CLOSURE-REPORT.md`, que se mantiene en estado **PROPUESTO — pendiente de aprobación final del Product Owner**, y que solo el Product Owner puede aprobar. Este ADR satisface **una** de las veintiuna condiciones de §13.8 (el punto 17); las demás se verifican en el Closure Report.

## Validación de integridad (verificada antes de escribir este ADR, sin modificar nada)

- `LEF-BLOCK-VII-DEFINITION.md`, `LEF-BLOCK-VII-AUDIT.md` y `LEF-BLOCK-VII-EDITORIAL-AUDIT.md`: **sin modificar**.
- Los cuatro lectores de §11.1 y `apps/mobile`: diff **vacío** entre `8df7e2b` y `HEAD`.
- Gate consolidado `verify:lef-block-vii-gate` (commit `1d2bcdf`): **681/681** comprobaciones (663 de I1-I6 + 18 estáticas transversales), exit 0, **cero llamadas reales a Anthropic**.
- Gates por incremento: I1 103/103, I2 87/87, I3 117/117, I4 137/137, I5 100/100, I6 119/119.
- Este ADR no introduce ningún check automatizado nuevo y ningún gate del repositorio verifica la existencia de un ADR (comprobado: ningún `scripts/verify-*.mjs` ni `apps/backend/scripts/verify-*.ts` lee `docs/adr/`).
