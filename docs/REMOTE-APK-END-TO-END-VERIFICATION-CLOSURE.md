# Cierre — Verificación End-to-End de la APK Remota (ZETRYND / TESTER-DISTRIBUTION)

## Estado

**Backend desplegado y operativo en Railway.** PostgreSQL de Railway operativo. Railway Object Storage (privado) operativo.

## Alcance verificado

- **Cosméticos**: verificados end-to-end en un dispositivo Android físico, flujo completo: catálogo → Starter Kit → URLs firmadas de Object Storage → render en la APK → equipamiento → persistencia tras reiniciar la APK.
- **Tutor IA**: activo en Railway usando Anthropic como proveedor real, confirmado funcionando.
- **APK**: funciona de forma independiente del PC — sin `adb reverse`, sin USB, apuntando al backend público de Railway.

## Corrección incluida en este cierre

Se diagnosticó y corrigió un bug de routing en la entrega multiconsumidor del Outbox (ADR-0017): `GamificationScheduler`/`AnalyticsScheduler` escaneaban la tabla completa de `outbox_event` sin filtrar por `eventKey`, por lo que el consumidor GAMIFICATION intentaba (y fallaba) procesar eventos que nunca le correspondían (p. ej. `account_registered`), generando fallos repetidos en los logs de Railway. Corregido filtrando `findPendingFor` por la lista de `eventKey` aplicable a cada consumidor (`GAMIFICATION_EVENT_KEYS`/`ANALYTICS_EVENT_KEYS`), sin cambios de modelo Prisma ni de migraciones.

- Commit del fix: `955f2a8` — `fix(outbox): filter deliveries by consumer event keys`.
- Verificaciones ejecutadas: `verify:outbox-delivery-filter-gate` (nuevo), `verify:analytics-gate`, y typecheck del backend — todas en PASS.
- Pusheado a `ui-implementation-post-ui6`.

## Hallazgo pendiente, fuera de este cierre

`verify:gamification-integration-gate` falla por una causa preexistente y ajena a este incremento (confirmado mediante `git stash`, mismo fallo con y sin el fix del Outbox): el tema fixture `M1.NUMEROS.PORCENTAJES` en la base de datos de gates tiene 12 preguntas publicadas, mientras el gate asume 2 para considerar el tema completado. Queda como hallazgo abierto para una sesión futura, no bloquea este cierre.
