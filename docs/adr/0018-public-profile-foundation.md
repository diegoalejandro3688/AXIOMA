# ADR 0018 — Public Profile Foundation e identidad competitiva (Bloque II, Learning Experience Foundation)

- **Estado**: **Aprobada e implementada — incremento "Public Profile Foundation" cerrado formalmente junto con el Bloque II (2026-08-03).** Aprobada con precisiones obligatorias del Product Owner: visibilidad privada por defecto, forma canónica de username, nombres reservados contra suplantación institucional, y separación formal de estados oculto/retirado/anonimizado. Gate propio (`verify:public-profile-gate`) en PASS -- ver "Validación" y `docs/adr/BLOCK-II-CLOSURE-REPORT.md`.
- **Fecha**: 2026-08-03
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation, Bloque II ("Progresión visible"), incremento **Public Profile Foundation** — posterior a la progresión visible (niveles/rachas/logros) y previo al cierre formal del bloque.
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce una entidad nueva (`public_profile`) dentro de un dominio ya validado y en producción (USER, ADR-0008), resuelve un Decision Gate documental pendiente desde el propio Data Model, y establece el prerrequisito estructural de datos del que dependerán el Bloque III (Gamificación Avanzada) y el Bloque IV (Competir).

## Contexto

Durante la auditoría del orden de bloques de Learning Experience Foundation (previa a definir formalmente el Bloque II) se encontró que `leaderboard_entry` (Competir, Data Model §16.23) y `equipped_title`/`equipped_cosmetic` (Gamificación Avanzada, §16.17/§16.35) no se indexan por `account_id` sino por **`public_profile_id`** — una entidad del dominio USER (§6.5), no de GAMIFICATION. `public_profile` no existe hoy en el esquema real (`prisma/schema.prisma` no tiene ningún modelo `PublicProfile`); ADR-0008 la dejó explícitamente fuera de alcance de M1 ("perfil público — Fase 4, fuera de alcance"). El Data Model, además, deja abierta una pregunta que cae directamente sobre esta entidad (línea 3902): *"¿Será obligatorio crear un username durante el onboarding o solo al ingresar por primera vez a Juego?"*

Sin resolver esto ahora, el Bloque III y el Bloque IV llegarían al mismo punto muerto que detuvo la implementación del Bloque I por el Outbox (ADR-0017) — solo que aquí el prerrequisito ya es visible antes de empezar, no un descubrimiento a mitad de camino. Por decisión explícita del Product Owner, `public_profile` se trata como un incremento propio dentro del Bloque II ("Public Profile Foundation"), no como un bloque nuevo del roadmap (se mantienen los 8 bloques) ni como un adelanto de "Perfil Avanzado" (Bloque V), cuyo propósito es distinto: consolidar y presentar lo que los bloques anteriores produzcan, no proveer la primitiva de identidad en sí.

Este ADR resuelve, para esa primitiva: el disparador de creación, la política de username, la privacidad predeterminada, la reversibilidad, la coordinación con el cierre de cuenta, y la frontera exacta con Perfil Avanzado.

## Decisión

### 1. Disparador de creación: perezoso, en el primer ingreso a Competir

Se evaluaron tres opciones:

| Opción | Evaluación |
|---|---|
| **Obligatoria en onboarding** | Descartada. Forzaría a todo estudiante — incluidos quienes nunca usarán Competir — a elegir username/avatar antes de poder estudiar. Contradice el minimalismo deliberado de ADR-0008 (que ya redujo el onboarding al mínimo estrictamente pedido) y el principio del Kickoff §3.2 ("ninguna funcionalidad podrá incorporarse únicamente por incrementar el tiempo de uso") — no hay beneficio de aprendizaje en pedir un username antes de que el estudiante lo necesite. |
| **Bajo demanda genérico (cualquier disparador futuro)** | Descartada por ahora, no por principio. Diseñar múltiples puntos de entrada (Competir, equipar un título, ver un ranking) simultáneamente sería sobre-ingeniería contra el roadmap real: este incremento no construye equipamiento ni rankings (ver "Frontera" más abajo), así que hoy solo existe un punto de entrada real. La decisión no cierra la puerta a más disparadores — el mecanismo se diseña como servicio idempotente reutilizable (ver más abajo), no acoplado a una pantalla. |
| **Primer ingreso a Competir (elegida)** | El estudiante recibe la fricción de elegir identidad pública exactamente cuando demuestra intención de participar en algo público — nunca antes. Consistente con Data Model §6.18 (invariante 149: "un perfil público nunca puede existir sin un perfil privado válido") y con el propio lenguaje del Data Model, que ya usa "Juego"/"Competir" como el contexto natural de esta pregunta (línea 3902). |

**Implementación**: `UserService.ensurePublicProfile(accountId)` — método idempotente de dominio, no un handler de pantalla. Se invoca desde el punto de entrada a Competir; si ya existe un `public_profile` (en cualquier `lifecycle_status`, ver sección 4) para la cuenta, es un no-op. Este diseño deja preparado, sin rediseño posterior, que un futuro flujo de equipamiento de títulos (cuando el Bloque III lo construya) invoque el mismo método antes de permitir "equipar" — evita reabrir esta decisión cuando llegue ese bloque.

**Precisión del Product Owner**: la creación automática al entrar a Competir resuelve únicamente la *existencia* del registro — nunca su *exposición*. `ensurePublicProfile` crea el `public_profile` con `visibility_status = PRIVATE` incondicionalmente. Aparecer en un ranking o cualquier superficie pública exige una acción afirmativa y separada del estudiante (ver sección 3). Entrar a Competir nunca hace, por sí solo, que un estudiante se vuelva visible a otros.

### 2. Política de username

Resuelve la especificación operativa que ADR-0008 dejó pendiente y cumple Data Model §6.6:

- **Longitud**: 3–20 caracteres (más corto que `display_name` de ADR-0008 — 2–40 — porque es una identidad pública deliberadamente elegida, no un nombre libre).
- **Charset**: ASCII alfanumérico + guion bajo (`[a-zA-Z0-9_]`). Se excluye Unicode deliberadamente — no por limitación técnica sino porque Data Model §6.6 exige validar contra suplantación, y un charset amplio habilita homoglifos (`а` cirílica vs `a` latina) que dificultan esa validación. Ninguna funcionalidad de Learning Experience Foundation requiere username con acentos o alfabetos no latinos.
- **Forma única, siempre minúsculas**: no se mantienen dos formas del username (una "de presentación" con mayúsculas y otra normalizada para unicidad). El sistema almacena y muestra **una sola forma canónica**: NFC + minúsculas. Un estudiante que escribe `AxiomaUser` obtiene y ve `axiomauser` en toda superficie — no existe `username_original` con casing preservado. Se elige esta opción (frente a mantener casing de presentación) por simplicidad (Kickoff §3.6: menor complejidad cuando el resultado educativo es equivalente) y porque preservar casing separado del canónico es precisamente el vector que facilita confundir `Admin` con `admin` en superficies públicas — el propio requisito de "validar contra suplantación" de Data Model §6.6 se cumple mejor eliminando esa distinción, no gestionándola.
- **Moderación mínima**: lista de bloqueo interna de términos ofensivos, verificada en el mismo paso de validación. Se documenta explícitamente como política mínima, no como sistema de moderación con ML/servicio externo — consistente con Kickoff §3.6; una moderación más sofisticada queda como deuda técnica **diferida**, no bloqueante, sin fecha comprometida.
- **Nombres reservados (distinto de la moderación de contenido ofensivo)**: un registro separado y permanente de nombres que ningún estudiante puede reclamar, independientemente de si son ofensivos — protege contra suplantación de cuentas oficiales, administrativas o de marca interna de Axioma. Incluye, como mínimo: `admin`, `administrator`, `axioma`, `soporte`, `support`, `staff`, `equipoaxioma`, `moderador`, `moderator`, `sistema`, `system`, `root`, `oficial`, `official`, `axiomateam`, `axiomaoficial`, y las formas normalizadas de `Competir`/`Juego`/`Estudio` (nombres de secciones internas del producto, ADR-0009). Esta lista es de **denegación absoluta** — no expira, no tiene ventana de reserva porque nunca estuvo disponible, y se gestiona como configuración versionada (no hardcodeada en el validador), para poder ampliarla sin nuevo ADR.
- **Frecuencia de cambio**: un cambio cada 30 días. Mismo orden de magnitud que el plazo de gracia ya establecido en ADR-0005 (30 días) — no es coincidencia, es reutilizar un período ya validado por el producto en vez de inventar uno nuevo sin justificación.
- **Ventana de reserva**: un username liberado (por cambio o por retiro del perfil) no queda disponible para otra cuenta hasta 30 días después — mismo período, mismo motivo: evitar apropiación inmediata de identidad (Data Model §6.6: "los nombres anteriores no deben quedar inmediatamente disponibles si eso permite suplantación").
- **No exposición del identificador interno**: el username es una cadena elegida por el estudiante, nunca derivada de `account_id`/`public_profile_id` — invariante 150 del Data Model se cumple por construcción, no por validación adicional.
- Todo cambio queda registrado en `profile_username_history` (append-only, nunca se sobrescribe ni se borra una fila existente).

### 3. Privacidad predeterminada

**Corrección obligatoria del Product Owner respecto al diseño inicial**: `public_profile` se crea **siempre** con `visibility_status = PRIVATE`. Entrar a Competir crea el registro pero no expone nada — el estudiante puede jugar/practicar en modos que no requieran aparecer ante otros sin haber decidido nada todavía sobre su visibilidad.

- `visibility_status = PRIVATE` al nacer, sin excepción. No existe una ruta de creación que produzca `VISIBLE` directamente.
- Pasar a `VISIBLE` requiere una **acción afirmativa explícita** del estudiante (p. ej. un toggle "Aparecer en rankings", nunca una casilla premarcada ni un consentimiento implícito por el mero uso). Esa acción es en todo momento **reversible** por autoservicio, sin fricción ni intervención de soporte, en cualquier dirección (`VISIBLE → PRIVATE` y `PRIVATE → VISIBLE` son igual de simples).
- Mientras `visibility_status = PRIVATE`: el `public_profile` existe (el estudiante ya tiene username reservado, puede practicar dentro de Competir), pero no aparece en ningún ranking, no es candidato de emparejamiento visible a otros, y no puede ser referenciado por `leaderboard_entry`.
- Los campos que **podrán** exponerse una vez que el estudiante decida hacerse visible siguen limitados a la lista blanca de Data Model §6.5 (username, avatar, XP/nivel visible, posición) — ninguno es dato personal sensible.

Quedan **reafirmados** como prohibidos, sin excepción, los campos que Data Model §6.5 ya lista: correo, fecha de nacimiento, ubicación precisa, institución educativa, puntajes diagnósticos, respuestas incorrectas, materias con bajo desempeño, dominio por tema, recomendaciones, objetivos de puntaje, historial de estudio, estado de suscripción. `public_profile` no tiene columnas para ninguno de estos — no es una restricción de acceso, es una restricción de esquema.

### 4. Reversibilidad y estados formales

`public_profile` no es un libro mayor (a diferencia de `xp_ledger_entry`, ADR-0016) — es un registro de identidad mutable. Se definen **dos atributos de estado independientes**, deliberadamente no fusionados, porque responden a preguntas distintas ("¿se muestra?" vs. "¿existe activamente?"):

**`visibility_status`** — presentación, siempre reversible por el propio estudiante:
- `PRIVATE` (default al crear) — existe, no se muestra.
- `VISIBLE` — aparece en superficies competitivas autorizadas.

**`lifecycle_status`** — existencia del registro, no controlado por el estudiante en el sentido inverso (no es un toggle libre):
- `ACTIVE` — estado normal, independientemente de `visibility_status`.
- `RETIRED` — el registro se excluye de **toda** superficie pública sin importar `visibility_status` (equivalente a forzar `PRIVATE` y bloquear el toggle), el username entra en ventana de reserva. Se activa exclusivamente por coordinación desde PRIVACY (sección 5), nunca por el estudiante directamente ni como resultado de ocultar su visibilidad. **Reversible** si la cuenta se reactiva dentro de la ventana de reactivación ya definida para `Account` (Data Model §23.40) — al reactivarse, `lifecycle_status` vuelve a `ACTIVE` con `visibility_status = PRIVATE` (nunca se restaura `VISIBLE` automáticamente; requiere una nueva acción afirmativa).
- `ANONYMIZED` — terminal, no reversible. Se activa cuando la anonimización de cuenta se completa realmente (no cuando solo se solicita). El username queda liberado (tras su ventana de reserva) y `avatar_reference` se limpia.

**Precisión obligatoria del Product Owner**: ocultar la visibilidad (`VISIBLE → PRIVATE`) es una operación exclusivamente de `visibility_status` — **nunca** toca `lifecycle_status`, nunca dispara `RETIRED`/`ANONYMIZED`, y nunca afecta datos de GAMIFICATION (XP, nivel, rachas, logros — todos indexados por `account_id`, en un dominio separado que este ADR no toca). Ocultar el perfil no borra ni retira progreso académico ni motivacional bajo ninguna circunstancia; solo deja de mostrarse a otros.

- **Username**: reversible solo dentro de los límites ya fijados (frecuencia de cambio, ventana de reserva) — un estudiante puede volver a un nombre anterior únicamente si nadie más lo reclamó durante la ventana de reserva y el nombre no está en el registro de nombres reservados (sección 2). Todo el historial queda auditable en `profile_username_history`, nunca se pierde.
- **Creación atómica**: no existe estado intermedio "perfil creado sin username confirmado". `ensurePublicProfile` valida y reserva el username en el mismo paso transaccional que crea el registro (con `visibility_status = PRIVATE`, `lifecycle_status = ACTIVE`) — evita perfiles huérfanos si el estudiante abandona el flujo a mitad de camino.

### 5. Eliminación coordinada

Seguimos el mismo patrón de capas que ADR-0005 ya estableció y validó: `PrivacyService` **nunca** toca `public_profile` directamente — coordina llamando a un método público del dominio propietario. Se añade `UserService.retirePublicProfile(accountId)`, invocado por el barrido de cierre de `PrivacyService` (el mismo que hoy llama a `AuthService.finalizeAccountClosure`) cuando una `PrivacyRequest` completa su plazo.

`retirePublicProfile` opera sobre `lifecycle_status` (sección 4), no sobre `visibility_status` — un perfil retirado queda excluido de toda superficie pública independientemente de si el estudiante lo tenía visible u oculto:
- Cuando `PrivacyRequest` pasa a `PROCESSING`/queda agendada: `lifecycle_status → RETIRED`. Excluido de toda superficie pública (leaderboard, equipamiento futuro, cualquier proyección). El username **no** se libera todavía en este punto — solo cuando el cierre se confirma (ver siguiente paso), para que una cancelación de la solicitud (ADR-0005 ya contempla cancelación dentro del plazo) pueda restaurar `ACTIVE` sin haber perdido el nombre.
- Cuando `PrivacyRequest` se completa realmente (`finalizeAccountClosure`, anonimización efectiva, no solo solicitada): `lifecycle_status → ANONYMIZED`. Recién aquí se libera el username, con la **misma ventana de reserva de 30 días** que un cambio normal — evita que un ciclo de cierre/reapertura de cuenta se use para apropiarse de un nombre ajeno. `avatar_reference` se limpia.
- Ninguna de las dos transiciones borra `profile_username_history` (clasificado "operacional restringido" en Data Model §6.16, sujeto a las mismas reglas de retención que el resto del dominio USER, no a borrado inmediato) ni toca ninguna tabla de GAMIFICATION.

Esta llamada se construye **como parte de este mismo incremento**, no como deuda diferida — evita repetir el patrón de ADR-0017 (una pieza de infraestructura compartida que se descubre rota cuando ya es tarde). Data Model §23.39 ya lista "retiro del perfil público" como paso explícito del cierre coordinado de cuenta; este ADR es lo que lo hace real.

### 6. Frontera exacta con Perfil Avanzado (y con Bloques III/IV)

| Dentro de este incremento (ADR-0018) | Fuera — pertenece a bloques posteriores |
|---|---|
| `public_profile` (identificador, username, avatar_reference, flags de visibilidad) | Rankings / `leaderboard_entry` poblado (Bloque IV — Competir) |
| `profile_username_history` | Historial competitivo, resultados de competencias (Bloque IV) |
| Creación perezosa (`ensurePublicProfile`) | Títulos/insignias equipados (`equipped_title`, `equipped_cosmetic` — Bloque III) |
| Retiro coordinado con cierre de cuenta | Estadísticas públicas, elementos visuales de personalización (Bloque V — Perfil Avanzado) |
| Política de username (charset, moderación mínima, frecuencia, reserva) | Cualquier UI de "página de perfil" |

`public_profile` es la primitiva de identidad; "Perfil Avanzado" es la funcionalidad de producto que la consume junto con Gamificación Avanzada y Competir para consolidar una vista completa (Kickoff §5.3). Este ADR no construye esa vista.

## Alternativas descartadas

- **Onboarding obligatorio** — ver tabla de la sección 1.
- **Múltiples disparadores de creación desde el inicio** — descartada por sobre-ingeniería contra el alcance real de este incremento; el diseño (`ensurePublicProfile` idempotente) no impide añadir disparadores futuros sin rediseño.
- **Reserva de username permanente (nunca liberar un nombre)** — descartada, sin necesidad demostrada a la escala actual del producto; complejiza sin beneficio medible (Kickoff §3.6).
- **Moderación de username con servicio externo o ML** — descartada para V1; una lista de bloqueo mínima cumple el requisito documental sin introducir una dependencia externa nueva ni coste operativo.
- **Charset Unicode completo para username** — descartada por el riesgo de homoglifos frente al requisito explícito de Data Model de validar contra suplantación.
- **`public_profile` visible por defecto al crearse (diseño inicial de este ADR, corregido por el Product Owner)** — descartada. Aunque entrar a Competir es una señal de intención, no equivale a consentir exposición pública; conflar ambas cosas habría requerido revertir esta decisión en cuanto el primer estudiante preguntara "¿por qué me ven sin haberlo decidido?". La corrección no añade complejidad estructural (mismo campo, mismo default distinto) y sí evita retrabajo.
- **Un único campo de estado combinando visibilidad y ciclo de vida** — descartada. Fusionar "¿se muestra?" con "¿existe activamente?" habría hecho im­posible expresar "oculto pero con progreso intacto" sin una enumeración combinatoria frágil (`PRIVATE_ACTIVE`, `VISIBLE_RETIRED`, etc.); dos atributos ortogonales son más simples de razonar y de validar (Kickoff §3.6).

## Consecuencias

- USER (ADR-0008) gana una tabla nueva (`public_profile`, `profile_username_history`) sin modificar `UserProfile`/`student_profile` existente — no reabre ADR-0008.
- El Bloque III y el Bloque IV pueden asumir que existe un mecanismo (`ensurePublicProfile`) para obtener o crear la identidad pública de una cuenta, pero **no** pueden asumir que toda cuenta ya tiene una — deben manejar explícitamente el caso "cuenta sin `public_profile` todavía" (nunca entró a Competir).
- El Decision Gate documental del username (Data Model, línea 3902) queda resuelto: creación perezosa en el primer ingreso a Competir, no obligatoria en onboarding.
- `PrivacyService` (ADR-0005) gana una llamada de coordinación nueva hacia `UserService` en su barrido de cierre, sin tocar `public_profile` directamente — mismo patrón de capas ya validado, sin excepciones nuevas.
- Ningún cambio a AUTH, PROGRESS ni GAMIFICATION.
- Este incremento **no** implementa rankings, historial competitivo, títulos equipados, cosméticos ni estadísticas públicas ni Perfil Avanzado — explícitamente fuera de alcance por instrucción directa del Product Owner, reafirmado en esta revisión.
- `public_profile` nace `visibility_status = PRIVATE` / `lifecycle_status = ACTIVE` siempre — ninguna ruta de creación produce un perfil visible por defecto.
- El registro de nombres reservados es configuración versionada, no código embebido — puede ampliarse (nuevas marcas, nuevos roles internos) sin nuevo ADR, siempre que no cambie la política en sí.

## Validación

**Completa — incremento cerrado (2026-08-03).** Los ocho Decision Gates, todos con evidencia real (`verify:public-profile-gate`, servidor compilado corriendo contra Postgres real, más CLI real de recuperación):

1. **Unicidad de `username_normalized` bajo concurrencia real** — PASS. Verificado con dos cuentas distintas disputando el mismo username (una 201, la otra 409) y con `createWithHistory`/`changeUsernameWithHistory` capturando `P2002` explícitamente.
2. **Ningún campo prohibido alcanzable** — PASS. Verificado comparando las claves EXACTAS de la respuesta HTTP contra la lista blanca de Data Model §6.5 (sin `avatarReference` ni ningún campo interno).
3. **`ensurePublicProfile` idempotente, nace `PRIVATE`/`ACTIVE`** — PASS. Segundo `POST` con un username distinto devuelve 200 sin modificar el perfil existente; verificado explícitamente que el estado inicial es `PRIVATE`/`ACTIVE`, nunca otro valor.
4. **Reversibilidad de visibilidad en ambas direcciones** — PASS. `PRIVATE → VISIBLE → PRIVATE` verificado de extremo a extremo, sin intervención de soporte.
5. **Cambio de username: frecuencia, ventana de reserva, nombres reservados** — PASS, con una corrección real de diseño durante la validación (ver "Incidencias" abajo): la ventana de reserva de 30 días se **implementó de verdad** (no quedó como deuda diferida) consultando `profile_username_history` en el momento de reclamar/cambiar un username — verificado que el username anterior de una cuenta que cambió de nombre sigue bloqueado para terceros dentro de la ventana.
6. **Retiro/reactivación/anonimización coordinados con `PrivacyService`** — PASS, con una precisión real sobre el diseño original: `retirePublicProfileForAccountClosureRequest` se invoca al **solicitar** el cierre (`requestAccountDeletion`), no en el barrido — el perfil queda `RETIRED` de inmediato, sin esperar el plazo de 30 días; `anonymizePublicProfileForAccountClosure` sí se invoca desde el barrido, al completarse realmente el cierre. Verificación estática confirma que `privacy.service.ts` nunca importa `PublicProfileRepository` ni referencia `prisma.publicProfile` — coordina exclusivamente vía los tres métodos públicos de `UserService`.
7. **Ocultar visibilidad no modifica `lifecycleStatus` ni GAMIFICATION** — PASS. Verificado alternando visibilidad varias veces y confirmando que `lifecycleStatus` permanece `ACTIVE` y que `xp_balance` no registra ninguna fila nueva ni modificada.
8. **Reactivación restaura `ACTIVE`/`PRIVATE`, nunca `VISIBLE`** — PASS, verificado con el CLI real de recuperación de cuentas (`dist/cli/recover-account.js`, mismo mecanismo que ADR-0005).

Gate consolidado del incremento: `verify:public-profile-gate` -- **PASS**. Sin regresión en `verify:privacy-gate`, `verify:user-gate`, `verify:gamification-schema-gate`, `verify:gamification-integration-gate`, `verify:gamification-xp-grant-gate` (cada uno corrido contra un servidor recién iniciado, mismo criterio de aislamiento por proceso que M1). Detalle completo, incidencias y evidencia consolidada del bloque: `docs/adr/BLOCK-II-CLOSURE-REPORT.md`.
