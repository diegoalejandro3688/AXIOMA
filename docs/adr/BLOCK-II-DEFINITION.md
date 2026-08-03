# Bloque II — Definición Formal: Progresión Visible y Public Profile Foundation

**Fecha**: 2026-08-03
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: II de VIII (Roadmap Learning Experience Foundation — orden confirmado por el Product Owner tras auditoría de dependencias, ver §4)
**Documentos relacionados**: `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0017-entrega-multiconsumidor-outbox.md`, `docs/adr/BLOCK-I-CLOSURE-REPORT.md`, `docs/adr/BLOCK-II-CLOSURE-REPORT.md`
**Estado**: **Implementado, validado y cerrado formalmente (2026-08-03).** Ver §11 (nota histórica) para las desviaciones reales encontradas durante la implementación y `docs/adr/BLOCK-II-CLOSURE-REPORT.md` para el cierre completo.

---

## 1. Definición formal del bloque

El Bloque II construye la primera capa **visible al estudiante** sobre la fundación de Gamificación cerrada en el Bloque I: expone niveles, rachas e historial de XP derivados del ledger ya existente, y resuelve — como prerrequisito estructural, no como adelanto de producto — la primitiva de identidad pública (`public_profile`) de la que dependerán el Bloque III (Gamificación Avanzada) y el Bloque IV (Competir).

El bloque se compone de **dos incrementos**, ejecutados en este orden:

1. **Progresión visible** — niveles, rachas, barra de progreso e historial, sobre datos que el Bloque I ya genera (`xp_balance`, `xp_ledger_entry`, `level_definition`, `streak_definition`/`account_streak`).
2. **Public Profile Foundation** — la primitiva `public_profile` definida en ADR-0018, creada de forma perezosa e idempotente al primer ingreso a Competir, privada por defecto.

Ambos incrementos son autocontenidos y se cierran con su propio gate, siguiendo el mismo patrón que los tres incrementos del Bloque I.

## 2. Objetivo

Permitir que el estudiante vea, por primera vez, el efecto motivacional de su actividad académica validada — su nivel, su racha y su historial de progreso — sin alterar la evaluación académica real (Data Model §16.3: "un nivel alto no garantiza un puntaje académico alto"), y dejar preparada la identidad pública mínima que las capacidades competitivas del roadmap necesitarán, sin exponer todavía ninguna información a otros estudiantes.

Este bloque **no** tiene como objetivo introducir motivación social ni competitiva — eso pertenece a los Bloques III y IV. Su objetivo es exclusivamente hacer visible, de forma privada, lo que el Bloque I ya calcula, y dejar lista (pero oculta) la infraestructura de identidad que la fase necesitará después.

## 3. Alcance y exclusiones

### Dentro de alcance

| Capacidad | Fuente de datos | Nuevo dominio? |
|---|---|---|
| Nivel actual visible (número, XP dentro del nivel, XP para siguiente nivel) | `xp_balance`, `level_definition` (ya modelados, Bloque I no los expuso) | No — mismo dominio GAMIFICATION |
| Racha actual y mejor racha | `account_streak`, `streak_day` (a construir sobre reglas ya definidas en Data Model §16.12–16.14) | No |
| Historial de XP (línea de tiempo de otorgamientos/reversos) | `xp_ledger_entry` (ya existe desde el Bloque I) | No |
| Barra de progreso hacia el siguiente nivel | Derivada de `xp_balance` + `level_definition`, sin nuevo estado persistido | No |
| `public_profile` — creación perezosa, privada por defecto, política de username, reversibilidad, retiro coordinado | ADR-0018 | Sí — nueva entidad en USER (dominio ya existente desde ADR-0008), no un dominio nuevo |

### Fuera de alcance (explícito)

- Rankings, `leaderboard_entry`, cualquier proyección competitiva (Bloque IV).
- Historial competitivo, resultados de competencias (Bloque IV).
- Títulos e insignias equipados públicamente, cosméticos, desafíos (Bloque III).
- Estadísticas públicas y cualquier vista de "Perfil Avanzado" (Bloque V).
- Cualquier valor de `visibility_status = VISIBLE` alcanzable sin una acción afirmativa explícita del estudiante (ADR-0018 §3).
- Moneda virtual, economía cosmética, paquetes de recompensa más allá de los ya otorgados por niveles/logros existentes.
- Tutor IA y Plataforma Editorial (Bloques VI y VII — dominios completamente independientes).
- Modificación de la lógica de otorgamiento de XP del Bloque I (`XpGrantService`, reglas `xp_rule`) — este bloque **lee** `xp_balance`/`xp_ledger_entry`, no los modifica.

## 4. Contradicciones y vacíos documentales

Registrados y resueltos durante la definición de este bloque, antes de iniciar implementación:

1. **El roadmap de 8 bloques nunca estuvo enumerado en ningún documento fuente** (Kickoff, Data Model, Master Context) — solo el Bloque I tenía nombre y cierre formal; el resto no tenía orden fijado. Resuelto en esta sesión: el Product Owner definió y confirmó el orden completo (Fundación de Gamificación → Progresión visible → Gamificación avanzada → Competir → Perfil avanzado → Tutor IA → Plataforma Editorial → Consolidación y cierre), auditado contra el Data Model antes de confirmarse. Este documento es el primer registro escrito de ese orden completo.
2. **Dependencia invertida real**: `leaderboard_entry` (Competir, Bloque IV) y `equipped_title`/`equipped_cosmetic` (Gamificación Avanzada, Bloque III) están indexados por `public_profile_id`, entidad que el orden original no construía hasta el Bloque V ("Perfil avanzado"). Resuelto: `public_profile` se extrae como incremento propio dentro de este Bloque II (ADR-0018), sin alterar el conteo de 8 bloques ni adelantar el alcance completo de "Perfil Avanzado".
3. **Decision Gate documental sin resolver** (Data Model, línea 3902): *"¿Será obligatorio crear un username durante el onboarding o solo al ingresar por primera vez a Juego?"* — heredado además de ADR-0008, que explícitamente difirió esta pregunta. Resuelto en ADR-0018: creación perezosa en el primer ingreso a Competir, nunca en onboarding.
4. **Especificación operativa de moderación de username** — Data Model §6.6 y ADR-0008 la dejaron pendiente explícitamente ("la política exacta de moderación... se definirá en una especificación operativa posterior"). Resuelto en ADR-0018: lista de bloqueo mínima + registro separado de nombres reservados contra suplantación institucional.
5. **Sin vacíos pendientes para el incremento "Progresión visible"**: niveles y rachas están completamente modelados en Data Model §16.11–16.14 sin preguntas abiertas asociadas: ninguna decisión de arquitectura nueva es necesaria más allá de construir sobre lo ya aprobado en el Bloque I.

## 5. Decision Gates

### Incremento 1 — Progresión visible

| # | Gate | Qué verifica |
|---|---|---|
| 1 | Consistencia nivel/XP | El nivel mostrado siempre corresponde exactamente al rango de `level_definition` que contiene `xp_balance.lifetime_xp` — sin cálculo duplicado o divergente en el cliente. |
| 2 | No-autoridad académica | El código de este incremento no lee `StudentResponse`/`CurriculumTopicProgress` directamente — solo `xp_balance`/`xp_ledger_entry`/`account_streak` (verificación estática de frontera de dominio, mismo método del Bloque I). |
| 3 | Racha no punitiva | Perder una racha no altera `xp_balance.lifetime_xp`, no revoca logros, no bloquea contenido (Data Model §16.14) — verificado forzando una pérdida de racha de prueba y confirmando que XP/logros permanecen intactos. |
| 4 | Idempotencia de acreditación de racha | Procesar el mismo día dos veces no acredita el día dos veces (mismo criterio de deduplicación que `GamificationRelayWorker`, ADR-0016). |
| 5 | Zona horaria de racha | Cambios de zona horaria no generan créditos duplicados ni pérdidas injustas (Data Model §16.13) — casos límite: cambio de zona a medianoche, viaje entre zonas. |
| 6 | Reconstructibilidad del historial | El historial de XP mostrado es exactamente `xp_ledger_entry` ordenado — no una proyección paralela que pueda divergir del ledger. |

### Incremento 2 — Public Profile Foundation

Los ocho Decision Gates ya definidos en ADR-0018 §Validación (unicidad de username, campos prohibidos inalcanzables, idempotencia de `ensurePublicProfile` con estado inicial `PRIVATE`/`ACTIVE`, reversibilidad de visibilidad en ambas direcciones, límites de cambio de username y nombres reservados, secuencia correcta `ACTIVE → RETIRED → ANONYMIZED` sin que `PrivacyService` toque `public_profile` directamente, no interferencia entre ocultar visibilidad y datos de GAMIFICATION, y restauración correcta tras reactivación).

### Gate consolidado del Bloque II

Seguirá el mismo patrón que `verify:block-i-gate`: orquestador que invoca el gate consolidado de M1 + Bloque I completo, más los gates propios de ambos incrementos de este bloque, sin duplicar aserciones ya cubiertas.

## 6. ADR

- **Incremento "Public Profile Foundation"**: **ADR-0018**, aprobado (con las precisiones incorporadas: visibilidad privada por defecto, forma canónica de username en minúsculas, nombres reservados, y separación formal de `visibility_status`/`lifecycle_status`).
- **Incremento "Progresión visible"**: **no requiere ADR propio**. No introduce un dominio nuevo, no modifica infraestructura compartida (Outbox, Auth, Privacy), no toma una decisión arquitectónica de Nivel 1 o 2 bajo el protocolo de Master Context §11.9 — es exposición de lectura sobre datos y reglas que el Bloque I (ADR-0016) ya aprobó y construyó. Se documentará como nota funcional en el reporte de cierre del bloque, no como ADR.

## 7–10. Implementación, validación, documentación y cierre

Completos. Detalle de incrementos, incidencias, evidencia de validación y estado final: `docs/adr/BLOCK-II-CLOSURE-REPORT.md`.

## 11. Nota histórica (desviaciones reales encontradas durante la implementación)

Registradas aquí porque el §3/§5 originales (escritos antes de implementar) describían un diseño que la implementación real corrigió — dejar el texto original sin nota generaría una discrepancia silenciosa entre lo definido y lo construido:

1. **Racha e historial: sin `account_streak`/`streak_day`/`streak_definition` persistidos.** El §3 (tabla de alcance) y el §5 (Decision Gates 3–5 del Incremento 1) asumían construir esas tablas sobre Data Model §16.12–16.14. La implementación real las omite por completo: la racha se **deriva en tiempo de lectura** agrupando `xp_ledger_entry.occurredAt` por día calendario (`streak-calculator.ts`), sin ningún estado nuevo persistido. Decisión tomada durante la implementación, no anticipada en esta definición: satisface los mismos Decision Gates (no punitiva, idempotente, reconstructible) de forma más simple — no hay proyección que pueda desincronizarse porque no hay proyección. Congruente con el principio de simplicidad del Kickoff (§3.6) y con el precedente ya sentado por el propio Bloque I (que omitió `currentLevelXp`/`seasonXp` de `xp_balance` por el mismo criterio).
2. **"Zona horaria de racha" (Decision Gate 5) se resolvió como frontera de día calendario UTC, no zona horaria del estudiante.** El texto original de este documento (§5) hablaba de "cambios de zona horaria" e "viaje entre zonas". La implementación real reutiliza deliberadamente la misma convención de día UTC que `XpGrantService` ya usa para `daily_cap` (Bloque I) — tener dos criterios de "día" distintos dentro del mismo dominio GAMIFICATION (uno para el cupo diario, otro para la racha) habría sido inconsistente sin ningún beneficio demostrado. `AccountLevelHistory` tampoco se construyó como tabla — el nivel actual también se deriva en tiempo de lectura desde `xp_balance` + `level_definition`.
3. **La ventana de reserva de username (ADR-0018) se implementó de verdad, no quedó como deuda diferida.** La primera versión de ADR-0018 documentaba la liberación de un username tras 30 días como "deuda diferida... requeriría un job de limpieza". Durante la validación del incremento se comprobó que era barata de implementar sin ese job: consultando `profile_username_history` en el momento de reclamar/cambiar un username. Se implementó y quedó cubierta por el Decision Gate 5 de ADR-0018 con evidencia real, no diferida. ADR-0018 ya quedó actualizado con esta corrección.
4. **`retirePublicProfileForAccountClosureRequest` se invoca al SOLICITAR el cierre, no desde el barrido.** Esto ya estaba especificado correctamente en ADR-0018 §5 desde su redacción original — se reafirma aquí solo porque el §5 de este documento (Decision Gates del Incremento 2) resume ADR-0018 de forma abreviada y podría leerse como si todo el retiro ocurriera en el barrido; no es así: el retiro es inmediato, solo la anonimización espera al barrido.

Ninguna de estas desviaciones cambió el objetivo, el alcance ni los Decision Gates de fondo del bloque — todas fueron decisiones de implementación tomadas para cumplir los mismos gates con menor complejidad o mayor fidelidad al comportamiento prometido, documentadas aquí para que este documento siga siendo una fuente de verdad precisa.

---

**Bloque II — definición formal aprobada e implementación cerrada (2026-08-03).**
