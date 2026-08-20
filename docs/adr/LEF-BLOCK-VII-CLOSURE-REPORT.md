# LEF Block VII Closure Report — Plataforma Editorial

**Fecha del reporte**: 2026-08-20
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: VII de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-VII-DEFINITION.md` (definición contractual completa, decisiones A-E y resoluciones DG-7 a DG-11), `docs/adr/0023-plataforma-editorial.md` (ADR del modelo editorial adoptado, creado durante este cierre — ver §14), `docs/adr/LEF-BLOCK-VII-EDITORIAL-AUDIT.md` y `docs/adr/LEF-BLOCK-VII-AUDIT.md` (evidencia previa, intactas), `docs/adr/LEF-BLOCK-VI-CLOSURE-REPORT.md`, `docs/adr/LEF-BLOCK-V-CLOSURE-REPORT.md`, `docs/adr/0012-education-foundation.md`, `0014-progress-foundation.md`, `0004-identity-authentication-foundation.md`, `0005-privacy-foundation.md`, `0002-renderizador-matematico.md`, `0016-gamificacion-fundacion.md`, `0022-proveedor-ia-tutor.md`.

**Estado final**: **APROBADO / CERRADO** — aprobado explícitamente por el Product Owner el 2026-08-20, sobre la base de la propuesta y la evidencia registradas en §18 (texto exacto de la propuesta) y ratificadas en §19. La aprobación no reescribe ni reinterpreta ninguna cifra, deuda ni evidencia histórica de este reporte.

> **Nota de honestidad editorial**. Este reporte registra el camino real, no una versión saneada de él. Incluye deliberadamente: el diferimiento parcial de `ADMIN-002` (sin MFA, sin simularlo), el periodo de retención del `AdminActor` sin fijar, los fixtures históricos anómalos con sus números reales, los números reales de uso de la excepción de `CMS-018` **declarados explícitamente como actividad de gate y desarrollo, con cero uso productivo**, la divergencia de nombre del gate del Incremento 2, las actualizaciones de aserciones temporales de gates durante el bloque, la saturación del rate limiter que obligó a una instancia de backend por gate, y el hecho de que **ADR-0023 se creó durante el cierre, no antes de la implementación**. Nada de eso se omite ni se reencuadra para que el cierre parezca más limpio.

---

## 1. Objetivo del bloque

Definido en `LEF-BLOCK-VII-DEFINITION.md` §2: hacer que el contenido académico de Axioma pueda **crearse, revisarse, aprobarse, publicarse, corregirse y retirarse** por un actor administrativo identificable, con auditoría atribuible, **sin editar código, sin ejecutar SQL manual contra producción y sin desplegar una nueva versión de la aplicación móvil** — sobre una base en la que la inmutabilidad de la versión publicada esté **aplicada por PostgreSQL**, no solo declarada en prosa.

Fuente contractual de "Plataforma Editorial" (Kickoff Fase 2 §2.2): *"Herramientas destinadas a facilitar la administración y evolución del contenido educativo, permitiendo mantener la calidad del material sin modificar la arquitectura central construida durante M1."* Y §5.2: *"Estas capacidades estarán orientadas al equipo de desarrollo y administración, no al usuario final."*

Encuadre de tamaño, no negociable (MC §8.14): *"La primera herramienta administrativa deberá ser pequeña y controlada. No necesita convertirse en un CMS completo."*

## 2. Motivación y alcance

**Por qué era necesario** (Definition §2, §5.1; auditoría editorial): no existía ninguna ruta de escritura editorial —publicar o retirar exigía SQL manual—; no existía ningún actor administrativo, de modo que `OQ-029` estaba resuelta pero era inaplicable; `DM-D102` (*"toda versión publicada será inmutable"*) estaba declarado en prosa y **ningún mecanismo lo aplicaba**; y la unicidad de versión publicada por identidad se cumplía **por accidente estructural**.

**Dentro de alcance, construido y verificado**: inmutabilidad de la versión publicada aplicada por PostgreSQL; unicidad de versión publicada por identidad aplicada por PostgreSQL; `AdminActor` individual separado de `Account`, con token personal hasheado/revocable/expirable; roles V1 `AUTHOR`/`PUBLISHER`; máquina de estados completa T1-T8 con auditoría append-only `admin_action`; `CMS-018` por identidad de actor con su excepción registrada; validaciones `CMS-013`; Content Coverage Matrix de solo lectura; y CLI interna como cliente HTTP puro.

**Fuera de alcance, confirmado como NO construido** (18 comprobaciones estáticas transversales del gate consolidado): aplicación web administrativa (`apps/` sigue conteniendo exactamente `backend` y `mobile`); vista previa `CMS-007`; importación masiva `CMS-026..029`; `SCHEDULED`/`CMS-021`; `ARCHIVED` alcanzable; `editorial_review`/`editorial_finding`; MFA/segundo factor; flag global de auto-aprobación; cualquier IA que cree o publique contenido; y cualquier escritura sobre `xp_ledger_entry`/`league_point_ledger_entry`.

## 3. Definición contractual

La norma del bloque es `LEF-BLOCK-VII-DEFINITION.md` (1036 líneas): objetivo (§2), alcance (§3), decisiones A-E del Product Owner (§4), resoluciones DG-7 a DG-11 (§4.1, §14), reconciliación con PRD/Data Model/Master Context/Kickoff (§5), preservación de decisiones previas (§6), **24 invariantes con su capa de verificación** (§7), máquina de estados y lista cerrada de transiciones (§8), modelo de `AdminActor`/roles/auditoría/token (§9), secuenciación obligatoria (§10), fronteras con EDUCATION/PROGRESS/Tutor IA/Privacy (§11), los seis incrementos (§12) y los gates y criterios de cierre (§13).

**Desde este cierre, la definición contractual se complementa con `docs/adr/0023-plataforma-editorial.md`**, que registra el modelo editorial adoptado y su **Nivel 2** de decisión conforme al protocolo de Master Context §11.9, satisfaciendo el punto 17 de §13.8. El ADR **no toma ninguna decisión nueva**: consolida las ya tomadas (§14 de este reporte).

## 4. Decision Gates — resumen y resolución (no se reabre ninguno)

### 4.1 Historia previa de numeración

`LEF-BLOCK-VII-AUDIT.md` usó **DG-1** (premisa "Bloque VII = Premium/Entitlements", **descartada** por el Product Owner; ese archivo permanece byte-idéntico como registro histórico de una rama cerrada). La auditoría editorial usó **DG-2 a DG-6**, cuyas resoluciones son exactamente las decisiones A-E.

### 4.2 Decisiones A-E (2026-08-15, primera ronda)

| # | Decisión | Resuelve | Resolución (síntesis) |
|---|---|---|---|
| **A** | Alcance del flujo editorial | DG-5 → Opción B | V1 implementa `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → DEPRECATED`. `SCHEDULED`/`CMS-021` fuera. `editorial_review`/`editorial_finding` diferidos (DM §9.21). `CMS-018` **verificable por el sistema**, no un acuerdo de proceso |
| **B** | Actor administrativo | DG-3 → Opción B | Actor separado de `Account`, identidad individual, auditoría atribuible. Solo **Autor** y **Publicador**. No reutilizar `InternalOpsGuard`, no añadir roles a `Account` |
| **C** | Inmutabilidad (`DM-D102`) | DG-4 → Opción A | **Triggers de PostgreSQL como autoridad final**; corregir = versión NUEVA; lista cerrada de transiciones sobre fila publicada, **sin excepción genérica**; **antes** de cualquier ruta editorial de escritura |
| **D** | Superficie (`OQ-028`) | DG-2 → Opción A | **API administrativa + CLI interna**, sin aplicación web nueva. `CMS-007` diferido formalmente. Resuelve `OQ-028` por primera vez en todo el proyecto |
| **E** | Importación / cobertura | DG-6 → Opción B | Content Coverage Matrix **dentro**, de solo lectura. Importación masiva `CMS-026..029` **diferida** |

### 4.3 Resoluciones DG-7 a DG-11 (2026-08-15, segunda ronda)

| Gate | Resolución | Materializada en |
|---|---|---|
| **DG-7** | Token personal por actor, nunca compartido, hasheado, revocable, expirable; **backend = única autoridad de identidad y rol**; sin Firebase, sin `InternalOpsGuard`, sin mezcla con `Account`; **`ADMIN-002` parcialmente diferido** (MFA) | I2 (`5dcf7a3d`), I6 (`72fc94fc`) |
| **DG-8** | **`ARCHIVED` fuera del flujo V1**; permanece en el enum histórico sin ruta que lo alcance; `DEPRECATED` terminal | I1 (`4d7e85f2`, trigger), I3 (`4084e904`, máquina de estados) |
| **DG-9** | `AdminActor` es clase de sujeto distinta de `Account`; **desactivación/revocación sin hard-delete**; atribución histórica preservada (FK `Restrict`); **periodo de retención EXPLÍCITAMENTE DIFERIDO** | I2 (`5dcf7a3d`) |
| **DG-10** | Prohibición de auto-aprobación como **regla normal**; excepción single-operator con **activación deliberada + actor registrado + motivo por uso**; tener ambos roles no autoriza nada | I3 (`4084e904`) |
| **DG-11** | **Índices únicos parciales** en PostgreSQL como autoridad final de "una sola versión `PUBLISHED` por identidad", **en el Incremento 1**, junto a la migración de inmutabilidad | I1 (`4d7e85f2`) |

### 4.4 Decisión adicional del Product Owner durante I1 (2026-08-15)

La inmutabilidad se extendió **permanentemente a `DEPRECATED`**: una versión que fue publicada es inmutable para siempre; `DEPRECATED` significa *"retirada del catálogo activo"*, nunca *"vuelve a ser editable"*. Registrada literalmente en el cuerpo del commit `4d7e85f2` como **decisión del Product Owner**, e implementada en la migración de I1. No relaja nada de la decisión C: la endurece.

### 4.5 Decision Gate de §13.8 punto 17 — resuelto durante este cierre

**Se preguntaba**: el punto 17 del criterio de cierre exige *"un ADR aprobado que registra el modelo editorial adoptado y su nivel de decisión (protocolo Master Context 11.9)"*, y ese ADR **no existía**. Era el único hallazgo bloqueante de la auditoría de §13.8.

**Resolución del Product Owner — Opción B**: crear `docs/adr/0023-plataforma-editorial.md` como ADR formal, con estado **APROBADA**, indicando explícitamente el Nivel de decisión según Master Context §11.9. Ejecutado en este cierre (§14).

**Qué NO autoriza**: no autoriza tomar ninguna decisión nueva en el ADR; no autoriza afirmar que el ADR existía antes de la implementación; y **no equivale a aprobar el cierre del bloque**, que sigue siendo un acto separado del Product Owner sobre este reporte.

**Numeración**: la Definition (nota de numeración de Decision Gates) establece que un gate nuevo dentro de este bloque tomaría el número **DG-12**. Este es ese gate. Se aplica la regla ya escrita; no se crea una convención nueva.

## 5. Los seis incrementos realizados

| # | Incremento | Commit | Gate | Checks |
|---|---|---|---|---|
| — | Definición del bloque | `8df7e2b` | — | — |
| 1 | **Invariantes de publicación** — 5 triggers de inmutabilidad (`PUBLISHED` y `DEPRECATED`) + 2 índices únicos parciales, en una sola migración | `4d7e85f2` | `verify:education-published-immutability-gate` | **103/103** |
| 2 | **Identidad administrativa** — `admin_actor`, `admin_actor_role`, `admin_actor_token`, `admin_access_log` append-only; `AdminAuthGuard`/`AdminRoleGuard`; bootstrap por CLI | `5dcf7a3d` | `verify:admin-identity-gate` | **87/87** |
| 3 | **Transiciones auditadas** — T4..T8, `admin_action` append-only con trigger, `CMS-018` por identidad de actor y su excepción auditada | `4084e904` | `verify:editorial-transitions-gate` | **117/117** |
| 4 | **Autoría y publicación versionada** — T1/T2/T3, `CMS-013`, corrección por versión nueva, render de fórmulas al escribir | `9b032dec` | `verify:editorial-authoring-gate` | **137/137** |
| 5 | **Content Coverage Matrix** — `GET` único, solo lectura, agregación en `education/` | `a28946a8` | `verify:content-coverage-matrix-gate` | **100/100** |
| 6 | **CLI interna** — `src/cli/editorial.ts`, cliente HTTP puro, ciclo editorial completo sin SQL ni edición de código | `72fc94fc` | `verify:editorial-cli-gate` | **119/119** |
| — | **Gate consolidado del bloque** (§13.7) | `1d2bcdf` | `verify:lef-block-vii-gate` | **681/681** (663 + 18 estáticas) |

**Detalle por incremento**:

- **I1 (`4d7e85f2`)** — Migración `20260815120000_lef_vii_i1_published_immutability_uniqueness`. Cinco triggers `plpgsql` sobre `question_version`, `learning_resource_version` y `answer_option` implementando la lista cerrada de §8.4, **sin ningún bypass, session flag ni modo mantenimiento**; dos índices únicos parciales (`question_version_one_published_per_question`, `learning_resource_version_one_published_per_resource`). El gate incluye **control positivo anti-falso-negativo**, concurrencia real, sustitución transaccional old→new, orden inverso fallido y rollback/atomicidad. Adaptó `seed.ts` y 7 gates de Bloques I/III/IV/V al orden compatible `DRAFT → alternativas → publicar` — infraestructura de prueba, **ninguna aserción funcional cambiada**. Cero endpoints, cero entidades nuevas, cero cambios de enum.
- **I2 (`5dcf7a3d`)** — Dominio ADMINISTRATION. Token de 256 bits de `randomBytes`, almacenado solo como SHA-256; el valor en claro existe únicamente en la emisión. Sin dependencias npm nuevas. `AdminAuthGuard` (cabecera `X-Admin-Token`, 401 uniforme), `AdminRoleGuard` + `@RequireAdminRole` (403). Bootstrap por CLI `create-admin-actor`, **sin endpoint de auto-registro**, con expiración obligatoria como argumento. `GET /administration/me`. `sanitize.ts` redacta token y hash en logs. `admin_action` **diferida deliberadamente a I3**, por no existir todavía ninguna operación editorial productiva que auditar.
- **I3 (`4084e904`)** — T4..T8 con motivo obligatorio en T4, T6 y T8 autónomo. Toda transición fuera de la lista —incluido cualquier destino `ARCHIVED`— recibe **rechazo explícito de la máquina de estados**, no un 404. La capa administrativa **solicita**; EDUCATION valida y ejecuta (`education/editorial-transition.service.ts`). T7 despliega el retiro implícito de la versión publicada previa como una T8 propia con su propio registro. `admin_action` con los nueve campos de §9.3, `operation_id` único y trigger `admin_action_immutable`.
- **I4 (`9b032dec`)** — T1/T2/T3 añadidas a la **misma** máquina de estados (una sola lista cerrada), sin alterar T4..T8. `CMS-013` como módulo puro y precondición dura de T3. Crear en `PUBLISHED` **no es representable**. Sin migraciones: reutiliza íntegramente las tablas de EDUCATION. Todo el contenido del gate se crea por la API real, sin fixtures sembradas por SQL, incluyendo el flujo completo T1→T2→T3→T5→T7 y una corrección posterior que preserva la versión anterior **byte-idéntica** y el `StudentResponse` histórico intacto.
- **I5 (`a28946a8`)** — `GET /administration/editorial/coverage-matrix`, autorizado para `AUTHOR` y `PUBLISHER`. Cinco consultas de agregación fijas, sin N+1. La agregación vive en `education/`; la fachada HTTP en su propio módulo, separada de la superficie de escritura de I3/I4 — la separación de módulo es en sí misma parte de la garantía verificable. Sin migraciones, sin entidades nuevas, sin registro en `admin_action` (leer no cambia nada).
- **I6 (`72fc94fc`)** — `src/cli/editorial.ts`: no importa repositorios ni Prisma, no abre conexión a la base, no levanta Nest, no ejecuta SQL, no acepta `INTERNAL_OPS_KEY` y **no contiene ninguna comprobación de rol propia**. Expone todos los comandos con independencia del rol: filtrar por rol en el cliente sería la autorización propia que la Definition prohíbe. Sin endpoints nuevos, sin cambios de schema, sin tocar `apps/mobile`.

**Hallazgo contractual registrado en I6**: la Definition §12 define exactamente **seis** incrementos. **No existen Incrementos 7/8** dentro de Bloque VII; su mención en sesiones previas fue un error de interpretación del kickoff, nunca una implementación. No se documenta como desviación ni se modifica la Definition.

## 6. Arquitectura final

- **Dominio ADMINISTRATION** (`apps/backend/src/administration/`): identidad, token, roles, guards, registro de accesos, `admin_action`, activación de la excepción de `CMS-018`. Tablas con prefijo `admin_*`.
- **Fachada editorial** (`apps/backend/src/editorial/`): controllers HTTP bajo `administration/editorial`, **sin ninguna decisión de dominio**. El módulo de la Coverage Matrix es un módulo separado del de escritura.
- **Dominio EDUCATION** (`apps/backend/src/education/`): máquina de estados (`editorial-transition.service.ts`), autoría (`editorial-authoring.service.ts`/`.repository.ts`), validaciones (`cms013-content-validation.ts`), agregación de cobertura (`content-coverage.service.ts`/`.repository.ts`). **EDUCATION es la autoridad de publicación** (MC §6.24, invariante 15).
- **PostgreSQL como autoridad final**: triggers de inmutabilidad, índices únicos parciales, y triggers de inmutabilidad de `admin_access_log` y `admin_action`. Ninguna de esas garantías depende de la validación de servicio.
- **CLI** (`apps/backend/src/cli/`): `create-admin-actor`, `activate-cms018-exception`, `editorial` — todos internos; el editorial es cliente HTTP puro.
- **Contratos** (`packages/contracts/src/`): `administration.ts`, `editorial.ts`, `content-coverage.ts`, añadidos de forma aditiva. Zod sigue siendo la autoridad de la forma del JSON (ADR-0012 punto 4).
- **Migraciones del bloque**: `20260815120000_lef_vii_i1_published_immutability_uniqueness`, `20260815160000_lef_vii_i2_admin_actor_identity`, `20260815200000_lef_vii_i3_editorial_transitions`. I4, I5 e I6 **no añadieron ninguna migración**.

## 7. `AdminActor` y autenticación

- **Separación real**: tabla propia, **sin FK hacia `Account`**; `Account` no ganó ningún campo de rol; `AuthGuard` e `InternalOpsGuard` sin cambios (este último sigue vigente para sus seis usos actuales, sin capacidad editorial alguna).
- **Token personal** (DG-7): 256 bits, hash SHA-256, emisión/expiración/revocación; el valor en claro nunca se persiste. Rechazo por defecto: sin token, token desconocido, revocado, expirado, actor desactivado, o actor sin el rol requerido.
- **Backend como única autoridad de rol**: ningún cliente —CLI incluido— envía ni decide un rol.
- **Ciclo de vida** (DG-9): desactivación y revocación, **nunca hard-delete**; FK `Restrict` desde el registro hacia el actor, de modo que la propia base rechaza cualquier borrado que rompiera la atribución histórica.
- **`ADMIN-002`: PARCIALMENTE satisfecho.** Satisfecho: cuenta individual no compartida, autenticación por secreto hasheado, revocable, expirable, auditada. **Diferido: verificación adicional / segundo factor para operaciones críticas.** No se simuló ningún sustituto. **Un cierre que declarara `ADMIN-002` satisfecho sería incorrecto** (Definition §13.8 punto 15-quater).

## 8. Inmutabilidad y versionado

- **Modelo**: identidad lógica estable (`Question`/`LearningResource`) → versión (`QuestionVersion`/`LearningResourceVersion`), tal como `DM-D101`/ADR-0012 ya lo fijaron. Bloque VII lo **consume**, no lo sustituye.
- **Inmutabilidad permanente** de `PUBLISHED` **y** `DEPRECATED` (§4.4), aplicada por trigger: ningún `UPDATE`/`INSERT`/`DELETE` altera una versión que alcanzó publicación, **ni siquiera por SQL directo**. `answer_option` protegida resolviendo el estado de su versión padre, incluidos `INSERT` y `DELETE`.
- **Corregir = publicar versión nueva.** La anterior permanece íntegra y referenciable; el `StudentResponse` histórico conserva `isCorrect` y su alternativa.
- **Unicidad por identidad**: índices únicos parciales; como un índice parcial no admite diferimiento al `COMMIT`, la transacción de T7 escribe **primero** `PUBLISHED → DEPRECATED` sobre la anterior y **después** `APPROVED → PUBLISHED` sobre la nueva. El gate de I1 demuestra que el orden inverso falla.
- **`ARCHIVED`**: permanece en el enum, ninguna ruta lo produce, y el trigger rechaza `PUBLISHED → ARCHIVED` de forma permanente.

## 9. T1-T8, `admin_action`, `CMS-018` y `CMS-013`

- **T1-T8**: lista cerrada, sin T9, `DEPRECATED` terminal en V1. Roles: T1/T2/T3 exclusivas del Autor; T5/T6/T7/T8 del Publicador; T4 del Publicador o del Autor que envió la versión. El Publicador **no** crea ni edita contenido, ni siquiera en `DRAFT` (menor privilegio, `ADMIN-004`).
- **`admin_action`**: nueve campos de §9.3, escrito **dentro de la misma transacción** que aplica el efecto, con `operation_id` único (idempotencia, MC §8.19) y **append-only aplicado por PostgreSQL**. Guarda la referencia al objeto, **nunca una copia del contenido académico**.
- **`CMS-018`**: enforcement por **identidad de actor**. La excepción se activa **fuera de banda por CLI** (`cli:activate-cms018-exception`), **nunca por HTTP**; es acotada a su versión, revocable, **no es un flag global**; exige motivo por uso; alcanza exclusivamente a T5 y T7; y produce un evento distinguible y consultable con **ambos** actores, expuesto en `GET /administration/editorial/cms018-exception-uses`. Con la excepción activa, los invariantes de inmutabilidad y unicidad siguen aplicándose sin cambio.
- **Uso real de la excepción — número exacto y su naturaleza**: **20 activaciones y 40 usos**, **originados exclusivamente en corridas de gate y en desarrollo**. **Cero uso productivo real.** Se registra el número porque §13.8 punto 18 (iii) lo exige, y se declara su naturaleza porque presentarlo como actividad editorial productiva sería falso.
- **`CMS-013`**: clasificación completa, explicación presente, mínimo estructural de 2 alternativas, exactamente una correcta, sin duplicados. **Sin cota superior**, por decisión explícita: ninguna fuente contractual cerrada la fija y no se inventó una; queda como decisión futura no bloqueante para el Product Owner.

## 10. Content Coverage Matrix y CLI

- **Matriz** (I5): un solo `@Get` en todo el archivo del controller; ni `@Post`, ni `@Put`, ni `@Patch`, ni `@Delete`. No expone `isCorrect`, ni contenido académico, ni ningún dato de estudiante. No calcula cobertura curricular PAES oficial (la taxonomía de `CMS-001` no existe en el esquema), ni errores frecuentes, ni prácticas disponibles.
- **CLI** (I6): ciclo editorial completo —crear, editar, enviar a revisión, aprobar con actor distinto, publicar, corregir publicando versión nueva y retirar— **sin una sola sentencia SQL manual y sin editar ningún archivo de código**, verificado por su gate contra el backend real.

## 11. Integración con dominios existentes — nada cambió su comportamiento observable

**Evidencia verificada al redactar este reporte** (`git diff 8df7e2b..HEAD`, salida vacía en los seis archivos): los cuatro lectores de contenido de §11.1 quedaron **byte-idénticos** entre el commit de la Definition y `HEAD`.

| Lector | Archivos | Diff |
|---|---|---|
| `EducationService` (catálogo) | `education.service.ts`, `learning-resource-version.repository.ts`, `question-version.repository.ts` | **vacío** |
| `ProgressService` | `progress.service.ts` | **vacío** |
| `QuickQuestionService` | `quick-question.service.ts` | **vacío** |
| `AiAcademicContextBuilder` (Bloque VI) | `ai-academic-context-builder.service.ts` | **vacío** |

`apps/mobile`: diff **vacío** en todo el bloque. El estudiante ve el contenido publicado **sin ningún despliegue móvil** (invariante 13).

- **EDUCATION**: Bloque VII escribe; la ruta de lectura no cambia. El efecto de publicar sobre el denominador de `countPublishedByTopicId` ya estaba en el diseño de ADR-0014, se declaró en la Definition §11.1 y **no se corrige aquí**.
- **PROGRESS**: beneficiario, no participante. `StudentResponse` sigue inmutable por su propio trigger y sus FK `Restrict`.
- **Quick Question**: comportamiento existente confirmado (`ConflictException` ante una sesión en curso sobre contenido retirado), no modificado.
- **Tutor IA (Bloque VI, cerrado)**: sale **reforzado sin cambiar nada** — la inmutabilidad impide que una conversación anclada a `contextQuestionVersionId` razone sobre un enunciado distinto del que el estudiante vio. Ni el builder, ni el esquema `ai_*`, ni los prompts, ni `verify-ai-answerkey-isolation-gate.ts` se tocaron.
- **Privacy (ADR-0005)**: intacto y sin extensión. El `AdminActor` es una clase de sujeto distinta; ninguna operación de este bloque lee, exporta ni enmascara datos de estudiante.

## 12. Gate consolidado (§13.7)

`scripts/verify-lef-block-vii-gate.mjs`, entrada `verify:lef-block-vii-gate` en `package.json`. Orquestador, no reimplementación: encadena los seis gates de incremento **sin duplicar sus 663 aserciones** y añade **18 comprobaciones estáticas transversales** de no-alcance que ningún gate de incremento puede hacer por su cuenta.

Orden: I1 (sin backend, habla con Postgres directo) → I2..I6 (cada uno con **instancia propia** de backend en su propio puerto) → regresión completa LEF I-VI encadenada vía `verify-lef-block-vi-gate.mjs` → 18 estáticas.

| Resultado de la corrida de cierre (commit `1d2bcdf`) | Valor |
|---|---|
| Comprobaciones totales | **681/681** (663 + 18) |
| Corridas consecutivas completas | **2** |
| Fallos | **0** — exit 0 |
| Llamadas reales a Anthropic | **0**, verificado contra el ledger real (186 filas `anthropic`, timestamp idéntico antes y después) y por introspección de provider en cada gate |

Protocolo de coste cero en tres capas e identidad de proceso verificada por introspección antes de cada gate con backend, siguiendo el patrón ya establecido en Bloques V y VI.

**No se actualizó `verify:learning-experience-foundation-gate`**: ese puntero se mueve únicamente durante el cierre formal, siguiendo el precedente del cierre de Bloque VI. El diff correspondiente (alias del bloque más reciente) está **preparado y NO aplicado**; es una propuesta para cuando el Product Owner apruebe el cierre.

## 13. Incidencias reales del bloque (sin maquillar)

1. **Fixture heredado de `verify-progress-gate.ts` — +1 fila anómala por corrida.** Cada corrida del consolidado deja una `question_version` `PUBLISHED` **sin `answer_option`**. Origen: el fixture de Bloque III necesita una versión publicada sin alternativas para probar que el progreso `COMPLETED` no retrocede, y I1 vuelve esas filas **imborrables por diseño**. **Sin vínculo causal con Bloque VII**: ninguna de esas filas tiene `admin_action` asociado, y `CMS-013` rechaza ese estado por la API editorial. **No corregido en este cierre** — corregir el aislamiento del fixture heredado es trabajo sobre Bloque III y no se acomete aquí (commit `1d2bcdf`).
2. **7 versiones `PUBLISHED` preexistentes sin `answer_option`** (2026-08-15/16, **previas** a este trabajo), que pueden hacer fallar de forma **intermitente** un check no relacionado del gate de I3 cuando Pregunta rápida las selecciona al azar (~**2,6 %** de probabilidad por corrida). Origen preexistente demostrado por timestamp y clave. **No se borró, editó ni deprecó contenido publicado para "limpiarlo"** (commit `a28946a8`).
3. **Saturación del rate limiter.** El rate limiting de `/auth/session` es **por proceso**; encadenar gates contra una única instancia de backend producía **falsos rojos por saturación del limitador in-memory**. Mitigación adoptada, la misma que en todos los bloques anteriores: **una instancia de backend por gate, en su propio puerto** (3181-3185), documentada en el propio gate consolidado.
4. **MathJax — SVG de error tratado como LaTeX inválido.** Las fórmulas se renderizan server-side con `renderLatexToSvg()` al escribir; durante I4 se estableció explícitamente que **un SVG de error de MathJax se rechaza como LaTeX inválido, nunca se acepta como prueba de validez** (commit `9b032dec`). Se registra porque el modo de fallo silencioso —persistir un SVG de error como si fuera contenido válido— era real.
5. **Actualizaciones de aserciones temporales de gates durante el bloque.** I3, I4, I5 e I6 actualizaron aserciones de gates anteriores que afirmaban la **ausencia** de un incremento posterior ("no existe módulo editorial", "el Incremento 5 no está construido", etc.). Cada actualización quedó marcada como `ACTUALIZACIÓN LEGÍTIMA` en el propio gate y sustituida por una sucesora **más fuerte**, sin pérdida de cobertura ni de número de checks (I1 se mantuvo en 103, I2 en 87, I3 en 117). La garantía **permanente** de ausencia de importación masiva se separó explícitamente como garantía tipo A y **no se tocó**. Se declara aquí porque tocar gates históricos siempre merece constancia, aunque en este caso no fuera una relajación funcional.
6. **Divergencia nominal del gate de I2.** La Definition §12.2/§13.2 nombra `verify:admin-actor-gate`; el gate real se llama `verify:admin-identity-gate`. Es divergencia **de nombre, no de cobertura** (87/87, los doce criterios de §13.2 verificados). **No se corrige en este cierre**.
7. **Resolución del Decision Gate del ADR (§4.5).** La auditoría de §13.8 encontró que el punto 17 no estaba satisfecho: no existía ningún ADR del modelo editorial. Fue el único hallazgo bloqueante del cierre. Se resolvió con Opción B del Product Owner, creando `0023-plataforma-editorial.md` **durante el cierre** (§14).

## 14. Nota obligatoria sobre ADR-0023 — se creó durante el cierre, no antes

`docs/adr/0023-plataforma-editorial.md` **no existía antes de I1** ni en ningún punto de la implementación de I1-I6. Se creó **durante §13.8**, sobre una implementación ya completada, para satisfacer **retroactivamente** el protocolo documental de Master Context §11.9.

Lo que **sí** existió en su momento fue la **autorización explícita del Product Owner**: `LEF-BLOCK-VII-DEFINITION.md` (decisiones A-E y resoluciones DG-7 a DG-11) más las aprobaciones incrementales de cada incremento, reflejadas en los commits `4d7e85f2`, `5dcf7a3d`, `4084e904`, `9b032dec`, `a28946a8` y `72fc94fc`. Lo que faltaba era el **documento** en el formato que el protocolo exige.

ADR-0023 fija el **Nivel 2** de decisión, derivado punto por punto contra el texto real de §11.9 (cambios de contrato, estructuras de persistencia, autenticación, autorización, límites entre dominios, cambios que afectan varias capacidades), y declara además que las decisiones de **alcance** del bloque —A-E y DG-7 a DG-11— fueron Nivel 3 y ya las tomó el Product Owner, sin que el ADR las retome.

**El ADR no toma ninguna decisión nueva**, y su estado `APROBADA` se refiere exclusivamente a su propia redacción y registro formal, autorizados por el Product Owner al resolver el Decision Gate de §13.8 punto 17 con Opción B. **No implica que el bloque esté cerrado.**

## 15. Deudas explícitas y clasificación

| # | Deuda | Clasificación | Detalle |
|---|---|---|---|
| 1 | **`ADMIN-002` parcialmente satisfecho** — verificación adicional / segundo factor para operaciones críticas | **DIFERIDA con fuente (DG-7, §9.6)** | El mecanismo mínimo de token es un único factor. No se inventó ni se simuló un sustituto. `OQ-030` reduce la superficie (contenido normal no lo exige) pero **no la elimina**: nombra los cambios de respuesta correcta como caso de alto riesgo, y este bloque los hace posibles |
| 2 | **Retención del `AdminActor` desactivado, sin plazo** | **DIFERIDA por ausencia de fuente contractual (DG-9, §11.4)** | No se reutilizaron los 90 días del Tutor IA ni se asumió ADR-0005. Consecuencia aceptada: la identidad de personas que ya no forman parte del equipo permanece almacenada, desactivada y sin caducidad. Fijar el número será una decisión de **política**, no de ingeniería |
| 3 | **Excepción de `CMS-018` — 20 activaciones y 40 usos** | **No bloqueante — actividad de gate y desarrollo, CERO uso productivo real** | Números exigidos por §13.8 punto 18 (iii). Provienen de las corridas de verificación de I3, I6 y el consolidado. **No representan ninguna publicación editorial productiva bajo excepción** y no deben leerse como tal |
| 4 | **Fixture heredado de `verify-progress-gate.ts`: +1 fila anómala por corrida** | **No bloqueante, sin vínculo causal con Bloque VII** | §13.1; origen en Bloque III. No corregido aquí |
| 5 | **7 versiones `PUBLISHED` preexistentes sin `answer_option`** (~2,6 % de flakiness en un check de I3) | **No bloqueante, origen preexistente demostrado** | §13.2. No se manipuló contenido publicado para limpiarlas |
| 6 | **Divergencia nominal del gate de I2** (`verify:admin-actor-gate` vs. `verify:admin-identity-gate`) | **No bloqueante — nombre, no cobertura** | §13.6. No corregida aquí |
| 7 | **`CMS-013` sin cota superior de alternativas** | **Decisión futura no bloqueante, no inventada** | Ninguna fuente contractual cerrada la fija (commit `9b032dec`) |
| 8 | **Sin autoría de taxonomía `CMS-001`** (taxonomía PAES completa) | **DIFERIDA — no existe en el esquema** | Definition §5.2, ADR-0012 |
| 9 | **Sin subida de imágenes** en la superficie editorial | **DIFERIDA — fuera del alcance de §3** | Definition §3, §5.2 |
| 10 | **`CMS-007` — vista previa** | **DIFERIDA formalmente** | Decisión D |
| 11 | **Importación masiva `CMS-026..029`** | **DIFERIDA** | Decisión E, `OQ-028`, MC `master_context.txt:6558` |
| 12 | **Ausencia de ADR del modelo editorial (§13.8 punto 17)** | **RESUELTA en este cierre** | `docs/adr/0023-plataforma-editorial.md`, estado `APROBADA`, Nivel 2 (§14). Era la única deuda bloqueante |

**Ninguna de las once primeras deudas está clasificada como bloqueante del cierre. La duodécima era la única bloqueante y quedó resuelta.**

## 16. Requisitos diferidos (registro, no revocación)

Siguiendo el criterio de la Definition §5.3 —*diferir la implementación nunca es revocar el requisito*—: `CMS-007` (vista previa); `ADMIN-002` verificación adicional; periodo de retención del `AdminActor`; `ARCHIVED` como estado alcanzable; `CMS-021`/`SCHEDULED`/`catalog_availability`; `editorial_review`/`editorial_finding` y las cinco dimensiones de `DM-D113`; `CMS-026..029` (importación) y `CMS-028` (exportación); los cuatro roles restantes de `ADMIN-003`; taxonomía PAES completa de `CMS-001`; `EXAM-001..005`; `MOD-001..003`; `SUPPORT-001..004`; `ADMIN-005..018`; la Open Question `datamodel.txt:6875` (*"¿qué roles pueden aprobar exactitud académica y accesibilidad?"*), que **permanece abierta**; y la delegación de ADR-0019 (concesión manual de ítems / `REVERSED`), que **no se revoca**.

**Ninguno de estos requisitos se elimina del contrato.**

## 17. Confirmación: ningún sistema cerrado fue reabierto

Verificado al cierre: los cuatro lectores de §11.1 y `apps/mobile` con diff **vacío** entre `8df7e2b` y `HEAD`; `AuthGuard`, `Account`, `InternalOpsGuard` y el pipeline de ADR-0005 sin cambios; Bloque VI (Tutor IA) intacto, incluidos prompts y `verify-ai-answerkey-isolation-gate.ts`; `xp_ledger_entry` y `league_point_ledger_entry` sin ninguna escritura de este bloque; el enum `EditorialStatus` sin ganar `SCHEDULED` ni perder `ARCHIVED`; ADR-0022, DG-1 y Gate C5 intactos; `LEF-BLOCK-VII-AUDIT.md` y `LEF-BLOCK-VII-EDITORIAL-AUDIT.md` byte-idénticas; y la regresión completa LEF I-VI en PASS dentro del consolidado. **Bloque VIII no se inició.**

## 18. Estado final propuesto

> **LEF Bloque VII — Plataforma Editorial: APROBADO / CERRADO**
>
> **— PROPUESTO — pendiente de aprobación final del Product Owner.**
>
> Se propone declarar el Bloque VII **APROBADO / CERRADO** sobre la base de: los seis incrementos implementados y gateados individualmente (I1 103/103, I2 87/87, I3 117/117, I4 137/137, I5 100/100, I6 119/119); el gate consolidado `verify:lef-block-vii-gate` en **PASS** de extremo a extremo con **681/681** comprobaciones, exit 0, en dos corridas consecutivas completas y con **cero llamadas reales a Anthropic**; la regresión completa LEF I-VI en PASS encadenada dentro de él; las decisiones A-E y las resoluciones DG-7 a DG-11 implementadas sin reinterpretación silenciosa; el punto 17 de §13.8 satisfecho por `docs/adr/0023-plataforma-editorial.md` (estado `APROBADA`, Nivel 2 según Master Context §11.9); y las once deudas de §15, **ninguna clasificada como bloqueante**.
>
> **`ADMIN-002` se declara PARCIALMENTE satisfecho, no satisfecho**: la verificación adicional / segundo factor para operaciones críticas queda **diferida explícitamente**. El periodo de retención del `AdminActor` queda **diferido sin número**. La excepción de `CMS-018` registra **20 activaciones y 40 usos, exclusivamente de gate y desarrollo, con cero uso productivo real**. `ADR-0023` **se creó durante este cierre, no antes de la implementación**, y satisface el protocolo documental de §11.9 de forma retroactiva sobre decisiones ya autorizadas por el Product Owner.
>
> **Esta declaración es una PROPUESTA. El agente no aprueba el cierre de ningún bloque.** Que `ADR-0023` esté `APROBADA` **no** cierra el Bloque VII: son dos actos de aprobación distintos, y el cierre requiere la aprobación final explícita del Product Owner sobre este reporte. Hasta entonces, el estado del bloque es **PROPUESTO**, `verify:learning-experience-foundation-gate` **no** se actualiza para apuntar a Bloque VII, no se crea ningún tag y Bloque VIII **no** se inicia.

## 19. Estado final (aprobado)

> **APROBADO / CERRADO — LEF Bloque VII (Plataforma Editorial).**
>
> El Product Owner declaró el Bloque VII **APROBADO / CERRADO** el 2026-08-20, sobre la base de la propuesta y la evidencia registradas íntegramente en §18 — sin alterar ninguna cifra, deuda ni decisión allí registrada: los seis incrementos implementados y gateados individualmente (I1 103/103, I2 87/87, I3 117/117, I4 137/137, I5 100/100, I6 119/119); el gate consolidado `verify:lef-block-vii-gate` en **PASS** de extremo a extremo con **681/681** comprobaciones, exit 0, en dos corridas consecutivas completas y con **cero llamadas reales a Anthropic**; la regresión completa LEF I-VI en PASS encadenada dentro de él; las decisiones A-E y las resoluciones DG-7 a DG-11 implementadas sin reinterpretación silenciosa; el punto 17 de §13.8 satisfecho por `docs/adr/0023-plataforma-editorial.md` (estado `APROBADA`, Nivel 2 según Master Context §11.9); y las once deudas de §15, ninguna clasificada como bloqueante — incluida, sin ambigüedad, `ADMIN-002` **parcialmente** satisfecho (verificación adicional/segundo factor diferida) y la retención del `AdminActor` desactivado diferida sin plazo.
>
> Con esta aprobación: `verify:learning-experience-foundation-gate` se actualiza para apuntar a `verify-lef-block-vii-gate.mjs` (commit separado, mismo criterio de alias fino usado en el cierre de Bloque VI); se crea el tag `lef-block-7-plataforma-editorial-complete`; y **LEF Bloque VIII no se inicia** con este cierre.
