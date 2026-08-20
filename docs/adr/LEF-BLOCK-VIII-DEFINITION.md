# Bloque VIII — Definición Formal: Consolidación y Cierre de LEF Fase 2

**Fecha**: 2026-08-20
**Fase**: LEF Fase 2 — Learning Experience Foundation
**Bloque**: VIII de VIII (bloque terminal, no funcional)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-VIII-CLOSURE-REPORT.md`, `docs/adr/LEF-PHASE-2-CLOSURE-REPORT.md`, `docs/adr/LEF-BLOCK-I` a `LEF-BLOCK-VII` (Definition + Closure Report de cada bloque, ver tabla completa en `LEF-PHASE-2-CLOSURE-REPORT.md` §2), `docs/PHASE-2-KICKOFF-INVENTORY.md`.

> **Nota de procedencia.** Este documento se formaliza **después** de la ejecución de Bloque VIII, no antes. Bloque VIII nació de un Kickoff Audit Report (auditoría read-only del repositorio) seguido de Decision Gates explícitos del Product Owner (I1, DG-13, DG-14), no de una Definition previa a la implementación — a diferencia de LEF I-VII. Este documento **consolida y registra** decisiones ya tomadas y ya ejecutadas; no presenta ningún requisito como si hubiera existido antes de esa ejecución, y no introduce alcance retrospectivo nuevo.

**Estado**: **APROBADO / CERRADO** — aprobado explícitamente por el Product Owner el 2026-08-20, sobre la base de los doce criterios de cierre evaluados en `docs/adr/LEF-BLOCK-VIII-CLOSURE-REPORT.md` §10 (12/12). Estado previo a esta aprobación (preservado como registro histórico): *"IMPLEMENTACIÓN Y VERIFICACIÓN COMPLETAS — PENDIENTE DE APROBACIÓN FORMAL DE CIERRE."*

## 1. Objetivo

Consolidar y cerrar LEF Fase 2 **sin añadir alcance funcional nuevo**. Bloque VIII no es un bloque de dominio: es exclusivamente terminal — auditoría, triage de deuda, resolución de deuda bloqueante encontrada, regresión, gate permanente, documentación y cierre.

## 2. Alcance contractual de LEF Fase 2

**LEF Fase 2 comprende funcionalmente LEF Bloque I a LEF Bloque VII.** Bloque VIII no pertenece al alcance funcional de la fase que cierra: es su bloque terminal.

**M1/Fase 1** (Bloques I-V del roadmap pre-LEF, Vertical Slice) es **baseline/prerrequisito heredado**. Se ejecuta transitivamente porque la cadena de gates lo alcanza (cada gate consolidado LEF encadena al anterior hasta M1), pero **no pertenece al alcance contractual funcional de LEF Fase 2** y **no fue reabierto** por ningún incremento de Bloque VIII.

## 3. Regla de no reapertura

Bloque VIII no reabre M1 ni ningún bloque de LEF I-VII. Ninguna decisión, contrato, invariante o gate ya aprobado de esos bloques fue modificado por este bloque — se preservan íntegros. La única excepción es la corrección puntual de I4 (ver §7), acotada exclusivamente al manejo de errores del retry de conflictos de serialización, sin tocar ningún contrato de dominio.

## 4. Incremento I1 — Resolución contractual de alcance y nomenclatura

**Decisión del Product Owner (2026-08-20)**: LEF Fase 2 = LEF Bloques I-VII, Bloque VIII terminal, M1 fuera de alcance funcional. Se registra explícitamente la distinción entre:

- **"Fase 2"** — expresión histórica del namespace de Producto/Roadmap (PRD/Master Context), que en la ejecución real del proyecto terminó correspondiendo a lo que hoy se llama M1/Fase 1.
- **"LEF Fase 2"** — namespace de ejecución de este proyecto, la fase post-M1 compuesta por LEF Bloques I-VII, que es la que este bloque cierra.

Los documentos nuevos de Bloque VIII usan **"LEF Fase 2"** explícitamente cuando existe posibilidad de ambigüedad. No se reescriben PRD/Master Context ni ningún documento histórico únicamente para corregir esta terminología.

## 5. Incremento I2 — Triage transversal de deuda

Cobertura: **314/314** hits documentales (`diferido|DIFERIDA|pendiente|Open Question|OQ-0` y equivalentes) más los **2** `TODO(hallazgo-latente)` en código real. Clasificación final, tras resolver DG-13 y DG-14:

| Categoría | Cantidad final |
|---|---|
| **A — Bloqueante** | **0** |
| **B — No bloqueante, diferida con fuente documental** | 12 ítems distintos (catálogo completo en `LEF-BLOCK-VIII-CLOSURE-REPORT.md` §12) |
| **C — Alcance futuro / Fase 3+** | 6 clusters (incluye DG-13) |
| **D — Histórico/resuelto/no vigente** | ~280 hits agrupables en ~25 ítems distintos |
| **E — Requiere Decision Gate** | **0** (ambos ítems E del triage original, DG-13 y DG-14, fueron resueltos) |

No se alteraron retrospectivamente las fuentes originales de ningún closure report de LEF I-VII ni de M1 — el triage es un catálogo de lectura, no una reescritura.

## 6. DG-13 — Resuelto como C

**Los cinco elementos de infraestructura heredados de M1** (integración real de Firebase, advisory lock multi-réplica, subida de imagen de perfil, almacenamiento seguro de credenciales, aprovisionamiento de bucket R2) **y el theming asociado** (Competir/IA/Perfil/auth) **no forman parte retrospectivamente del contrato de LEF Fase 2**. La expresión histórica "diferido a Fase 2" de M1 pertenece a la colisión de nomenclatura resuelta en I1 y no se usa para ampliar el alcance al final del ciclo. Clasificados C — alcance futuro/Fase 3+. Nada de esto se implementó en Bloque VIII.

## 7. DG-14 — Resuelto originalmente como A de consolidación, satisfecho por I4

Los dos `TODO(hallazgo-latente)` (`league-point-grant.service.ts`, `xp-grant.service.ts`) fueron clasificados bloqueantes de cierre de consolidación por decisión explícita del Product Owner, y **satisfechos mediante el Incremento I4** (ver §8). La decisión no afirmó corrupción de datos ni reabrió los contratos de LEF I/III/IV.

## 8. Incremento I4 — Corrección de conflictos de serialización COMMIT-time

Alcance exclusivo: manejo de errores del retry SERIALIZABLE de `XpGrantService.runSerializable` y `LeaguePointGrantService.runSerializable`. Se amplió el predicado de reconocimiento de conflictos (`isSerializationConflict`, portado del patrón ya probado en `ai-conversation.service.ts`, commit `29088e7`, LEF Bloque VI Fase B) para reconocer, además de `P2034`, el conflicto detectado por Postgres en el `COMMIT` (`DriverAdapterError`/`TransactionWriteConflict`, SQLSTATE `40001`).

Registro:
- Ambos `TODO(hallazgo-latente)` eliminados.
- Predicado ampliado en ambos servicios, exportado para pruebas.
- Contratos intactos: sin cambios de API, esquema, `MAX_SERIALIZABLE_RETRIES`, `RETRY_BACKOFF_MS`, atomicidad, idempotencia ni topes diarios.
- Gate focalizado nuevo (`verify-gamification-serialization-conflict-gate.ts`): **30/30**, predicado puro + bucle de reintento real con fakes (conflicto transitorio resuelto, `P2034` sin regresión, reintentos agotados sin estado parcial, error no relacionado nunca reintentado).
- Gates reales de dominio: `verify:gamification-xp-grant-gate`, `verify:league-season-foundation-gate` (disparó un `P2034` real en vivo), `verify:gamification-progression-gate`, `verify:reward-delivery-xp-bonus-gate` — todos **PASS**.
- Regresión completa LEF I-VII (`verify-lef-block-vii-gate.mjs`) — **PASS**, sin reapertura.
- Commit: `d79f325`.

## 9. Incremento I3 — Gate definitivo

Topología construida y verificada:

```
verify-lef-phase-2-gate.mjs (FIJO, nunca se repunta)
  -> verify-lef-block-viii-gate.mjs
       -> verify-lef-block-vii-gate.mjs   (regresión completa LEF I-VII, encadena M1)
       -> verify-gamification-serialization-conflict-gate.ts   (I4, DG-14)

verify-learning-experience-foundation-gate.mjs (RODANTE, semántica histórica preservada)
  -> verify-lef-block-viii-gate.mjs
```

Verificado estructuralmente (gate fijo → VIII directo; alias rodante → VIII; VIII → VII + I4; gate fijo NO depende del alias rodante) y con una corrida real completa: exit 0, PASS de extremo a extremo. Commit: `7b0503b`.

## 10. Criterios de cierre

Se preservan íntegros los doce criterios aprobados por el Product Owner en I1 (LEF Bloque VIII, resolución I1, 2026-08-20). Su evaluación uno por uno, con evidencia, vive en `LEF-PHASE-2-CLOSURE-REPORT.md` §6 — no se duplica aquí.
