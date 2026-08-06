# ADR 0021 — Perfil competitivo de otro usuario (Bloque IV, Learning Experience Foundation)

- **Estado**: **APROBADA (2026-08-06)** — con una corrección obligatoria del Product Owner sobre la propuesta inicial: la redacción (§1) se aplica **únicamente** dentro de una clasificación real (filas de una lista de ranking) — la consulta directa de un perfil individual **mantiene** la política original de 404 uniforme (`LEF-BLOCK-IV-DEFINITION.md` §5, Gate 5), sin excepción. Ver §1 para la distinción formal entre ambas superficies. Sin código todavía.
- **Fecha**: 2026-08-06
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation, Bloque IV ("Competir"), Incremento 3 ("Perfil competitivo de otro usuario").
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context §11.9): Nivel 2 — introduce un patrón nuevo (primer endpoint público cross-cuenta del proyecto, autorización basada solo en la identidad del solicitante) que lee datos ya propiedad de GAMIFICATION (Incremento 2) y USER (ADR-0018), sin modificar ningún dominio ni componente ya cerrado y gateado.

## Alcance de este ADR (y lo que deliberadamente NO decide)

Este ADR decide **exclusivamente** la capa de presentación/autorización cross-cuenta: qué campos se exponen, cómo se trata una fila no presentable, y dónde vive la resolución de identidad. Quedan fuera, tratados como entradas fijas que este ADR consume sin rediseñarlas:

- **Cálculo de ranking** (`leaderboard_entry`, `season_league_participation`, ADR-0020) — se **lee**, nunca se recalcula ni se altera. Este ADR confirma explícitamente, de nuevo, la garantía ya fijada por ADR-0020 §1/§2: nada de lo decidido aquí toca `rankPosition`/`metricValue`/ascenso-descenso.
- **`public_profile`/ADR-0018** — se lee (`visibilityStatus`, `lifecycleStatus`, `usernameNormalized`, `avatarReference`), no se le añade ningún campo ni estado nuevo (mismo criterio ya fijado en `LEF-BLOCK-IV-DEFINITION.md` §4.3: sin `leaderboard_visibility`/`competition_visibility` nuevos).
- **Títulos/cosméticos equipados** (Bloque III) — se leen vía `publicProfileId`, sin cambio a su modelo.
- **Pregunta rápida y superficie móvil** (Incrementos 4/5) — sin relación con este ADR.

## Contexto

`LEF-BLOCK-IV-DEFINITION.md` §11 auditó las fuentes documentales (Data Model §16.25, Gate 4 ya fijado a nivel de bloque en §5, Master Context §4.10, PRD PROFILE-006/007/008) y encontró un problema no anticipado por el diseño original del bloque: ADR-0020 §1/§2 ya decidió que el cálculo de ranking **nunca** excluye participaciones por privacidad — `leaderboard_entry` contiene, por diseño, filas de perfiles `PRIVATE`/`RETIRED`/`ANONYMIZED` mezcladas con las de perfiles presentables, todas con posiciones reales. Ningún documento fuente fijaba qué debía hacer la capa de presentación con esas filas. `LEF-BLOCK-IV-DEFINITION.md` §11.3 propuso tres alternativas (omitir, redactar, o un híbrido inconsistente) y el Product Owner confirmó la decisión antes de que este ADR se redactara.

## Decisión

### 1. Dos superficies, dos políticas — corrección obligatoria del Product Owner sobre la propuesta inicial

La propuesta inicial (`LEF-BLOCK-IV-DEFINITION.md` §11.3.2) generalizaba "redactar, nunca omitir" a **toda** superficie del incremento, incluida la consulta directa de un perfil por `username`. **El Product Owner corrigió esto**: la redacción se aplica **únicamente dentro de una clasificación real** — una lista de ranking, donde cada fila ocupa una posición que existe con independencia de si se muestra o no. La consulta directa de un perfil individual (`GET .../competitive-profile`, §5) **no** es una clasificación — no hay ninguna posición de lista que preservar, ninguna fila cuya ausencia deje un hueco — así que **mantiene la política original de 404 uniforme** (`LEF-BLOCK-IV-DEFINITION.md` §5, Gate 5), sin ninguna excepción, exactamente como estaba fijada antes de este incremento.

**Distinción formal** (instrucción literal del Product Owner, motivo de la corrección):

- **Redacción dentro de una clasificación real**: la fila **debe preservarse** — omitirla dejaría un hueco de `rankPosition` que filtra indirectamente cuántos participantes no presentables hay en el grupo (mismo razonamiento ya usado para descartar la alternativa A de §11.3.2). Aplica exclusivamente a las filas de la lista paginada de ranking (Incremento 2, §10.9).
- **Acceso directo a un recurso**: no existe ninguna posición que justifique una representación redactada — el recurso completo, como unidad, es inaccesible o no lo es. Aplica al endpoint de perfil individual (§5). Un 404 uniforme aquí ya cumple exactamente el mismo objetivo de privacidad que perseguía la redacción (ningún dato identificador se expone, "existe pero privado" es indistinguible de "no existe"), sin necesitar el concepto de fila.

**Definición formal de "fila redactada"** (aplica exclusivamente a filas dentro de una lista de ranking, §5):

```
respuesta_redactada := {
  presentable: false,
  rankPosition: <valor real, sin alterar>,
  metricValue: <valor real, sin alterar>,
  // todo lo demás, AUSENTE -- no null, no vacío: la clave ni existe en el JSON
}
```

`rankPosition`/`metricValue` se incluyen porque son el resultado competitivo real (ADR-0020: la privacidad nunca lo altera) y no identifican a la cuenta por sí solos — son la misma clase de dato que "posición, liga" ya autorizados por Data Model §16.25 para cualquier fila. Se excluyen explícitamente de una fila redactada (instrucción literal del Product Owner): `accountId`, `publicProfileId`, `username`, `avatar`, título equipado, cosméticos equipados, logros. `seasonLeagueParticipationId` **tampoco** se expone en una fila redactada (aunque técnicamente no está en la lista del Product Owner, confirmado como correcto: "ocultar `seasonLeagueParticipationId` es correcto") — es un identificador estable capaz de correlacionar la misma cuenta entre dos peticiones sucesivas, exactamente el riesgo que la instrucción "sin identificadores correlacionables" busca evitar.

**Consulta directa por `username`** (§5): `perfil PRIVATE`, `perfil RETIRED`, `perfil ANONYMIZED` y `perfil inexistente` responden los **cuatro con el mismo código y el mismo cuerpo** (404 uniforme) — ningún camino de código distingue entre ellos antes de responder. **No se genera ningún recurso redactado con 200** cuando el perfil no existe o no es presentable — corrección explícita frente a la propuesta inicial de este mismo ADR, que sí lo proponía.

### 2. Lista blanca reconciliada — confirma y formaliza §11.3.1

**Decisión del Product Owner**: la lista blanca pública (perfil `ACTIVE` + `VISIBLE`) es la unión de Data Model §16.25, el Gate 4 ya fijado en `LEF-BLOCK-IV-DEFINITION.md` §5, y Master Context §4.10 — ninguna fuente es más autoritativa que otra, todas exigidas simultáneamente:

| Campo | Fuente de dato | Nota |
|---|---|---|
| `username` | `PublicProfile.usernameNormalized` | — |
| `avatar` | `PublicProfile.avatarReference` | — |
| `equippedTitle` | `EquippedTitle` vía `publicProfileId` | `null` si no hay ninguno equipado — no es una fila redactada, es un campo vacío legítimo |
| `equippedCosmetics` | `EquippedCosmetic[]` vía `publicProfileId` | Master Context §4.10: único mecanismo autorizado para mostrar señal de Premium |
| `level` | Derivado de `XpBalance.lifetimeXp` (vía `accountId` resuelto desde `PublicProfile.accountId`) + `LevelDefinition` | Se expone **solo** `levelNumber` — nunca `lifetimeXp` en crudo (Data Model dice "nivel **o** puntos aplicables", se elige la forma menos granular) |
| `publicAchievements` | `AchievementUnlock` vía `accountId`, `JOIN AchievementDefinition WHERE visibilityClass = 'PUBLIC'` | Reutiliza un campo ya existente en el esquema, sin usar hasta ahora — cero migración |
| `competitive` | `LeaderboardEntry` (`rankPosition`, `metricValue`, `calculatedAt`, `snapshotVersion`) + `LeagueDefinition`/`LeagueGroup` (liga/tier) vía la participación de la cuenta | `null` si la cuenta no tiene participación activa en la temporada vigente — no es un motivo para redactar el resto del perfil (propiedad y presentación son capas separadas, mismo criterio ya usado en `equipTitle`/`equipCosmetic`) |

**Lista negra, sin cambios respecto a Data Model §16.25** (ninguna fuente la contradice): nombre privado, correo, edad exacta, ubicación, materias débiles, puntajes diagnósticos, objetivos, historial de respuestas, estado Premium explícito, configuración de accesibilidad, `lifetimeXp` en crudo, cualquier campo de `Account`/`AuthIdentity`.

### 3. Política de elegibilidad — una condición, dos respuestas según superficie (§1)

La condición de elegibilidad es una sola; lo que cambia es la forma de la respuesta cuando no se cumple, según la superficie (§1):

```
perfil.lifecycleStatus == ACTIVE && perfil.visibilityStatus == VISIBLE
  → presentable: lista blanca completa (§2) en ambas superficies

perfil.lifecycleStatus IN (RETIRED, ANONYMIZED)
  → NO presentable
perfil.lifecycleStatus == ACTIVE && perfil.visibilityStatus == PRIVATE
  → NO presentable
perfil inexistente (cuenta sin public_profile, o username no encontrado)
  → NO presentable

NO presentable, dentro de una lista de ranking (§5, lista paginada)
  → fila redactada (§1), 200, la fila se preserva
NO presentable, en consulta directa de perfil (§5, endpoint individual)
  → 404 uniforme (§1), mismo código/cuerpo para los cuatro casos de "NO presentable"
```

Ningún estado intermedio — coincide exactamente con el enum ya existente (`PublicProfileLifecycleStatus`: `ACTIVE`/`RETIRED`/`ANONYMIZED`; `PublicProfileVisibilityStatus`: `PRIVATE`/`VISIBLE`), sin necesidad de ningún campo nuevo.

### 4. Resolución de identidad vive en USER, nunca en GAMIFICATION — confirma y formaliza §11.3.3

**Decisión del Product Owner**: la resolución de presentación (unir `season_league_participation`/`leaderboard_entry` de GAMIFICATION contra `public_profile`/`equipped_title`/`equipped_cosmetic` de USER) vive **exclusivamente en la capa de presentación de USER** — mismo patrón arquitectónico que `PublicProfileController` ya usa hoy para exponer títulos/cosméticos equipados (datos de GAMIFICATION) sin que GAMIFICATION conozca a USER.

- **Clave de unión**: `accountId` — ya presente en `SeasonLeagueParticipation.accountId` y en `PublicProfile.accountId`, sin necesidad de columna nueva.
- **`leaderboard_entry.publicProfileId` permanece `null`** (decisión ya tomada en Incremento 2, confirmada aquí sin cambios): resolverlo en tiempo de cálculo reintroduciría el ciclo de módulos que Incremento 2 evitó deliberadamente. La columna queda como campo reservado del Data Model, no usado en V1 — mismo criterio que otras columnas grammar abiertas sin interpretar en incrementos anteriores.
- **Ningún archivo de `src/gamification/` importa de `src/user/`** — el servicio nuevo de este incremento (`CompetitiveProfileService`, propuesto, o nombre equivalente) vive en `UserModule`, inyecta repositorios de ambos dominios (ya posible hoy: `UserModule` ya depende de `GamificationModule`), y es el único punto donde ambos bounded contexts se cruzan para este propósito.

### 5. Endpoints propuestos (forma, sujeta a la implementación)

```
GET /user/public-profile/:username/competitive-profile
```

Perfil presentable → lista blanca completa (§2), `competitive: null` si no hay participación activa. Perfil `PRIVATE`/`RETIRED`/`ANONYMIZED`/inexistente → 404 uniforme, mismo código y cuerpo para los cuatro casos (§1, §3 — Gate 5 de `LEF-BLOCK-IV-DEFINITION.md` §5 se mantiene sin cambios para esta superficie).

```
GET /gamification/leaderboard/:groupId  (o ruta equivalente, a fijar en la implementación)
```

Lista paginada (cursor `rankPosition,id`, ya construida por Incremento 2, ADR-0020 §6) — cada fila es, según elegibilidad de su perfil, o bien la forma completa de §2 (proyectada a los campos relevantes de una fila de tabla: `username`, `avatar`, `equippedTitle`, `rankPosition`, `metricValue`) o bien la forma redactada de §1. Vive también en la capa de presentación de USER (o expone desde GAMIFICATION un resultado ya sin datos identificadores y USER lo enriquece — decisión de implementación exacta, sin impacto arquitectónico distinto de §4, a fijar sin necesidad de otro ADR).

"Mi posición" (capacidad ya garantizada por ADR-0020 §6, `findBySeasonLeagueParticipationId`): la propia cuenta consultando su posición **nunca** ve su propia fila redactada, sin importar su visibilidad — mismo criterio ya fijado por ADR-0020 §2 ("la cuenta misma, al consultar su propia posición, siempre ve su fila real, completa").

## Alternativas descartadas

- **Omitir filas no presentables de la lista** (§11.3.2, alternativa A) — descartada: crea huecos de `rankPosition` que filtran indirectamente cuántos participantes privados hay en el grupo, y reabriría por la puerta trasera el modelo de exclusión que ADR-0020 §1/§2 ya rechazó explícitamente para el cálculo.
- **Redactar también en la consulta directa de perfil (200 uniforme en vez de 404)** — propuesta inicial de este mismo ADR, **descartada por corrección obligatoria del Product Owner**: la consulta directa no es una clasificación — no existe ninguna posición de lista ni ningún hueco que preservar, así que el argumento que justifica redactar (§1) no aplica. Mantener el 404 uniforme ya vigente (Gate 5, `LEF-BLOCK-IV-DEFINITION.md` §5) logra el mismo objetivo de privacidad sin introducir una segunda forma de respuesta para un caso donde la primera ya era suficiente y ya estaba gateada.
- **Exponer `metricValue` de una fila redactada como `null` en vez de su valor real** — descartada: contradice la instrucción explícita del Product Owner ("la redacción no altera rankPosition, LP ni resultados competitivos") y no aporta privacidad adicional (el monto de puntos no es información identificadora ni académica).
- **Resolver `publicProfileId` en `leaderboard_entry` en tiempo de cálculo** (§11.3.3, alternativa A) — descartada, ya evaluada y rechazada en Incremento 2 por crear un ciclo de módulos.
- **Vista SQL o trigger cross-tabla entre GAMIFICATION y USER** (§11.3.3, alternativa C) — descartada, sin precedente ni necesidad de rendimiento demostrada en este proyecto.

## Consecuencias

- **El Gate 5 de `LEF-BLOCK-IV-DEFINITION.md` §5 (404 uniforme) se mantiene sin cambios** para la consulta directa de perfil — este ADR lo confirma y lo extiende explícitamente a `ANONYMIZED` (no nombrado literalmente en el gate original, pero ya cubierto por su espíritu: "excluido de toda superficie pública", ADR-0018). La redacción (§1) es un mecanismo **nuevo**, aplicable solo a filas de listas de ranking — no sustituye nada ya gateado. El Gate 4 de esa misma sección (lista blanca) se mantiene, ampliado por §2 de este ADR.
- **Sin migración de esquema** — todos los campos necesarios ya existen (`leaderboard_entry`, `public_profile`, `equipped_title`, `equipped_cosmetic`, `xp_balance`, `achievement_unlock`/`achievement_definition.visibilityClass`). Este incremento es exclusivamente código de presentación/autorización nuevo en `UserModule`, más un endpoint de lista en `GamificationModule` (o expuesto también desde USER, a decidir en implementación).
- **`UserModule` gana una dependencia de lectura nueva** sobre `LeaderboardEntryRepository`/`SeasonLeagueParticipationRepository`/`LeagueGroupRepository`/`LeagueDefinitionRepository` (todas de GAMIFICATION, ya expuestas por `GamificationModule`) — mismo patrón que su dependencia ya existente sobre `TitleEquipmentService`/`CosmeticEquipmentService`, sin ciclo.
- **GAMIFICATION no gana ninguna dependencia nueva** sobre USER — la frontera de dominio se mantiene exactamente como está.
- **Incremento 4/5** (Pregunta rápida, superficie móvil) no dependen de las decisiones de este ADR más allá de reutilizar, si corresponde, el mismo patrón de resolución en la capa de presentación de USER.

## Validación

Pendiente — ADR aprobado, implementación aún no iniciada. Decision Gates (sustituyen y amplían los ya propuestos en `LEF-BLOCK-IV-DEFINITION.md` §11.6):

1. **404 uniforme en consulta directa, sin excepción** — `GET .../competitive-profile` para un perfil `PRIVATE`, `RETIRED`, `ANONYMIZED` e inexistente responde los CUATRO con el mismo status y el mismo cuerpo — nunca 200 con un recurso redactado, nunca 403. **Confirma el Gate 5 de §5, sin cambios.**
2. **Redacción con preservación de posición, únicamente en listas** — un grupo con participantes mezclados (presentables y no presentables) produce una lista con TODAS las posiciones consecutivas de `1` a `G`, sin omitir ninguna — las no presentables aparecen como fila redactada (§1), nunca ausentes ni como 404.
3. **Lista blanca exacta para perfil presentable** — la respuesta expone EXACTAMENTE los campos de §2, ninguno de la lista negra, verificado por inspección exhaustiva de claves del JSON.
4. **Fila redactada exacta** — la fila no presentable de una lista contiene ÚNICAMENTE `presentable: false`, `rankPosition`, `metricValue` — ninguna otra clave, ni siquiera con valor `null` (la clave debe estar ausente, no nula, para distinguir "campo vacío legítimo" de "campo redactado").
5. **Sin identificador correlacionable en una fila redactada** — `accountId`, `publicProfileId`, `seasonLeagueParticipationId` nunca aparecen en una fila redactada, verificado exhaustivamente.
6. **El cálculo de ranking no cambia por privacidad ni por este incremento** — cambiar `visibilityStatus` de una cuenta a `PRIVATE` no altera `rankPosition`/`metricValue` propio ni de otras filas del mismo grupo (regresión directa sobre ADR-0020 Gate 16, ahora también verificada desde la capa de presentación).
7. **Sin dependencia circular de módulos** — verificación estática: ningún archivo de `src/gamification/` importa de `src/user/`.
8. **Logros filtrados por `visibilityClass`** — un logro `PRIVATE` desbloqueado por la cuenta consultada nunca aparece en `publicAchievements`, incluso si está `ACTIVE`/desbloqueado.
9. **Nivel sin XP en crudo** — la respuesta nunca contiene `lifetimeXp` ni ningún monto de XP, solo `levelNumber` derivado.
10. **Sin participación de liga no rompe el resto de la lista blanca** — `competitive: null` con el resto de campos presentes, para un perfil elegible sin liga activa.
11. **Sin identidad del sujeto requerida, solo del solicitante** — llamar sin sesión → 401. Llamar con sesión válida sobre cualquier `username` (propio o ajeno) → 200 (presentable) o 404 (no presentable/inexistente), nunca 403.
12. **Propia posición nunca redactada ni 404 para uno mismo** — la cuenta autenticada consultando su propia fila (en lista) o su propio perfil (consulta directa) siempre ve la forma completa, sin importar su propia visibilidad (ADR-0020 §2, reverificado desde esta capa).

Ninguno ejecutado todavía — se ejecutarán como parte de la implementación de este incremento.
