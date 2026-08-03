# Block I Closure Report — Fundación de Gamificación

**Fecha de cierre**: 2026-08-03
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: I de VIII (Roadmap Learning Experience Foundation, aprobado tras el Kickoff)
**Documentos relacionados**: `docs/adr/0016-gamificacion-fundacion.md`, `docs/adr/0017-entrega-multiconsumidor-outbox.md` (enmienda de infraestructura compartida, resuelta como prerrequisito de este bloque)
**Estado final**: **APPROVED**

## 1. Objetivo del bloque

Definido en la definición formal del Bloque I: establecer el dominio GAMIFICATION como registro autoritativo, inmutable y auditable de actividad académica validada y XP derivado de ella, consumiendo PROGRESS/EDUCATION sin modificarlos, sin exponer ningún mecanismo de motivación visible al estudiante. Explícitamente fuera de alcance: UI, niveles, rachas visibles, ligas, rankings, títulos, insignias, desafíos, moneda virtual, cosméticos — todos pertenecientes a bloques posteriores del roadmap.

## 2. Trabajo realizado

Tres incrementos, cada uno commiteado por separado tras su propio gate en PASS:

| Commit | Incremento | Gate propio |
|---|---|---|
| `5f9a1878` | Fundación de persistencia: esquema Prisma, restricciones de integridad (unicidad, `CHECK` de reversibilidad, trigger de inmutabilidad), seis repositorios mínimos | `verify:gamification-schema-gate` |
| `54bac14a` | Integración asíncrona PROGRESS → GAMIFICATION: publicación condicionada de `student_response_recorded.v1`/`curriculum_topic_completed.v1`, `GamificationRelayWorker`, deduplicación de negocio basada en el hecho académico | `verify:gamification-integration-gate` |
| `19d7261b` | Otorgamiento transaccional de XP: reglas versionadas, aislamiento `SERIALIZABLE` para `daily_cap` bajo concurrencia real, reversos compensatorios en dos capas (servicio + PostgreSQL), `reconcile()` | `verify:gamification-xp-grant-gate` |

**Prerrequisito resuelto durante el bloque, no anticipado en su definición formal**: durante el reconocimiento previo al primer incremento se descubrió que el Outbox de plataforma (ADR-0006) no admitía múltiples consumidores concurrentes tal como su prosa afirmaba — un defecto estructural real, no hipotético (demostrado: el segundo consumidor pierde eventos de forma determinística, no ocasional). Se detuvo la implementación del Bloque I, se abrió ADR-0017 (tabla `outbox_event_delivery`, evaluando y descartando tres alternativas), se migró primero ANALYTICS sin regresiones, y solo entonces se reanudó GAMIFICATION. Ambos ADR quedan referenciados como parte constitutiva de este cierre.

## 3. Los ocho Decision Gates del Bloque I

| # | Gate | Clasificación final | Evidencia (script, comprobaciones) |
|---|---|---|---|
| 1 | Integridad de origen | PASS con evidencia existente | `verify-gamification-integration-gate.ts` §3 — 4 comprobaciones (sourceEntityType/sourceEntityId coinciden con la fila real de PROGRESS) |
| 2 | No-autoridad académica | PASS (brecha cerrada) | `verify-gamification-schema-gate.ts` §8 — verificación estática de frontera de dominio: 13 archivos de `src/gamification/` revisados, ninguno referencia `StudentResponse`/`CurriculumTopicProgress` |
| 3 | Inmutabilidad del ledger | PASS (brecha cerrada) | `verify-gamification-schema-gate.ts` §5/§5b — 3 comprobaciones (`UPDATE` rechazado, `DELETE` rechazado por trigger dedicado nuevo, fila persiste) |
| 4 | Reconstructibilidad del saldo | PASS con evidencia existente | `verify-gamification-schema-gate.ts` §6 (1) + `verify-gamification-xp-grant-gate.ts` §6/§7 (7) — consistencia exacta y `reconcile()` corrigiendo una desalineación forzada |
| 5 | Autoridad exclusiva de servidor | PASS (brecha cerrada) | `verify-gamification-integration-gate.ts` (1) + `verify-gamification-xp-grant-gate.ts` (3) — los 4 endpoints internos rechazan con 401 sin `INTERNAL_OPS_KEY`; `reverseEntry` sin parámetros `accountId`/`xpAmount` (eliminado por construcción) |
| 6 | Aislamiento de fallo | PASS con evidencia existente | `verify-gamification-integration-gate.ts` §6 (2) + `verify-gamification-xp-grant-gate.ts` §8 (2) — PROGRESS funciona con éxito sin que GAMIFICATION procese nada |
| 7 | Idempotencia/deduplicación | PASS con evidencia existente | Deduplicación de actividad (`verify-gamification-integration-gate.ts` §4, 3 comprobaciones) + idempotencia de otorgamiento bajo concurrencia real (`verify-gamification-xp-grant-gate.ts` §2b/§3) |
| 8 | Antifraude mínimo | No aplica (parcial, documentado) | Las categorías no elegibles del Data Model §16.6 (apertura/cierre repetido, mensajes vacíos a IA, eventos administrativos) no tienen productor todavía (Recurso/Ensayo/Desafío no existen) — no se fabricó un productor ficticio solo para probarlas. Lo exigible hoy (`eventKey` desconocido y payload inválido rechazados, deduplicación de negocio) sí está cubierto |

Ninguno de los ocho quedó en `requiere corrección` tras cerrar las tres brechas identificadas (Gates 2, 3, 5) con pruebas nuevas mínimas, sin duplicar aserciones ya existentes.

## 4. Gate consolidado del Bloque I

`scripts/verify-block-i-gate.mjs` (nuevo) — orquestador, no reemplazo, mismo criterio que `verify-block-v-gate.mjs`: invoca el gate consolidado de M1 completo (typecheck, lint, build, migrate, seed, AUTH, PRIVACY, ANALYTICS, OBSERVABILITY, USER, OBJECT-STORAGE, EDUCATION, PROGRESS, OFFLINE-OUTBOX) como un solo paso, y agrega los tres gates propios de GAMIFICATION con instancias de backend propias por gate (mismo motivo que M1: el rate limiting de `/auth/session` es por proceso).

```
Gate consolidado M1 (typecheck/lint/build + dominios de Fase 1)  PASS
GAMIFICATION schema gate                                         PASS
GAMIFICATION integración PROGRESS->GAMIFICATION                  PASS
GAMIFICATION otorgamiento de XP                                  PASS

Gate consolidado Bloque I: PASS
```

Sin regresiones sobre ningún dominio de M1 ni sobre ANALYTICS/ADR-0017.

## 5. Incidencias reales encontradas durante la validación (causa raíz y resolución)

Documentadas con transparencia, ninguna oculta:

1. **Esquema del Outbox no soportaba multi-consumidor** (previa al primer incremento) — ver ADR-0017 completo.
2. **Backlog histórico interpretado como pendiente tras la migración de ADR-0017** — falso positivo ambiental (15 fallos), no un defecto; resuelto con reset de la base de desarrollo, documentado en ADR-0017.
3. **`CHECK xp_ledger_entry_otorgamiento_requires_rule` rechazó datos de prueba históricos** al aplicar `xp_grant_integrity` — comportamiento correcto de una restricción nueva contra datos que nunca la cumplieron, no un defecto de la migración.
4. **`createIdempotent` fallaba con `25P02` dentro de una transacción explícita** tras un `P2002` — bug real de aplicación (no de infraestructura): Postgres aborta toda la transacción tras el primer error, y la re-consulta de idempotencia intentaba seguir usando el mismo cliente ya abortado. Corregido: el conflicto se relanza tal cual dentro de la transacción; `XpGrantService` lo resuelve *fuera* de ella, con una consulta limpia. Verificado con el propio gate de otorgamiento tras la corrección (43/43 PASS).
5. **Rate limiting (`ThrottlerException`) al encadenar demasiados gates contra un mismo proceso de backend** — ambiental, no un defecto; resuelto reutilizando el patrón ya establecido de una instancia de backend por gate (Architecture Review 1.0).

## 6. Artefactos temporales

Búsqueda de `TODO`/`FIXME`/`XXX`/`console.log`/`debugger` sobre la totalidad del diff del Bloque I (`git diff --name-only defd8df..HEAD`, 34 archivos): **cero resultados**. Sin instrumentación de depuración pendiente de retirar.

## 7. Estado final

**APPROVED.** Bloque I — Fundación de Gamificación queda implementado, validado y cerrado. El dominio GAMIFICATION existe como registro autoritativo de actividad validada y XP, consumiendo PROGRESS de forma completamente desacoplada (multi-consumidor real, verificado junto a ANALYTICS), con reglas versionadas, otorgamiento transaccional seguro bajo concurrencia, reversos compensatorios en dos capas de protección, y una proyección de saldo reconstruible con mecanismo formal de recuperación. Ningún componente de bloques posteriores (Competir, Gamificación Avanzada, Perfil, UI) fue anticipado.

Siguiente paso del roadmap: **Bloque II**, a definir formalmente cuando el Product Owner lo autorice.

---

**Bloque I — Fundación de Gamificación: implementado, validado y cerrado (2026-08-03).**
