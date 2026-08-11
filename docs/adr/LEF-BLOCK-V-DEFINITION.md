# Bloque V — Definición Formal: Perfil Avanzado

**Fecha**: 2026-08-10
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: V de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/0008-gestion-usuarios-perfil-basico.md`, `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0020-ranking-materializacion.md`, `docs/adr/0021-perfil-competitivo-cross-cuenta.md`, `docs/adr/BLOCK-III-DEFINITION.md`, `docs/adr/BLOCK-III-CLOSURE-REPORT.md`, `docs/adr/LEF-BLOCK-IV-DEFINITION.md`, `docs/adr/LEF-BLOCK-IV-CLOSURE-REPORT.md`, `docs/adr/0022-proveedor-ia-tutor.md` (registro histórico, no modificado — ver nota de reconciliación abajo), PRD §15 "Perfil", Master Context §4.12 "Arquitectura de Perfil", Data Model §6.5/§16.17/§16.33-16.35/§16.44
**Estado**: **CERRADO — ver `docs/adr/LEF-BLOCK-V-CLOSURE-REPORT.md`** (2026-08-11). Los ocho incrementos (§9-16) fueron implementados, gateados individualmente contra backend real y móvil, y verificados en conjunto por el gate consolidado `verify:lef-block-v-gate` (`scripts/verify-lef-block-v-gate.mjs`) en PASS limpio de extremo a extremo (2026-08-11) — encadena la regresión completa de LEF I-IV más los siete gates propios de este bloque. Checkpoints commiteados sin tag: Incremento 1 (`ffb338c`), Incremento 2 (`267f63c`), Incremento 3 (`920901b`), Incremento 4 (`52cfd24`), Incremento 5 (`9751da7`), Incremento 6 (`e7d0d12`), Incremento 7 (`a5c3cbd`), Incremento 8 (`c2cfb77`). `verify:learning-experience-foundation-gate` actualizado para apuntar a este bloque como el más reciente cerrado de la fase, mismo criterio que el cierre de Bloque IV. Ver el closure report para incidencias, deferrals y evidencia completa — no se duplican aquí.

**Nota de nomenclatura**: este documento y su futuro cierre usan el prefijo `LEF-` (`LEF-BLOCK-V-DEFINITION.md`, futuro `LEF-BLOCK-V-CLOSURE-REPORT.md`) porque `docs/adr/BLOCK-V-CLOSURE-REPORT.md` **ya existe**, perteneciente a un roadmap distinto y anterior (Fase 1 — Vertical Slice M1, "Bloque IV/V de V"). Mismo criterio ya aplicado en `LEF-BLOCK-IV-DEFINITION.md` (nota de nomenclatura, 2026-08-05): prefijo nuevo hacia adelante, historia cerrada intacta, sin renombrar nada retroactivamente.

**Nota de reconciliación de numeración (Product Owner, 2026-08-10)**: `docs/adr/0022-proveedor-ia-tutor.md` (línea 5, "Bloque V (\"Tutor IA: Fundación\")") queda **preservado sin modificación, byte-idéntico a su versión aprobada** — es registro histórico ya cerrado, y el Product Owner decidió explícitamente no reabrirlo ni enmendarlo para reconciliar la numeración. La reconciliación se documenta **únicamente aquí**: toda mención a "Bloque V" en ADR-0022 debe leerse, hacia adelante, como referencia anticipada al futuro **LEF Bloque VI — Tutor IA**. Esta definición ocupa el número V de forma definitiva, consistente con `BLOCK-II-DEFINITION.md` §3, `BLOCK-III-DEFINITION.md` §37/§66/§149 y `LEF-BLOCK-IV-DEFINITION.md`/`LEF-BLOCK-IV-CLOSURE-REPORT.md`. Cualquier documento posterior que se redacte para el futuro Bloque VI (Tutor IA) deberá repetir esta misma nota de reconciliación al citar ADR-0022, en vez de asumir que su numeración literal es correcta.

---

## 1. Definición formal del bloque

Perfil Avanzado consolida en una superficie coherente lo que hoy está construido pero disperso — perfil privado (ADR-0008), perfil público mínimo (ADR-0018), progresión y logros (Bloque I/III), cosméticos y títulos (Bloque III), ranking y perfil competitivo cross-cuenta (ADR-0020/0021) — y cierra las piezas de PRD §15 que ningún bloque anterior construyó: encabezado consolidado, estadísticas privadas, historial de actividad y competitivo, personalización con elementos bloqueados visibles, vista previa pública y control de visibilidad granular.

`ADR-0018` §6 ("Frontera exacta con Perfil Avanzado") ya fijó la línea: **rankings, equipamiento de cosméticos/títulos y su mecánica quedan fuera** (ya construidos, no se rediseñan); **estadísticas públicas, elementos de personalización visual e historial competitivo consolidado son de este bloque**. `BLOCK-III-DEFINITION.md` §149 ya diseñó el modelo de cosméticos multi-slot anticipando específicamente el consumo de Bloque V. Este bloque **integra y presenta sistemas existentes**; solo introduce persistencia nueva donde el PRD exige una capacidad que ningún sistema existente ya provee (ver §4.7, la única tabla nueva de todo el bloque).

El bloque se compone de **ocho incrementos** (§8) — orden y desglose ya sin decisión de producto bloqueante pendiente (§7).

## 2. Objetivo

Dar al estudiante una vista consolidada, verídica y controlable de sí mismo — quién es públicamente, qué ha logrado, cómo ha progresado, y qué de eso decide mostrar — sin introducir ninguna mecánica nueva de gamificación, ranking o cosméticos, y sin que la vista previa pública pueda mostrar algo distinto de lo que un tercero real vería (Master Context §4.12, PRD §15).

Este bloque **no** rediseña Gamificación (ADR-0016) ni Competir (ADR-0020/0021) — los consume tal cual quedaron cerrados y gateados. No reabre ADR-0008, ADR-0010, ni el diferimiento de la economía de cosméticos.

## 3. Alcance y exclusiones

**Dentro de alcance (PRD §15, Master Context §4.12)**:
- Encabezado de perfil consolidado: banner, avatar, username, título equipado, nivel, liga actual, insignias destacadas (selección acotada, no todos los logros públicos automáticamente).
- Resumen académico privado (progreso por materia, tiempo de estudio, precisión, ensayos, evolución reciente) — solo para el propio dueño de la cuenta.
- Resumen de actividad privado (racha, XP total, nivel, logros, historial de ligas).
- Historial competitivo cross-temporada (participaciones y resultados de temporadas ya finalizadas) — dato ya persistido de forma permanente por ADR-0020/`LEF-BLOCK-IV-DEFINITION.md` §9.8, sin superficie de consulta hasta ahora.
- Personalización: selector de elementos obtenidos + elementos bloqueados con su requisito de desbloqueo visible.
- Vista previa pública: el propio estudiante ve exactamente lo que un tercero vería a través de la superficie pública real (ADR-0021).
- Control de visibilidad granular para insignias destacadas (selección de cuáles logros públicos se muestran en el encabezado).
- Enmienda mínima de ADR-0021 para incluir `banner` en la lista blanca pública (gap ya identificado entre PRD PROFILE-006 y la implementación de ADR-0021 §2).

**Explícitamente fuera de alcance de este bloque**:
- Economía de cosméticos (moneda, tienda, `cosmetic_offer`, compra) — **deferral reafirmado formalmente** aquí, sin fecha ni bloque asignado, mismo criterio que `BLOCK-III-DEFINITION.md` §3 ("hasta que exista necesidad de producto demostrada").
- Subida real de avatar/banner por el usuario y provisión de Cloudflare R2 para contenido de usuario — permanece fuera de V1; Axioma sigue proveyendo únicamente assets ilustrados y controlados (ADR-0008/ADR-0010, sin reabrir).
- Cualquier nueva mecánica de XP, niveles, logros, títulos o cosméticos — se leen, nunca se recalculan ni se les añade comportamiento.
- Cualquier cambio a las reglas de cálculo de ranking, ascenso/descenso o desempate (ADR-0020) — se leen, nunca se alteran.
- Herramientas generales de reporte o moderación de contenido público — explícitamente excluidas por decisión del Product Owner (2026-08-10); este bloque no es un sistema de moderación.
- Tutor IA (Bloque VI) y Plataforma Editorial (Bloque VII) — dominios independientes.

## 4. Contradicciones y vacíos documentales

### 4.1 Numeración de bloque — resuelta

Ver nota de reconciliación al inicio de este documento. ADR-0022 permanece intacto (registro histórico ya cerrado, sin enmendar); la reconciliación de numeración vive exclusivamente en este documento.

### 4.2 Ausencia de un "Bloque" dedicado en el Data Model — vacío confirmado, sin resolver por completo

El Data Model no tiene una sección numerada para Perfil Avanzado — las entidades relevantes están dispersas entre Bloque 6 (Usuario/perfil, `public_profile` §6.5) y Bloque 16 (Gamificación, títulos/cosméticos §16.17/16.33-16.35). Este documento sintetiza ambas fuentes; no existe una especificación unificada que auditar de una sola vez. Confirmado, no bloqueante — el PRD §15 y Master Context §4.12 sí son específicos y suficientes como fuente de requisitos.

### 4.3 `banner` ausente de la lista blanca de ADR-0021 — vacío real, se resuelve en Incremento 1

PRD PROFILE-006 incluye "banner" en la información pública. ADR-0021 §2 (tabla de lista blanca, ya implementada) no lo incluye — omisión, no decisión deliberada (el slot `PROFILE_BANNER` ya existe en `CosmeticSlot` desde Bloque III, simplemente no se conectó al endpoint cross-cuenta porque ADR-0021 se diseñó antes de que existiera este bloque). Se resuelve con una enmienda mínima y explícita de ADR-0021 §2 (Incremento 1, §9) — no se reabre ninguna otra parte de ese ADR.

### 4.4 Propiedad del historial competitivo cross-temporada — vacío heredado de Bloque IV, resuelto aquí por decisión del Product Owner

`0018-public-profile-foundation.md` §6 asignó originalmente "historial competitivo, resultados de competencia" a Bloque IV. El cierre de Bloque IV (`LEF-BLOCK-IV-CLOSURE-REPORT.md`) confirma que solo se construyó una proyección de temporada activa (`leaderboard_entry`) y una instantánea de cierre (`leaderboard_snapshot`) — ninguna superficie de consulta histórica cross-temporada. Como Bloque IV está cerrado y no se reabre, el Product Owner decidió (turno anterior de esta misma conversación) que la superficie de consulta de ese historial ya persistido entra en Bloque V (Incremento 4, §12). **Precisión importante**: el dato ya existe y ya es permanente (`SeasonLeagueParticipation.finalRank`/`leaguePoints` y `LeaderboardSnapshot`/`LeaderboardSnapshotEntry` nunca se borran, `LEF-BLOCK-IV-DEFINITION.md` §9.8) — este bloque construye solo la superficie de lectura, no nueva persistencia, y no reabre ni modifica ninguna regla de cálculo de Bloque IV.

### 4.5 Visibilidad pública vs. privada del historial competitivo — RESUELTO (Product Owner, 2026-08-10)

**Decisión cerrada**: el historial competitivo cross-temporada es **PRIVADO en V1** — únicamente el propietario de la cuenta puede consultarlo (Incremento 4, endpoint "me", sin excepción). La superficie pública (ADR-0021, enmendado por Incrementos 1-2) **no** se extiende para exponer historial completo — mantiene exclusivamente los datos competitivos ya autorizados por su whitelist vigente/enmendada (posición y liga de la temporada activa, más `banner`/`featuredAchievements` de este bloque). Ninguna versión pública, resumida o parcial del historial cross-temporada se construye en este bloque. Esta decisión ya no es un vacío — cierra §4.5 sin dejar alternativa abierta.

### 4.6 Límite de insignias destacadas — RESUELTO (Product Owner, 2026-08-10)

**Decisión cerrada**: máximo **3** insignias destacadas por cuenta, mínimo 0 (ninguna es válido). El límite es un valor fijo de dominio (no configurable por el usuario ni por el catálogo), reforzado por trigger de conteo máximo (§10, mismo patrón que `enforce_league_group_capacity`). **Poseer una insignia (`AchievementUnlock`) y destacarla (`public_profile_featured_achievement`) son conceptos distintos y desacoplados**: la posesión determina qué es *elegible* para destacar, la selección determina qué se *muestra*; ningún logro poseído se muestra automáticamente por el solo hecho de estar desbloqueado. Nunca se puede destacar un logro no obtenido — invariante ya reflejada en el diseño del Incremento 2 (§10), ahora sin depender de confirmación futura.

### 4.7 Única persistencia nueva de todo el bloque — confirmación explícita

Auditados PRD §15, Master Context §4.12 y el esquema actual (`schema.prisma`), la única capacidad requerida que ningún dato ya persistido puede servir es: **"qué logros públicos destaca el estudiante en su encabezado, y en qué orden, hasta un máximo de 3"** (PROFILE-001/008, §4.6) — hoy la whitelist de ADR-0021 expone automáticamente *todos* los logros con `visibilityClass = PUBLIC`, sin curación por parte del estudiante. Todo lo demás (estadísticas, historial, banner, personalización con bloqueados) es lectura pura sobre datos ya existentes. Esta es la única tabla nueva de todo el bloque (Incremento 2, §10) — decisión deliberada de minimizar persistencia nueva, consistente con el principio de este bloque (§1).

### 4.8 Elementos bloqueados y su "requisito de desbloqueo" — método de resolución RESUELTO, resultado pendiente de auditoría del catálogo real (Product Owner, 2026-08-10)

PRD PROFILE-004 exige mostrar elementos no obtenidos junto a su requisito de desbloqueo. **Criterio cerrado por el Product Owner**: el requisito mostrado debe ser **determinista y derivado de datos/contratos ya existentes** — nunca texto hardcodeado arbitrariamente en mobile. El procedimiento exacto para el Incremento 6 (§14) queda fijado en dos pasos obligatorios, en este orden:

1. **Auditar primero** el catálogo y los mecanismos de recompensa ya existentes (`reward_grant`, definiciones de `ChallengeDefinition`/`AchievementDefinition`/`TitleDefinition`/`CosmeticItem` y su regla de entrega, Bloque III) para determinar si el requisito de obtención de cada ítem es derivable de forma determinista desde datos/contratos ya presentes.
2. **Si es derivable** → reutilizar esa fuente tal cual, sin persistencia nueva, sin ADR.
   **Si no es derivable** → detenerse antes de tocar esquema o contratos y proponer al Product Owner la extensión mínima necesaria (posible campo de metadato presentable) para su aprobación explícita, antes de implementar nada.

No se inventa aquí ni el campo nuevo ni el resultado de esa auditoría — ambos quedan como el primer paso obligatorio del diseño detallado del Incremento 6, con el catálogo real delante (§14).

## 5. Decision Gates

Gates ya fijos a nivel de bloque, por estar determinados en esta definición (gates finos por incremento se detallan en cada sección de diseño, §9-16):

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Ninguna regla de cálculo de Competir cambia | Regresión completa de los gates de ADR-0020 (`rankPosition`/`metricValue`/ascenso-descenso) sin alteración, ejecutada contra backend real tras cada incremento de este bloque. |
| 2 | Ninguna mecánica nueva de Gamificación | Verificación estática: ningún archivo de este bloque escribe en `xp_ledger_entry`, `league_point_ledger_entry`, `account_title`, `inventory_item` — solo lectura. |
| 3 | Sin economía de cosméticos | Verificación estática: ninguna tabla de moneda, oferta o compra aparece en la migración de este bloque (§3, exclusión reafirmada). |
| 4 | Sin subida de archivos de usuario | Verificación estática: ningún endpoint de este bloque acepta upload de imagen; `avatarReference`/`assetReference` siguen siendo asignados exclusivamente por catálogo controlado por Axioma. |
| 5 | Vista previa pública es idéntica a la superficie pública real | La respuesta de "vista previa" (Incremento 7) para la propia cuenta es byte-idéntica (mismas claves, mismos valores) a la respuesta que obtendría un tercero autenticado consultando el mismo `username` a través del endpoint de ADR-0021/ADR-0021-enmendado. |
| 6 | Sin herramientas de reporte/moderación nuevas | Verificación estática: ningún endpoint ni entidad de reporte, denuncia o sanción se introduce en este bloque. |
| 7 | Regresión consolidada LEF I-IV | `verify:block-IV-gate` (o el gate consolidado vigente que encadene Bloques I-IV) sigue en PASS después de cada incremento de este bloque. |

## 6. ADR

**No requiere ADR nuevo.** Ningún incremento introduce un patrón arquitectónico nuevo (ni bounded context nuevo, ni modelo de consistencia nuevo, ni patrón de autorización nuevo):

| Mecanismo usado | Ya aprobado en |
|---|---|
| Selección acotada con límite fijo, reforzada por trigger de conteo máximo | `enforce_league_group_capacity` (Bloque IV, `LEF-BLOCK-IV-DEFINITION.md` §9.3) — mismo patrón, aplicado a una tabla nueva |
| Enmienda mínima de un ADR ya aprobado, sin reabrir sus otras decisiones | Ya practicado en este mismo proyecto (`0006-analytics-foundation.md` enmendado por ADR-0017). **Nota**: para ADR-0022 el Product Owner decidió explícitamente no aplicar este patrón — se preserva intacto como registro histórico; la reconciliación de numeración vive solo en este documento (ver nota inicial) |
| Endpoint privado "me" agregando datos ya calculados de otros dominios | `PublicProfileController`/`CompetitiveProfileService` (ADR-0021 §4) — mismo patrón de composición en capa de presentación de USER |
| Lectura de datos históricos ya persistidos, sin nueva regla de cálculo | `LeaderboardSnapshot`/`SeasonLeagueParticipation` ya construidos por ADR-0020, solo se les añade una superficie de consulta |

La enmienda a ADR-0021 (§9, §10) se documenta como enmienda formal dentro de ese mismo archivo al implementar, mismo criterio que las enmiendas ya practicadas en este proyecto — no como ADR independiente.

## 7. Pendientes

§4.5 (privacidad del historial) y §4.6 (límite de insignias destacadas) están **resueltos** por el Product Owner (2026-08-10) — sin pendiente. §4.8 (requisito de desbloqueo) tiene el **método** de resolución resuelto (auditar primero, extender solo si es estrictamente necesario y con aprobación previa); el **resultado** de esa auditoría contra el catálogo real es el primer paso obligatorio del diseño detallado del Incremento 6 (§14), no un pendiente de decisión de producto. Evidencia de validación y gates finos por incremento se añaden a medida que cada incremento se implementa — no se fabrican aquí antes de tener código real que validar.

## 8. Incrementos propuestos (confirmados — sin decisión de producto bloqueante pendiente)

| # | Incremento | Contenido | Depende de |
|---|---|---|---|
| **1** | Enmienda ADR-0021 — banner en whitelist pública | Expone `banner` (slot `PROFILE_BANNER`, ya existente) en el endpoint cross-cuenta y en las filas de ranking. | ADR-0021, Bloque III (cosméticos) |
| **2** | Visibilidad granular — insignias destacadas | Nueva tabla `public_profile_featured_achievement` (única persistencia nueva del bloque, §4.7), máximo **3** por cuenta, mínimo 0 (§4.6). Endpoint privado de selección/orden. Enmienda de la whitelist pública para exponer la selección junto a `publicAchievements`. | Incremento 1, ADR-0021, Bloque III (logros) |
| **3** | Resumen académico privado | Endpoint "me" que agrega progreso por materia, tiempo de estudio, precisión, ensayos — solo lectura de PROGRESS. | Bloque I/III (PROGRESS ya existente) |
| **4** | Historial competitivo cross-temporada | Endpoint "me" de solo lectura sobre `SeasonLeagueParticipation`/`LeaderboardSnapshot` ya persistidos. **PRIVADO, sin excepción (§4.5)** — la superficie pública no se extiende. | Bloque IV (ADR-0020), sin reabrirlo |
| **5** | Vista consolidada de perfil propio (encabezado + integración) | Ensambla Incrementos 1-4 + datos ya existentes de Gamificación/Competir en una sola superficie de backend. | Incrementos 1-4 |
| **6** | Personalización con elementos bloqueados | Extiende catálogo/inventario (Bloque III) para incluir ítems no poseídos + requisito de desbloqueo determinista y derivado de datos/contratos (§4.8: auditar primero, extender solo si es estrictamente necesario, con aprobación previa del Product Owner). | Bloque III (catálogo/inventario) |
| **7** | Vista previa pública | Reutiliza el endpoint público real (ADR-0021 enmendado) para que el propio usuario vea exactamente lo que vería un tercero (Gate 5, §5). | Incrementos 1-2, ADR-0021 |
| **8** | Superficie móvil | Reemplaza/expande `perfil.tsx` con las capacidades reales de 1-7: encabezado, estadísticas, historial, personalización, vista previa. | Incrementos 1-7 |

**Sin decisión de producto bloqueante pendiente para iniciar el Incremento 1.** El único punto que conserva un paso de trabajo antes de tocar esquema es §4.8 (Incremento 6): el resultado de auditar el catálogo real es parte del propio diseño detallado del Incremento 6, no una decisión de producto pendiente — y si esa auditoría concluyera que hace falta un campo nuevo, el procedimiento ya fijado exige detenerse y proponer al Product Owner antes de implementar, no bloquea el inicio de los Incrementos 1-5, 7 y 8.

---

## 9. Diseño — Incremento 1: Enmienda ADR-0021, banner en whitelist pública

**Objetivo**: cerrar el gap entre PRD PROFILE-006 y la implementación real de ADR-0021 §2, exponiendo el banner ya equipable (Bloque III, slot `PROFILE_BANNER`) en la superficie pública cross-cuenta.

**Alcance**: enmienda mínima y explícita de ADR-0021 §2 (tabla de lista blanca) añadiendo una fila `banner`. Aplica tanto al endpoint de consulta directa (`GET .../competitive-profile`) como a la forma completa de una fila de ranking (§5 de ADR-0021).

**Fuera de alcance**: cualquier otra sección de ADR-0021 (§1 dos superficies/dos políticas, §3 elegibilidad, §4 resolución de identidad, gates 1-2/4-12 — todos permanecen sin cambio); subida de banner personalizado; nueva mecánica de banner.

**Contratos/datos afectados**:
- ADR-0021 §2: nueva fila `banner` en la tabla de lista blanca, fuente `EquippedCosmetic` (slot `PROFILE_BANNER`) vía `publicProfileId` — mismo patrón exacto que `equippedCosmetics` ya documentado.
- Respuesta JSON de `GET /user/public-profile/:username/competitive-profile`: nuevo campo `banner: string | null`.
- Fila completa de ranking (perfil presentable): mismo campo añadido.
- Sin migración de esquema — el dato ya existe.

**Comportamiento esperado**:
- Perfil presentable con banner equipado (`EquippedCosmetic` en slot `PROFILE_BANNER`) → `banner` contiene el `assetReference` del ítem equipado.
- Perfil presentable sin banner equipado → `banner: null` (campo vacío legítimo, no una fila redactada — mismo criterio ya usado para `equippedTitle: null`, ADR-0021 §2).
- Fila redactada de una lista de ranking → `banner` **ausente** (la clave no existe en el JSON), igual que el resto de campos identificadores (ADR-0021 §1, definición formal de "fila redactada").

**Invariantes**:
- `banner` nunca aparece en una fila redactada.
- `banner` se deriva exclusivamente de `EquippedCosmetic` (slot `PROFILE_BANNER`) — nunca de otro slot, nunca de un campo nuevo en `PublicProfile`.
- La ausencia de banner nunca oculta ni redacta el resto del perfil (mismo criterio ya usado para `equippedTitle: null`/`competitive: null`).

**Casos de error**: ninguno nuevo — sin banner equipado no es un error de dominio, es un campo vacío legítimo; perfil no presentable sigue devolviendo el 404 uniforme ya vigente (ADR-0021 §1, sin cambio).

**Gate verificable** (extensión del Gate 3 de ADR-0021, "lista blanca exacta"), contra backend real:
- Cuenta con banner equipado → campo presente con el valor correcto.
- Cuenta sin banner equipado → campo presente con valor `null`, no ausente.
- Fila redactada de una lista con participantes mezclados → `banner` ausente, verificado por inspección exhaustiva de claves (mismo método que Gate 4 de ADR-0021).
- Regresión completa de los 12 gates ya existentes de ADR-0021 sin romperse.

**Criterio exacto de cierre**: gate extendido en PASS + regresión de los 12 gates de ADR-0021 en PASS + regresión consolidada LEF I-IV (§5, Gate 7) en PASS + enmienda de ADR-0021 §2 commiteada y referenciada desde este documento.

## 10. Diseño — Incremento 2: Visibilidad granular — insignias destacadas

**Objetivo**: que el estudiante decida qué logros públicos se muestran destacados en su encabezado (PRD PROFILE-001/PROFILE-008), en vez de exponer automáticamente todo logro con `visibilityClass = PUBLIC`.

**Alcance**: nueva entidad `public_profile_featured_achievement` (`publicProfileId`, `achievementUnlockId`, `displayOrder`, `createdAt`) — única tabla nueva de todo el bloque (§4.7), con un tope fijo de **3 filas por `publicProfileId`** (§4.6, decisión cerrada). Endpoint privado ("me") para seleccionar/reordenar, entre 0 y 3 elementos. Enmienda de la whitelist pública de ADR-0021 para exponer `featuredAchievements` junto a `publicAchievements`.

**Fuera de alcance**: visibilidad granular del título equipado — el título ya es binario vía equipar/desequipar (`EquippedTitle`, una fila por perfil); no se introduce un segundo interruptor para ocultarlo sin desequiparlo, salvo instrucción explícita futura del Product Owner. Herramientas de reporte/moderación (excluidas por decisión del Product Owner, §3). Nueva mecánica de logros. Cualquier límite distinto de 3 (el número ya está cerrado, no es un parámetro de configuración).

**Contratos/datos afectados**:
- Nueva tabla `public_profile_featured_achievement`, `@@unique([publicProfileId, achievementUnlockId])` (idempotencia de selección, mismo criterio que `EquippedCosmetic`), con un trigger de conteo máximo que rechaza cualquier `INSERT` que deje más de 3 filas para el mismo `publicProfileId` (mismo patrón que `enforce_league_group_capacity`) — límite fijo, decisión cerrada del Product Owner (§4.6), no un parámetro.
- Nuevo endpoint privado de mutación (seleccionar/reordenar/quitar), solo sobre el perfil propio.
- Enmienda de ADR-0021 §2: nueva fila `featuredAchievements` en la lista blanca pública.

**Comportamiento esperado**:
- Selección vacía (0 elementos) → el encabezado no muestra insignias destacadas; no es un error.
- Solo puede destacarse un `AchievementUnlock` propio, con `status = ACTIVE` y cuyo `AchievementDefinition.visibilityClass = PUBLIC` — poseer un logro nunca lo destaca automáticamente (§4.6: posesión y selección son conceptos distintos).
- Reordenar es idempotente — enviar el mismo orden dos veces produce el mismo resultado, sin error.
- Un logro previamente destacado cuyo `visibilityClass` cambie a `PRIVATE` después deja de estar en `publicAchievements` (comportamiento ya vigente de ADR-0021 Gate 8) también deja de aparecer en `featuredAchievements` — la selección no "congela" visibilidad pasada, se re-evalúa en cada lectura.

**Invariantes**:
- Nunca se puede destacar un logro que no pertenece a la cuenta autenticada.
- Nunca se puede destacar un logro no obtenido (`AchievementUnlock` inexistente para esa cuenta) — invariante explícita de §4.6.
- Nunca se exceden 3 filas por perfil (trigger a nivel de base de datos, no solo validación de aplicación — mismo criterio que `enforce_league_group_capacity`).
- Un logro `PRIVATE` nunca aparece en `featuredAchievements`, incluso si sigue en la tabla de selección (falla cerrado, re-evaluado en lectura, no en escritura).

**Casos de error**:
- Intento de destacar un logro ajeno, inexistente o no obtenido → rechazado (código exacto a fijar en implementación, mismo criterio de no confirmar existencia de datos ajenos ya usado en otras superficies).
- Intento de destacar un logro no `PUBLIC` → rechazado con error de dominio explícito.
- Intento de exceder 3 elementos → rechazado, nunca trunca silenciosamente la selección.

**Gate verificable**, contra backend real:
- Seleccionar un 4º elemento (habiendo ya 3) → rechazado, trigger de base de datos confirmado (no solo capa de aplicación).
- Intentar destacar un logro `PRIVATE`, ajeno o no obtenido → rechazado en los tres casos.
- Logro destacado cuya `visibilityClass` cambia a `PRIVATE` tras la selección → deja de aparecer en la whitelist pública sin necesidad de quitar la selección manualmente (verificado leyendo el endpoint público real, no el de escritura).
- Selección vacía (0) y selección máxima (3) ambas válidas — verificado explícitamente en ambos extremos del rango.
- Regresión de los 12 gates de ADR-0021 + el gate extendido del Incremento 1.

**Criterio exacto de cierre**: gate nuevo en PASS + regresiones anteriores en PASS + enmienda de ADR-0021 §2 commiteada. (Límite ya cerrado en 3, §4.6 — sin confirmación adicional pendiente.)

## 11. Diseño — Incremento 3: Resumen académico privado

**Objetivo**: exponer al propio estudiante (nunca a otra cuenta) un resumen de su progreso académico ya calculado por PROGRESS, sin nuevo cálculo (PRD PROFILE-002).

**Alcance**: endpoint privado "me" que agrega, por lectura, datos ya existentes: progreso por materia/tema (`CurriculumTopicProgress`), tiempo de estudio y precisión (derivables de `StudentResponse` ya existente), ensayos completados, evolución reciente (ventana de tiempo, a fijar en implementación sin decisión arquitectónica nueva).

**Fuera de alcance**: cualquier métrica que PROGRESS no calcule hoy — si el diseño detallado encuentra una métrica del PRD sin fuente de dato existente, se señala como vacío real (mismo criterio que §4.8), no se inventa un cálculo nuevo sin decisión del Product Owner.

**Contratos/datos afectados**: nuevo endpoint de solo lectura en la capa de presentación de USER (o PROGRESS, a decidir en implementación sin impacto arquitectónico), sin migración de esquema.

**Comportamiento esperado**: respuesta agregada solo para `request.accountId` — nunca acepta un identificador de otra cuenta (a diferencia de ADR-0021, esta superficie no es cross-cuenta, es exclusivamente "me").

**Invariantes**: el endpoint nunca expone datos de otra cuenta, bajo ningún parámetro; el endpoint nunca escribe, solo lee.

**Casos de error**: sin sesión → 401. Ninguna otra superficie de error prevista — no hay "cuenta objetivo" que pueda no existir.

**Gate verificable**: comparación numérica exacta entre la respuesta del endpoint y una consulta directa de control sobre los mismos datos, para una cuenta de prueba con historial conocido — no basta con que el endpoint responda 200 (mismo criterio ya aplicado en gates de bloques anteriores para evitar gates "de humo").

**Criterio exacto de cierre**: gate en PASS, verificado contra una cuenta de prueba con datos reales de PROGRESS, más regresión consolidada LEF I-IV.

## 12. Diseño — Incremento 4: Historial competitivo cross-temporada

**Objetivo**: dar al estudiante visibilidad de su desempeño en temporadas ya finalizadas, usando datos ya persistidos de forma permanente (§4.4), sin reabrir ni modificar ninguna regla de Bloque IV.

**Alcance**: endpoint privado "me", de solo lectura, sobre `SeasonLeagueParticipation` (filas con `participationStatus IN (PROMOTED, DEMOTED, RETAINED)`, es decir temporadas ya finalizadas) y `LeaderboardSnapshot`/`LeaderboardSnapshotEntry` de temporadas pasadas. **PRIVADO, sin excepción (§4.5, decisión cerrada del Product Owner)** — únicamente el propietario de la cuenta puede invocar este endpoint; no existe variante cross-cuenta ni parcial.

**Fuera de alcance**: cualquier cambio a `SeasonLeagueParticipation`, `LeaderboardSnapshot`, o a las reglas de ascenso/descenso/desempate de ADR-0020 — se leen, nunca se recalculan. **Cualquier exposición de este historial a través de la superficie pública (ADR-0021 y su enmienda de Incrementos 1-2)** — la whitelist pública mantiene exclusivamente lo ya autorizado por ADR-0021 más `banner`/`featuredAchievements`; el historial cross-temporada no se añade a esa lista bajo ninguna forma (completa, resumida o parcial), decisión cerrada, no un valor por defecto reabrible sin nueva instrucción.

**Contratos/datos afectados**: nuevo endpoint de solo lectura, sin migración de esquema (el dato ya existe y ya es permanente).

**Comportamiento esperado**: lista paginada (mismo criterio de cursor ya usado en ADR-0020 §6) de participaciones pasadas de la propia cuenta, cada una con `leagueDefinitionId`/temporada/`finalRank`/`leaguePoints`/resultado (`PROMOTED`/`DEMOTED`/`RETAINED`). Una cuenta sin historial (nunca participó, o solo tiene la temporada activa) → lista vacía, no es un error.

**Invariantes**: el endpoint nunca expone datos de otra cuenta; el endpoint nunca escribe; el resultado (`finalRank`/`leaguePoints`) nunca se recalcula, se lee tal cual quedó congelado al cierre de cada temporada (`LEF-BLOCK-IV-DEFINITION.md` §9.8).

**Casos de error**: sin sesión → 401. Sin historial → lista vacía, no error.

**Gate verificable**:
- Para una cuenta de prueba con al menos dos temporadas finalizadas ya fijadas por fixture, el endpoint devuelve exactamente los valores congelados en `SeasonLeagueParticipation`/`LeaderboardSnapshotEntry`, sin discrepancia — verificado contra backend real, comparando byte a byte los valores esperados del fixture.
- **Sin fuga a la superficie pública**: una segunda cuenta de prueba consultando el endpoint público de ADR-0021 (enmendado) sobre el `username` de la primera nunca recibe ningún campo de historial cross-temporada — verificado por inspección exhaustiva de claves del JSON, mismo método que Gate 3/4 de ADR-0021.

**Criterio exacto de cierre**: ambos gates en PASS + regresión ADR-0020 (Gate 1, §5) en PASS. (§4.5 ya cerrado como privado sin excepción — sin confirmación adicional pendiente.)

**Nota de trazabilidad documental (2026-08-10, Product Owner, tras la implementación)**: `apps/backend/scripts/verify-league-season-foundation-gate.ts` §18 (gate histórico de Bloque IV, Incremento 1) verifica "ningún controller expone `game_season`/`league_definition`/`season_league_participation`" mediante una comprobación **textual** de imports directos de esos tres repositorios dentro de archivos `*.controller.ts`. El nuevo `CompetitiveHistoryController` (Incremento 4) no importa esos repositorios directamente — solo `CompetitiveHistoryService`, que sí los usa — por lo que ese gate sigue en **PASS literal** sin haber sido tocado. Esto es intencional, no una laguna explotada: tras este incremento **ya existe** una superficie HTTP privada (`GET /gamification/me/league/history`) que consume esos datos, autorizada explícitamente por LEF Bloque V, no por Bloque IV. No contradice la decisión histórica de Bloque IV porque (a) fue autorizada en un bloque posterior, con su propia decisión de Product Owner, (b) no expone los repositorios/entidades directamente al cliente, y (c) no crea ninguna superficie pública ni cross-cuenta — sigue siendo exclusivamente `me`. **Bloque IV y su gate §18 permanecen intactos, sin reabrir ni modificar** — esta nota es únicamente trazabilidad documental de por qué la superficie de este incremento es compatible con esa evidencia histórica, no una corrección retroactiva de ella.

## 13. Diseño — Incremento 5: Vista consolidada de perfil propio

**Objetivo**: ensamblar en una sola superficie de backend el encabezado (avatar, banner, username, título, nivel, liga, insignias destacadas) y los resúmenes privados de los Incrementos 3-4, sin nueva persistencia.

**Alcance**: endpoint agregador "me" que compone, por lectura, los resultados ya expuestos por los Incrementos 1-4 (banner y logros destacados vía la misma resolución que la whitelist pública enmendada, aplicada aquí sobre la propia cuenta sin restricción de visibilidad — el dueño de la cuenta siempre ve su información completa, mismo criterio ya usado en ADR-0020 §2/ADR-0021 §5 para "propia posición nunca redactada").

**Fuera de alcance**: cualquier cálculo nuevo — este incremento es exclusivamente composición de lo ya construido en 1-4.

**Contratos/datos afectados**: un endpoint agregador nuevo; sin migración de esquema.

**Comportamiento esperado**: respuesta única con todas las secciones del encabezado y los resúmenes, coherente entre sí (mismos valores que si se consultaran los endpoints individuales de los Incrementos 1-4 por separado).

**Invariantes**: el endpoint agregador nunca diverge de los endpoints individuales que compone — mismo dato, misma fuente, sin caché ni copia local que pueda desincronizarse.

**Casos de error**: sin sesión → 401. Fallo parcial de una sección (ej. sin liga activa) → esa sección viene `null`/vacía, el resto de la respuesta se sirve igual (mismo criterio ya usado para `competitive: null` en ADR-0021).

**Gate verificable**: la respuesta del endpoint agregador es consistente valor-por-valor contra los endpoints individuales de los Incrementos 1-4, consultados por separado para la misma cuenta de prueba.

**Criterio exacto de cierre**: gate en PASS + regresión consolidada LEF I-IV.

## 14. Diseño — Incremento 6: Personalización con elementos bloqueados

**Objetivo**: extender el selector de personalización (ya construido en Bloque III) para mostrar también ítems no obtenidos junto a su requisito de desbloqueo (PRD PROFILE-004), de forma determinista y derivada de datos/contratos existentes (§4.8, decisión cerrada del Product Owner) — nunca texto hardcodeado en mobile.

**Procedimiento obligatorio, en este orden exacto (§4.8)** — este incremento **empieza** con un paso de auditoría, no con código:

1. **Auditoría del catálogo real**: antes de escribir ninguna extensión de endpoint, auditar `reward_grant` y las definiciones ya existentes de recompensa (`ChallengeDefinition`, `AchievementDefinition`, `TitleDefinition`, `CosmeticItem` y su regla de entrega, Bloque III) para determinar, ítem por ítem, si el requisito de obtención es derivable de forma determinista desde datos/contratos ya presentes en el esquema.
2. **Bifurcación según resultado de la auditoría**:
   - **Si es derivable para todos los tipos de ítem** → se reutiliza esa fuente tal cual (solo lectura, sin migración, sin ADR) y el resto de este incremento (alcance/contratos/gate de abajo) procede sin cambios de esquema.
   - **Si no es derivable para alguno o todos** → **detenerse antes de tocar esquema o contratos**. Se documenta aquí mismo (como actualización de esta sección) el resultado de la auditoría y una propuesta concreta de extensión mínima (ej. un campo de metadato presentable), y se somete al Product Owner para aprobación explícita antes de escribir cualquier migración. No se implementa ningún campo nuevo sin esa aprobación.

**Alcance**: extensión de la consulta de catálogo/inventario ya existente para incluir `CosmeticItem`/`TitleDefinition` no poseídos por la cuenta, junto con la representación del requisito de obtención que resulte del paso 1-2 anterior.

**Fuera de alcance**: cualquier cambio a cómo se otorgan u obtienen ítems (Bloque III, sin reabrir); posibilidad de "comprar" un elemento bloqueado (economía de cosméticos, fuera de alcance del bloque, §3); cualquier texto de requisito que no provenga de datos/contratos ya existentes o de un campo aprobado explícitamente por el Product Owner.

**Contratos/datos afectados**: extensión de un endpoint de catálogo ya existente; migración nueva **únicamente** si la auditoría del paso 1 concluye que es estrictamente necesaria y el Product Owner la aprueba explícitamente — de lo contrario, sin migración.

**Comportamiento esperado**: el selector muestra ítems obtenidos (equipables) e ítems no obtenidos (no equipables, con su requisito visible y determinista) diferenciados explícitamente — nunca un ítem no obtenido aparece como equipable, nunca un requisito se muestra como texto libre no trazable a una fuente de datos.

**Invariantes**: un ítem no obtenido nunca es equipable, verificado tanto en la respuesta de catálogo como en el endpoint de equipar ya existente (regresión). El requisito mostrado siempre es reproducible a partir de una consulta a datos/contratos existentes — nunca un valor hardcodeado en el cliente.

**Casos de error**: intento de equipar un ítem no obtenido → mismo rechazo ya vigente hoy (Bloque III, sin cambio) — este incremento solo añade visibilidad, no cambia la regla de equipar.

**Gate verificable**: catálogo de una cuenta de prueba con inventario parcial muestra exactamente los ítems obtenidos como equipables y los no obtenidos como bloqueados con requisito visible, verificado como derivado de la misma fuente de datos usada por el paso 1 (no de una constante); intento de equipar un ítem bloqueado sigue rechazado (regresión de Bloque III).

**Criterio exacto de cierre**: auditoría del paso 1 documentada + (si aplicó) extensión mínima aprobada explícitamente por el Product Owner antes de implementar + gate en PASS + regresión de gates de equipamiento de Bloque III en PASS.

**Resultado de la auditoría del paso 1 (2026-08-10)**: el requisito de obtención de `CosmeticItem`/`TitleDefinition` **sí es derivable de forma canónica** desde datos ya persistidos — `reward_bundle_item` (referencia reforzada por trigger a `title_definition`/`cosmetic_item`) → `reward_bundle` → `level_definition` / `achievement_version` (con `unlockRule` ya estructurado) / `challenge_definition`. Es la MISMA cadena relacional que `RewardEvaluationWorker` ya usa para entregar propiedad real — no una interpretación paralela. **No fue necesaria ninguna migración, columna de metadata ni ADR nuevo.**

**Semántica final de `locked` (corrección del Product Owner, 2026-08-10, posterior a la primera implementación)**: un elemento no poseído **solo** aparece en `locked` si tiene al menos un `unlockRequirement` canónico resuelto por esa cadena. `unlockRequirements: []` **no es un estado expuesto** — el contrato (`lockedCosmeticSchema`/`lockedTitleSchema`, `packages/contracts/src/user.ts`) exige `.min(1)`, de modo que un elemento sin ninguna ruta de recompensa conocida queda **fuera del catálogo descubrible por completo**, nunca con un requisito vacío o fabricado. Ownership real (`inventory_item`/`account_title` ya existente) tiene precedencia absoluta: un elemento ya poseído sigue apareciendo en `owned` aunque su origen histórico no sea reconstruible hoy. Sin nuevo enum (`UNAVAILABLE` u otro), sin string manual, sin columna de metadata, sin migración — la primera versión de este incremento exponía `unlockRequirements: []` como estado válido; el Product Owner corrigió esto antes del cierre porque PROFILE-004 exige que un elemento bloqueado muestre un requisito REAL, y `[]` no cumple esa exigencia aunque sea honesto sobre la ausencia de datos.

**Nota de trazabilidad documental (2026-08-10, Product Owner)** — mismo criterio ya aplicado en el Incremento 4 respecto a Bloque IV: `apps/backend/scripts/verify-cosmetic-equipment-gate.ts` §13 (gate histórico de Bloque III) verifica "ningún controller expone el catálogo completo de `cosmetic_item`" mediante una comprobación **textual** de imports directos de `CosmeticItemRepository` en archivos `*.controller.ts`. `CosmeticEquipmentController` (Incremento 6) no importa ese repositorio directamente — solo `UserService`, que internamente sí lo usa vía `CosmeticEquipmentService.getLockedByAccountId` — por lo que ese gate sigue en **PASS literal**, sin haber sido tocado. Esto es intencional: tras este incremento **ya existe** una superficie HTTP de catálogo bloqueado (`GET /gamification/me/cosmetics` con `locked`, `GET /gamification/me/titles`), autorizada explícitamente por LEF Bloque V. Su PASS **no debe interpretarse** como prueba de que hoy no exista una superficie de catálogo — documenta únicamente que el check histórico verifica imports directos, no exposición HTTP real. **Bloque III y su gate §13 permanecen intactos, sin reabrir ni modificar.**

**Nota de deuda técnica preexistente (tooling, no de producto)**: `apps/backend/scripts/verify-public-profile-gate.ts` instancia `UserService` manualmente con solo 4 de sus 8 argumentos reales (faltan `featuredAchievementService`/`competitiveProfileIdentityService`/`competitiveContextService`/`competitiveLeaderboardService`, añadidos en Incrementos 2/4/5 de este mismo bloque) — esto no falla porque `tsconfig.json` excluye `scripts/` del typecheck y ese gate nunca invoca los métodos que dependen de esos servicios. Es deuda preexistente del tooling, **no introducida por el Incremento 6** ni por ningún incremento anterior de LEF V — se detectó al auditar ese archivo, no se causó al escribirlo. Este incremento corrigió **únicamente** la dependencia que él mismo introdujo (`UnlockRequirementResolverService`, nuevo parámetro de `CosmeticEquipmentService`/`TitleEquipmentService`, que ese gate también instancia manualmente) — sin ampliar el alcance para reconstruir la instanciación completa de `UserService` en ese archivo, que queda pendiente como deuda técnica separada si se decide abordarla en el futuro.

## 15. Diseño — Incremento 7: Vista previa pública

**Objetivo**: que el estudiante vea exactamente lo que un tercero vería de su perfil (PRD PROFILE-007), reutilizando la superficie pública real, nunca una copia o aproximación.

**Alcance**: endpoint o composición que invoca, para el propio `username`, el mismo endpoint público de ADR-0021 (enmendado por los Incrementos 1-2) que usaría cualquier otro usuario autenticado — sin ninguna lógica de presentación distinta.

**Fuera de alcance**: cualquier campo adicional que el propio dueño vea "de más" en la vista previa — si eso ocurriera, sería un defecto, no una funcionalidad (rompe el propósito mismo de una vista previa fiel).

**Contratos/datos afectados**: ninguno nuevo — reutiliza el contrato ya existente de ADR-0021 (enmendado).

**Comportamiento esperado**: la vista previa de la propia cuenta es indistinguible, campo por campo, de lo que obtendría un tercero autenticado consultando el mismo `username`.

**Invariantes**: la vista previa nunca usa un camino de código distinto al endpoint público real — cualquier divergencia de implementación (ej. una copia del cálculo de whitelist) queda prohibida por diseño, precisamente para que un futuro cambio a la whitelist no pueda olvidarse de actualizar la vista previa.

**Casos de error**: ninguno nuevo — mismo comportamiento del endpoint público subyacente.

**Gate verificable** (mismo que Gate 5, §5): respuesta de vista previa para la propia cuenta es byte-idéntica a la respuesta que obtiene una segunda cuenta de prueba consultando el mismo `username` a través del endpoint público real.

**Criterio exacto de cierre**: gate en PASS, ejecutado con dos cuentas de prueba reales (una consultándose a sí misma vía vista previa, otra consultándola vía el endpoint público), confirmando identidad byte a byte.

## 16. Diseño — Incremento 8: Superficie móvil

**Objetivo**: reemplazar/expandir `perfil.tsx` con las capacidades reales construidas en los Incrementos 1-7 — encabezado, resumen académico, resumen de actividad, historial competitivo, personalización con bloqueados, vista previa pública.

**Alcance**: pantallas mobile que consumen los endpoints de los Incrementos 1-7. Sin lógica de negocio nueva en el cliente (mismo principio ya vigente en todo el proyecto: "el cliente no recalcula posiciones/estados como autoridad", Master Context §5.20, extendido aquí a cualquier dato de perfil).

**Fuera de alcance**: cualquier cálculo o decisión de negocio en el cliente; herramientas de reporte/moderación (§3).

**Contratos/datos afectados**: ninguno nuevo — consumo de contratos ya fijados en los Incrementos 1-7.

**Comportamiento esperado**: paridad completa con lo que exponen los endpoints — ningún dato mostrado en mobile que no provenga de una llamada real a uno de los endpoints de este bloque.

**Invariantes**: sin estado local que pueda divergir silenciosamente del backend (mismo criterio que "el ranking temporalmente desactualizado deberá indicarlo", Master Context §5.20, aplicado aquí a estadísticas/historial).

**Casos de error**: estados de carga/error estándar ya usados en el resto de la app (mismo patrón visual/UX que Competir/Estudio).

**Gate verificable**: verificación manual en Browser pane y/o dispositivo Android real (mismo criterio que el cierre de Bloque IV §14) — encabezado, estadísticas, historial, personalización con bloqueados y vista previa, todos ejercitados contra backend real.

**Criterio exacto de cierre**: verificación manual completa en PASS + regresión consolidada LEF I-IV en PASS + gate consolidado nuevo del bloque (`verify:block-V-gate` o nombre equivalente) encadenando todos los gates de los Incrementos 1-7 más los de Bloques I-IV, ejecutado contra una instancia de backend real recién iniciada.

## 17. Criterio formal de cierre del Bloque V

Siguiendo el patrón usado en I-IV: el bloque se considera cerrado cuando exista `LEF-BLOCK-V-CLOSURE-REPORT.md` con las secciones estándar (Objetivo, Incrementos realizados con tabla de commits, Decision Gates y estado, Gate consolidado con transcripción literal PASS/FAIL, Incidencias reales con causa raíz y corrección, Notas de diseño corregidas, Artefactos temporales, Evidencia de validación, Lecciones aprendidas, Estado final) y cumpla, como mínimo:

1. Los ocho incrementos (§9-16) implementados y gateados individualmente, cada uno con su gate en PASS contra backend real.
2. El gate consolidado `verify:block-V-gate` encadena la regresión completa de LEF I-IV más los gates propios de V, ejecutado contra una instancia de backend recién iniciada, en PASS.
3. Los siete gates de bloque (§5) todos en PASS.
4. Verificación manual de la superficie móvil (Incremento 8) en Browser pane y dispositivo Android real, en PASS.
5. Ninguna de las exclusiones de §3 fue construida accidentalmente (verificado por inspección, no solo por intención).
6. §4.5 y §4.6 ya están resueltos por el Product Owner (2026-08-10) — el cierre solo debe confirmar que la implementación respeta exactamente lo decidido (privado sin excepción; máximo 3, mínimo 0). §4.8 (Incremento 6) debe registrar en el cierre el resultado de la auditoría del catálogo obligatoria y, si aplicó, la aprobación explícita del Product Owner para cualquier extensión de esquema — ninguno de los tres puntos permanece implícito.
7. Estado final: **APPROVED**, con la misma exigencia ya usada en todos los cierres anteriores: *"No se considera suficiente la existencia del código fuente como demostración de cumplimiento — toda afirmación del reporte está respaldada por una ejecución real registrada."*
